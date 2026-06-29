import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import {
  SessionStatus,
  AuditEventType,
  type Session,
  type TransferFile,
  type SessionWithDetails,
} from '@p2p-share/shared-types';
import { SESSION } from '@p2p-share/shared-config';
import { SessionRepository } from '../database/repositories/session.repository';
import { DeviceRepository } from '../database/repositories/device.repository';
import { TransferFileRepository } from '../database/repositories/transfer-file.repository';
import { AuditRepository } from '../database/repositories/audit.repository';
import { CacheService } from '../cache/cache.service';
import { LoggerService } from '../common/logger/logger.service';
import { isValidTransition, isTerminalState } from './session-state-machine';
import type { CreateSessionDto } from './dto/create-session.dto';
import type { JoinSessionDto } from './dto/join-session.dto';

@Injectable()
export class SessionService {
  constructor(
    private readonly sessionRepo: SessionRepository,
    private readonly deviceRepo: DeviceRepository,
    private readonly transferFileRepo: TransferFileRepository,
    private readonly auditRepo: AuditRepository,
    private readonly cache: CacheService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Create a new transfer session.
   *
   * 1. Upsert sender device by fingerprint
   * 2. Generate collision-resistant 6-digit code
   * 3. Persist session to Neon
   * 4. Cache code → sessionId in Redis
   * 5. Optionally persist file metadata
   * 6. Write audit log
   */
  async createSession(dto: CreateSessionDto, ipAddress?: string) {
    // 1. Upsert sender device
    const senderDevice = await this.deviceRepo.upsertByFingerprint({
      deviceName: dto.device.deviceName,
      browser: dto.device.browser,
      platform: dto.device.platform,
      os: dto.device.os,
      ipAddress,
      fingerprint: dto.device.fingerprint,
    });

    // 2. Generate unique session code
    const sessionCode = await this.generateUniqueCode();

    // 3. Calculate expiry
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + SESSION.EXPIRY_MINUTES);

    // 4. Create session in DB
    const session = await this.sessionRepo.create({
      sessionCode,
      senderDeviceId: senderDevice.id,
      expiresAt,
    });

    // 5. Cache code → sessionId in Redis (TTL = expiry duration in seconds)
    const ttlSeconds = SESSION.EXPIRY_MINUTES * 60;
    await this.cache.setSessionCode(sessionCode, session.id, ttlSeconds);
    await this.cache.setDeviceSession(senderDevice.id, session.id, ttlSeconds);

    // 6. Persist file metadata if provided
    let files: TransferFile[] = [];
    if (dto.files && dto.files.length > 0) {
      files = await this.transferFileRepo.createMany(
        dto.files.map((f) => ({
          sessionId: session.id,
          fileName: f.name,
          fileSize: f.size,
          mimeType: f.type,
        })),
      );
    }

    // 7. Audit log
    await this.auditRepo.create({
      sessionId: session.id,
      eventType: AuditEventType.SESSION_CREATED,
      metadata: {
        deviceId: senderDevice.id,
        fileCount: files.length,
      },
    });

    this.logger.info('Session created', 'SessionService', {
      sessionId: session.id,
      code: sessionCode,
    });

    return {
      session,
      senderDevice,
      files,
      qrPayload: {
        sessionCode: session.sessionCode,
        expiresAt: session.expiresAt,
      },
    };
  }

