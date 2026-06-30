import { Injectable } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';
import { DeviceRepository } from '../../database/repositories/device.repository';
import { LoggerService } from '../../common/logger/logger.service';

/**
 * Service to manage anonymous device presence tracking using Redis and database sync.
 */
@Injectable()
export class PresenceService {
  private readonly PRESENCE_PREFIX = 'presence:device:';
  private readonly PEER_PREFIX = 'peer:device:';

  constructor(
    private readonly redis: RedisService,
    private readonly deviceRepo: DeviceRepository,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Mark a device online, mapping its device ID to its socket ID.
   */
  async trackOnline(deviceId: string, socketId: string): Promise<void> {
    const presenceKey = `${this.PRESENCE_PREFIX}${deviceId}`;
    const peerKey = `${this.PEER_PREFIX}${deviceId}`;

    // Set presence status with 60 second expiration (needs regular heartbeats)
    await this.redis.setWithTTL(presenceKey, 'online', 60);

    // Save socket mapping details (24 hours TTL)
    const peerDetails = JSON.stringify({
      socketId,
      connectedAt: new Date().toISOString(),
    });
    await this.redis.setWithTTL(peerKey, peerDetails, 86400);

    // Update database last seen
    await this.deviceRepo.updateLastSeen(deviceId);

    this.logger.debug(`Device online: ${deviceId} (socket: ${socketId})`, 'PresenceService');
  }

  /**
   * Process a heartbeat from a client, extending its online status TTL.
   */
  async trackHeartbeat(deviceId: string): Promise<boolean> {
    const presenceKey = `${this.PRESENCE_PREFIX}${deviceId}`;
    
    // Check if device was previously marked online
    const isOnline = await this.redis.exists(presenceKey);
    
    // Extend presence status expiration for another 60 seconds
    await this.redis.setWithTTL(presenceKey, 'online', 60);

    // Touch Postgres device entry in background
    this.deviceRepo.updateLastSeen(deviceId).catch((err) => {
      this.logger.error(`Failed to update last seen for device ${deviceId}`, 'PresenceService', err);
    });

    return isOnline;
  }

  /**
   * Mark a device offline, removing presence keys.
   */
  async trackOffline(deviceId: string): Promise<void> {
    const presenceKey = `${this.PRESENCE_PREFIX}${deviceId}`;
    const peerKey = `${this.PEER_PREFIX}${deviceId}`;

    await Promise.all([
      this.redis.del(presenceKey),
      this.redis.del(peerKey),
    ]);

    this.logger.debug(`Device offline: ${deviceId}`, 'PresenceService');
  }

  /**
   * Check if a device is online.
   */
  async isDeviceOnline(deviceId: string): Promise<boolean> {
    const presenceKey = `${this.PRESENCE_PREFIX}${deviceId}`;
    return this.redis.exists(presenceKey);
  }

  /**
   * Get mapped socket ID for a device.
   */
  async getDeviceSocketId(deviceId: string): Promise<string | null> {
    const peerKey = `${this.PEER_PREFIX}${deviceId}`;
    const data = await this.redis.get(peerKey);
    if (!data) return null;

    try {
      const parsed = JSON.parse(data);
      return parsed.socketId || null;
    } catch {
      return null;
    }
  }
}
