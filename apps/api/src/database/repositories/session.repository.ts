import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database.service';
import { LoggerService } from '../../common/logger/logger.service';
import type { Session, SessionStatus } from '@p2p-share/shared-types';
/**
 * Row shape returned from the sessions table.
 */
interface SessionRow {
  [key: string]: unknown;
  id: string;
  session_code: string;
  status: string;
  sender_device_id: string;
  receiver_device_id: string | null;
  expires_at: string;
  created_at: string;
  updated_at: string;
}
/** Maps a DB row to the application-level Session interface */
function toSession(row: SessionRow): Session {
  return {
    id: row.id,
    sessionCode: row.session_code,
    status: row.status as SessionStatus,
    senderDeviceId: row.sender_device_id,
    receiverDeviceId: row.receiver_device_id,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
@Injectable()
export class SessionRepository {
  constructor(
    private readonly db: DatabaseService,
    private readonly logger: LoggerService,
  ) {}
  /** Create a new session */
  async create(data: {
    sessionCode: string;
    senderDeviceId: string;
    expiresAt: Date;
  }): Promise<Session> {
    const result = await this.db.query<SessionRow>(
      `INSERT INTO sessions (session_code, sender_device_id, expires_at)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [data.sessionCode, data.senderDeviceId, data.expiresAt.toISOString()],
    );
    this.logger.debug('Session created', 'SessionRepository', {
      id: result.rows[0].id,
      code: data.sessionCode,
    });
    return toSession(result.rows[0]);
  }
  /** Find a session by its UUID */
  async findById(id: string): Promise<Session | null> {
    const result = await this.db.query<SessionRow>(
      `SELECT * FROM sessions WHERE id = $1`,
      [id],
    );
    return result.rows[0] ? toSession(result.rows[0]) : null;
  }
  /**
   * Find an active session by its 6-digit code.
   * Only returns sessions that haven't completed, failed, expired, or been cancelled.
   */
  async findByCode(code: string): Promise<Session | null> {
    const result = await this.db.query<SessionRow>(
      `SELECT * FROM sessions
       WHERE session_code = $1
         AND status NOT IN ('COMPLETED', 'FAILED', 'EXPIRED', 'CANCELLED')
       LIMIT 1`,
      [code],
    );
    return result.rows[0] ? toSession(result.rows[0]) : null;
  }
  /** Find all active sessions for a given device (as sender or receiver) */
  async findActiveByDevice(deviceId: string): Promise<Session[]> {
    const result = await this.db.query<SessionRow>(
      `SELECT * FROM sessions
       WHERE (sender_device_id = $1 OR receiver_device_id = $1)
         AND status NOT IN ('COMPLETED', 'FAILED', 'EXPIRED', 'CANCELLED')
       ORDER BY created_at DESC`,
      [deviceId],
    );
    return result.rows.map(toSession);
  }
  /** Update the session status */
  async updateStatus(id: string, status: SessionStatus): Promise<Session | null> {
    const result = await this.db.query<SessionRow>(
      `UPDATE sessions
       SET status = $2, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, status],
    );
    return result.rows[0] ? toSession(result.rows[0]) : null;
  }
  /** Join a session: set receiver device and transition to JOINED */
  async joinSession(id: string, receiverDeviceId: string): Promise<Session | null> {
    const result = await this.db.query<SessionRow>(
      `UPDATE sessions
       SET receiver_device_id = $2,
           status = 'JOINED',
           updated_at = NOW()
       WHERE id = $1 AND status = 'WAITING'
       RETURNING *`,
      [id, receiverDeviceId],
    );
    return result.rows[0] ? toSession(result.rows[0]) : null;
  }
  /**
   * Extend the expiry for a session (e.g., when a receiver joins).
   */
  async extendExpiry(id: string, newExpiresAt: Date): Promise<void> {
    await this.db.query(
      `UPDATE sessions SET expires_at = $2, updated_at = NOW() WHERE id = $1`,
      [id, newExpiresAt.toISOString()],
    );
  }
  /**
   * Bulk-expire stale sessions.
   * Marks WAITING sessions past their expiry as EXPIRED.
   * Returns the number of sessions expired.
   */
  async expireStaleSessions(): Promise<number> {
    const result = await this.db.query(
      `UPDATE sessions
       SET status = 'EXPIRED', updated_at = NOW()
       WHERE status = 'WAITING'
         AND expires_at < NOW()`,
    );
    return result.rowCount ?? 0;
  }
  /**
   * Check if a session code is already in use among active sessions.
   */
  async isCodeInUse(code: string): Promise<boolean> {
    const result = await this.db.query<{ exists: boolean }>(
      `SELECT EXISTS(
         SELECT 1 FROM sessions
         WHERE session_code = $1
           AND status NOT IN ('COMPLETED', 'FAILED', 'EXPIRED', 'CANCELLED')
       ) AS exists`,
      [code],
    );
    return result.rows[0]?.exists ?? false;
  }
}