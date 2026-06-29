import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database.service';
import { LoggerService } from '../../common/logger/logger.service';
import type { Device } from '@p2p-share/shared-types';
/**
 * Row shape returned from the devices table.
 * Column names use snake_case (PostgreSQL convention).
 */
interface DeviceRow {
  [key: string]: unknown;
  id: string;
  device_name: string | null;
  browser: string | null;
  platform: string | null;
  os: string | null;
  ip_address: string | null;
  fingerprint: string;
  created_at: string;
  last_seen_at: string;
}
/** Maps a DB row to the application-level Device interface */
function toDevice(row: DeviceRow): Device {
  return {
    id: row.id,
    deviceName: row.device_name,
    browser: row.browser,
    platform: row.platform,
    os: row.os,
    ipAddress: row.ip_address,
    fingerprint: row.fingerprint,
    createdAt: row.created_at,
    lastSeenAt: row.last_seen_at,
  };
}
@Injectable()
export class DeviceRepository {
  constructor(
    private readonly db: DatabaseService,
    private readonly logger: LoggerService,
  ) {}
  /** Create a new device record */
  async create(data: {
    deviceName?: string;
    browser?: string;
    platform?: string;
    os?: string;
    ipAddress?: string;
    fingerprint: string;
  }): Promise<Device> {
    const result = await this.db.query<DeviceRow>(
      `INSERT INTO devices (device_name, browser, platform, os, ip_address, fingerprint)
       VALUES ($1, $2, $3, $4, $5::inet, $6)
       RETURNING *`,
      [
        data.deviceName ?? null,
        data.browser ?? null,
        data.platform ?? null,
        data.os ?? null,
        data.ipAddress ?? null,
        data.fingerprint,
      ],
    );
    this.logger.debug('Device created', 'DeviceRepository', { id: result.rows[0].id });
    return toDevice(result.rows[0]);
  }
  /** Find a device by its UUID */
  async findById(id: string): Promise<Device | null> {
    const result = await this.db.query<DeviceRow>(
      `SELECT * FROM devices WHERE id = $1`,
      [id],
    );
    return result.rows[0] ? toDevice(result.rows[0]) : null;
  }
  /** Find a device by its fingerprint */
  async findByFingerprint(fingerprint: string): Promise<Device | null> {
    const result = await this.db.query<DeviceRow>(
      `SELECT * FROM devices WHERE fingerprint = $1`,
      [fingerprint],
    );
    return result.rows[0] ? toDevice(result.rows[0]) : null;
  }
  /**
   * Insert a device or update it if a matching fingerprint exists.
   * Updates last_seen_at and device info on conflict.
   */
  async upsertByFingerprint(data: {
    deviceName?: string;
    browser?: string;
    platform?: string;
    os?: string;
    ipAddress?: string;
    fingerprint: string;
  }): Promise<Device> {
    const result = await this.db.query<DeviceRow>(
      `INSERT INTO devices (device_name, browser, platform, os, ip_address, fingerprint)
       VALUES ($1, $2, $3, $4, $5::inet, $6)
       ON CONFLICT (fingerprint) DO UPDATE SET
         device_name  = COALESCE(EXCLUDED.device_name, devices.device_name),
         browser      = COALESCE(EXCLUDED.browser, devices.browser),
         platform     = COALESCE(EXCLUDED.platform, devices.platform),
         os           = COALESCE(EXCLUDED.os, devices.os),
         ip_address   = COALESCE(EXCLUDED.ip_address, devices.ip_address),
         last_seen_at = NOW()
       RETURNING *`,
      [
        data.deviceName ?? null,
        data.browser ?? null,
        data.platform ?? null,
        data.os ?? null,
        data.ipAddress ?? null,
        data.fingerprint,
      ],
    );
    return toDevice(result.rows[0]);
  }
  /** Touch the last_seen_at timestamp */
  async updateLastSeen(id: string): Promise<void> {
    await this.db.query(
      `UPDATE devices SET last_seen_at = NOW() WHERE id = $1`,
      [id],
    );
  }
}