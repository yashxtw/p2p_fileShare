import { Injectable, NotFoundException } from '@nestjs/common';
import type { Device, DeviceInfo } from '@p2p-share/shared-types';
import { AuditEventType } from '@p2p-share/shared-types';
import { DeviceRepository } from '../database/repositories/device.repository';
import { AuditRepository } from '../database/repositories/audit.repository';
import { LoggerService } from '../common/logger/logger.service';

/**
 * DeviceService — manages anonymous device identification.
 *
 * Devices are identified by a browser-generated fingerprint stored in localStorage.
 * No login required. The fingerprint is sent with every request.
 */
@Injectable()
export class DeviceService {
  constructor(
    private readonly deviceRepo: DeviceRepository,
    private readonly auditRepo: AuditRepository,
    private readonly logger: LoggerService,
  ) {}

  /**
   * Register or update a device by its fingerprint.
   * If the fingerprint exists, updates device info and last_seen_at.
   * If not, creates a new device record.
   */
  async registerDevice(
    info: DeviceInfo,
    ipAddress?: string,
  ): Promise<Device> {
    const device = await this.deviceRepo.upsertByFingerprint({
      deviceName: info.deviceName,
      browser: info.browser,
      platform: info.platform,
      os: info.os,
      ipAddress,
      fingerprint: info.fingerprint,
    });

    this.logger.debug('Device registered', 'DeviceService', {
      id: device.id,
      fingerprint: info.fingerprint,
    });

    return device;
  }

  /**
   * Get a device by its UUID.
   */
  async getDevice(id: string): Promise<Device> {
    const device = await this.deviceRepo.findById(id);
    if (!device) {
      throw new NotFoundException({
        success: false,
        error: {
          message: 'Device not found',
          code: 'NOT_FOUND',
        },
      });
    }
    return device;
  }

  /**
   * Get or create a device by fingerprint.
   * Main entry point for device identification.
   */
  async getOrCreateDevice(
    info: DeviceInfo,
    ipAddress?: string,
  ): Promise<Device> {
    // Try to find existing device
    const existing = await this.deviceRepo.findByFingerprint(info.fingerprint);

    if (existing) {
      // Update last seen and device info
      await this.deviceRepo.upsertByFingerprint({
        deviceName: info.deviceName,
        browser: info.browser,
        platform: info.platform,
        os: info.os,
        ipAddress,
        fingerprint: info.fingerprint,
      });
      return { ...existing, lastSeenAt: new Date().toISOString() };
    }

    // Create new device
    const device = await this.deviceRepo.create({
      deviceName: info.deviceName,
      browser: info.browser,
      platform: info.platform,
      os: info.os,
      ipAddress,
      fingerprint: info.fingerprint,
    });

    await this.auditRepo.create({
      eventType: AuditEventType.DEVICE_REGISTERED,
      metadata: {
        deviceId: device.id,
        fingerprint: info.fingerprint,
        browser: info.browser,
        os: info.os,
      },
    });

    this.logger.info('New device registered', 'DeviceService', {
      id: device.id,
    });

    return device;
  }
}
