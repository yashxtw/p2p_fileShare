import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { WebRtcState, ErrorCode } from '@p2p-share/shared-types';
import { RedisService } from '../../redis/redis.service';
import { SessionRepository } from '../../database/repositories/session.repository';
import { AuditRepository } from '../../database/repositories/audit.repository';
import { LoggerService } from '../../common/logger/logger.service';

const VALID_WEBRTC_TRANSITIONS: Record<WebRtcState, WebRtcState[]> = {
  [WebRtcState.WAITING]: [WebRtcState.JOINED, WebRtcState.FAILED],
  [WebRtcState.JOINED]: [WebRtcState.PAIRING, WebRtcState.FAILED],
  [WebRtcState.PAIRING]: [WebRtcState.NEGOTIATING, WebRtcState.FAILED],
  [WebRtcState.NEGOTIATING]: [WebRtcState.CONNECTED, WebRtcState.FAILED],
  [WebRtcState.CONNECTED]: [WebRtcState.DISCONNECTED, WebRtcState.FAILED],
  [WebRtcState.DISCONNECTED]: [WebRtcState.NEGOTIATING, WebRtcState.FAILED],
  [WebRtcState.FAILED]: [WebRtcState.NEGOTIATING],
};

@Injectable()
export class SignalingService {
  private readonly STATE_PREFIX = 'connection:state:';

  constructor(
    private readonly redis: RedisService,
    private readonly sessionRepo: SessionRepository,
    private readonly auditRepo: AuditRepository,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Validate session existence, status, and expiry.
   */
  async validateSession(sessionId: string): Promise<void> {
    const session = await this.sessionRepo.findById(sessionId);
    if (!session) {
      throw new NotFoundException({
        success: false,
        error: {
          message: 'Session not found',
          code: ErrorCode.SESSION_NOT_FOUND,
        },
      });
    }

    if (new Date(session.expiresAt) < new Date()) {
      throw new BadRequestException({
        success: false,
        error: {
          message: 'Session has expired',
          code: ErrorCode.SESSION_EXPIRED,
        },
      });
    }
  }

  /**
   * Set and validate the WebRTC connection state in Redis.
   */
  async transitionState(sessionId: string, toState: WebRtcState): Promise<WebRtcState> {
    const key = `${this.STATE_PREFIX}${sessionId}`;
    const rawCurrent = await this.redis.get(key);
    const current = (rawCurrent as WebRtcState) || WebRtcState.WAITING;

    if (current === toState) {
      return current;
    }

    const allowed = VALID_WEBRTC_TRANSITIONS[current] || [];
    if (!allowed.includes(toState)) {
      this.logger.warn(
        `Invalid WebRTC state transition from ${current} to ${toState} for session ${sessionId}`,
        'SignalingService',
      );
      throw new BadRequestException({
        success: false,
        error: {
          message: `Invalid WebRTC state transition: cannot change from ${current} to ${toState}`,
          code: ErrorCode.STATE_TRANSITION_INVALID,
        },
      });
    }

    await this.redis.setWithTTL(key, toState, 3600);
    
    // Log transition in audit log asynchronously
    this.auditRepo.create({
      sessionId,
      eventType: 'STATUS_CHANGED' as any,
      metadata: {
        webrtcStateFrom: current,
        webrtcStateTo: toState,
      },
    }).catch((err) => {
      this.logger.error(`Failed to audit WebRTC status transition`, 'SignalingService', err);
    });

    this.logger.info(`WebRTC connection state updated to ${toState} for session ${sessionId}`, 'SignalingService');
    return toState;
  }

  /**
   * Get the current WebRTC state of a session.
   */
  async getConnectionState(sessionId: string): Promise<WebRtcState> {
    const key = `${this.STATE_PREFIX}${sessionId}`;
    const state = await this.redis.get(key);
    return (state as WebRtcState) || WebRtcState.WAITING;
  }

  /**
   * Clear the connection state for a session.
   */
  async clearConnectionState(sessionId: string): Promise<void> {
    const key = `${this.STATE_PREFIX}${sessionId}`;
    await this.redis.del(key);
  }
}