  /**
   * Join a session by its 6-digit code.
   *
   * 1. Look up code in Redis (fast path) → fallback to DB
   * 2. Validate session is in WAITING state
   * 3. Upsert receiver device
   * 4. Join session (set receiver + transition to JOINED)
   * 5. Extend expiry to ACTIVE_EXPIRY_MINUTES
   * 6. Invalidate code from Redis (consumed)
   * 7. Write audit log
   */
  async joinSession(dto: JoinSessionDto, ipAddress?: string) {
    // 1. Look up session by code
    const session = await this.findSessionByCode(dto.code);

    if (!session) {
      throw new NotFoundException({
        success: false,
        error: {
          message: 'Session not found or has expired',
          code: 'SESSION_NOT_FOUND',
        },
      });
    }

    // 2. Validate state
    if (session.status !== SessionStatus.WAITING) {
      throw new ConflictException({
        success: false,
        error: {
          message: `Session is in ${session.status} state and cannot be joined`,
          code: 'INVALID_STATE_TRANSITION',
        },
      });
    }

    // 3. Check expiry
    if (new Date(session.expiresAt) < new Date()) {
      // Expire it in DB too
      await this.sessionRepo.updateStatus(session.id, SessionStatus.EXPIRED);
      await this.cache.invalidateSessionCode(dto.code);
      throw new BadRequestException({
        success: false,
        error: {
          message: 'Session has expired',
          code: 'SESSION_EXPIRED',
        },
      });
    }

    // 4. Upsert receiver device
    const receiverDevice = await this.deviceRepo.upsertByFingerprint({
      deviceName: dto.device.deviceName,
      browser: dto.device.browser,
      platform: dto.device.platform,
      os: dto.device.os,
      ipAddress,
      fingerprint: dto.device.fingerprint,
    });

    // 5. Prevent self-join
    if (receiverDevice.id === session.senderDeviceId) {
      throw new ConflictException({
        success: false,
        error: {
          message: 'Cannot join your own session',
          code: 'SESSION_FULL',
        },
      });
    }

    // 6. Join session in DB
    const updatedSession = await this.sessionRepo.joinSession(
      session.id,
      receiverDevice.id,
    );

    if (!updatedSession) {
      throw new ConflictException({
        success: false,
        error: {
          message: 'Session has already been joined by another device',
          code: 'SESSION_FULL',
        },
      });
    }

    // 7. Extend expiry
    const newExpiresAt = new Date();
    newExpiresAt.setMinutes(
      newExpiresAt.getMinutes() + SESSION.ACTIVE_EXPIRY_MINUTES,
    );
    await this.sessionRepo.extendExpiry(session.id, newExpiresAt);

    // 8. Invalidate code in Redis (one-time use)
    await this.cache.invalidateSessionCode(dto.code);
    await this.cache.setDeviceSession(
      receiverDevice.id,
      session.id,
      SESSION.ACTIVE_EXPIRY_MINUTES * 60,
    );

    // 9. Get sender device info
    const senderDevice = await this.deviceRepo.findById(session.senderDeviceId);

    // 10. Audit
    await this.auditRepo.create({
      sessionId: session.id,
      eventType: AuditEventType.SESSION_JOINED,
      metadata: {
        receiverDeviceId: receiverDevice.id,
      },
    });

    this.logger.info('Session joined', 'SessionService', {
      sessionId: session.id,
    });

    return {
      session: { ...updatedSession, expiresAt: newExpiresAt.toISOString() },
      senderDevice,
      receiverDevice,
    };
  }

  /**
   * Update session status with state machine validation.
   */
  async updateStatus(sessionId: string, newStatus: SessionStatus): Promise<Session> {
    const session = await this.sessionRepo.findById(sessionId);
    if (!session) {
      throw new NotFoundException({
        success: false,
        error: { message: 'Session not found', code: 'SESSION_NOT_FOUND' },
      });
    }

    const currentStatus = session.status as SessionStatus;

    if (!isValidTransition(currentStatus, newStatus)) {
      throw new BadRequestException({
        success: false,
        error: {
          message: `Cannot transition from ${currentStatus} to ${newStatus}`,
          code: 'INVALID_STATE_TRANSITION',
        },
      });
    }

    const updated = await this.sessionRepo.updateStatus(sessionId, newStatus);
    if (!updated) {
      throw new NotFoundException({
        success: false,
        error: { message: 'Session not found', code: 'SESSION_NOT_FOUND' },
      });
    }

    // Clean up Redis on terminal states
    if (isTerminalState(newStatus)) {
      await this.cache.invalidateSession(sessionId);
      await this.cache.invalidateSessionCode(session.sessionCode);
      if (session.senderDeviceId) {
        await this.cache.clearDeviceSession(session.senderDeviceId);
      }
      if (session.receiverDeviceId) {
        await this.cache.clearDeviceSession(session.receiverDeviceId);
      }
    }

    await this.auditRepo.create({
      sessionId,
      eventType: AuditEventType.STATUS_CHANGED,
      metadata: { from: currentStatus, to: newStatus },
    });

    this.logger.info('Session status updated', 'SessionService', {
      sessionId,
      from: currentStatus,
      to: newStatus,
    });

    return updated;
  }

