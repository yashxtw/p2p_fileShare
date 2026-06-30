import { Injectable } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';
import { LoggerService } from '../../common/logger/logger.service';

export interface PeerPair {
  senderSocketId?: string | null;
  receiverSocketId?: string | null;
  senderDeviceId?: string | null;
  receiverDeviceId?: string | null;
}

/**
 * Service to manage peer relationships and pairing mappings within active sessions.
 */
@Injectable()
export class PeerService {
  private readonly SESSION_SOCKETS_PREFIX = 'session:sockets:';

  constructor(
    private readonly redis: RedisService,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Store or update peer pair connection details for a session.
   */
  async savePeerPair(sessionId: string, pair: PeerPair): Promise<void> {
    const key = `${this.SESSION_SOCKETS_PREFIX}${sessionId}`;
    const existing = await this.getPeerPair(sessionId);
    
    const updated = JSON.stringify({
      ...existing,
      ...pair,
    });

    // 1 hour expiration for active signaling window
    await this.redis.setWithTTL(key, updated, 3600);
    this.logger.debug(`Saved peer mapping for session ${sessionId}`, 'PeerService');
  }

  /**
   * Get peer pair socket and device mappings.
   */
  async getPeerPair(sessionId: string): Promise<PeerPair> {
    const key = `${this.SESSION_SOCKETS_PREFIX}${sessionId}`;
    const data = await this.redis.get(key);
    if (!data) return {};

    try {
      return JSON.parse(data) as PeerPair;
    } catch {
      return {};
    }
  }

  /**
   * Verify if two device IDs are paired in a session.
   */
  async isValidPairing(sessionId: string, deviceId1: string, deviceId2: string): Promise<boolean> {
    const pair = await this.getPeerPair(sessionId);
    const devices = [pair.senderDeviceId, pair.receiverDeviceId];
    return devices.includes(deviceId1) && devices.includes(deviceId2);
  }

  /**
   * Clear peer pairing mapping for a session.
   */
  async removePeerPair(sessionId: string): Promise<void> {
    const key = `${this.SESSION_SOCKETS_PREFIX}${sessionId}`;
    await this.redis.del(key);
  }
}