  /**
   * Get a session by ID with related data.
   */
  async getSessionById(id: string): Promise<SessionWithDetails> {
    const session = await this.sessionRepo.findById(id);
    if (!session) {
      throw new NotFoundException({
        success: false,
        error: { message: 'Session not found', code: 'SESSION_NOT_FOUND' },
      });
    }
    return this.enrichSession(session);
  }

  /**
   * Get a session by its 6-digit code with related data.
   */
  async getSessionByCode(code: string): Promise<SessionWithDetails> {
    const session = await this.findSessionByCode(code);
    if (!session) {
      throw new NotFoundException({
        success: false,
        error: { message: 'Session not found', code: 'SESSION_NOT_FOUND' },
      });
    }
    return this.enrichSession(session);
  }

  /**
   * Manually expire a session.
   */
  async expireSession(sessionId: string): Promise<Session> {
    return this.updateStatus(sessionId, SessionStatus.EXPIRED);
  }

  /**
   * Expire all stale WAITING sessions (called by cron).
   * Returns the number of sessions expired.
   */
  async expireStale(): Promise<number> {
    const count = await this.sessionRepo.expireStaleSessions();
    if (count > 0) {
      this.logger.info(`Expired ${count} stale session(s)`, 'SessionService');
    }
    return count;
  }

  // ─── Private Helpers ──────────────────────────────────────

  /**
   * Look up a session by code: Redis first (O(1)), then DB fallback.
   */
  private async findSessionByCode(code: string): Promise<Session | null> {
    // Fast path: Redis
    const cachedId = await this.cache.getSessionByCode(code);
    if (cachedId) {
      const session = await this.sessionRepo.findById(cachedId);
      if (session) return session;
    }
    // Slow path: DB (uses partial index)
    return this.sessionRepo.findByCode(code);
  }

  /**
   * Enrich a session with device and file data.
   */
  private async enrichSession(session: Session): Promise<SessionWithDetails> {
    const [senderDevice, receiverDevice, files] = await Promise.all([
      this.deviceRepo.findById(session.senderDeviceId),
      session.receiverDeviceId
        ? this.deviceRepo.findById(session.receiverDeviceId)
        : Promise.resolve(null),
      this.transferFileRepo.findBySessionId(session.id),
    ]);

    return {
      ...session,
      senderDevice: senderDevice ?? undefined,
      receiverDevice: receiverDevice ?? undefined,
      files,
    };
  }

  /**
   * Generate a unique 6-digit numeric code.
   * Checks Redis first (fast), then DB fallback, retries up to 10 times.
   */
  private async generateUniqueCode(): Promise<string> {
    const maxAttempts = 10;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const code = this.generateCode();

      // Fast check against Redis
      const cached = await this.cache.isCodeCached(code);
      if (cached) continue;

      // DB check (handles edge case where Redis TTL expired but session is still active)
      const inUse = await this.sessionRepo.isCodeInUse(code);
      if (!inUse) return code;
    }

    // Extremely unlikely with 1M combinations, but handle gracefully
    throw new ConflictException({
      success: false,
      error: {
        message: 'Unable to generate unique session code. Please try again.',
        code: 'DUPLICATE_ENTRY',
      },
    });
  }

  /**
   * Generate a random 6-digit numeric code.
   */
  private generateCode(): string {
    const { CODE_LENGTH, CODE_CHARS } = SESSION;
    let code = '';
    for (let i = 0; i < CODE_LENGTH; i++) {
      const randomIndex = Math.floor(Math.random() * CODE_CHARS.length);
      code += CODE_CHARS[randomIndex];
    }
    return code;
  }
}
