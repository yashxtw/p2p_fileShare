import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { LoggerService } from '../common/logger/logger.service';
import { REDIS_KEYS } from '@p2p-share/shared-config';
/**
 * CacheService — session-specific caching abstraction over RedisService.
 *
 * Controllers and services should use CacheService instead of RedisService
 * directly. This layer manages key prefixes, serialization, and TTLs.
 */
@Injectable()
export class CacheService {
  constructor(
    private readonly redis: RedisService,
    private readonly logger: LoggerService,
  ) {}
  // ─── Session Code Mapping ─────────────────────────────────
  /**
   * Map a 6-digit code to a session ID in Redis.
   * Used for O(1) code lookups (avoids DB query on every join attempt).
   */
  async setSessionCode(
    code: string,
    sessionId: string,
    ttlSeconds: number,
  ): Promise<void> {
    const key = `${REDIS_KEYS.SESSION_CODE}${code}`;
    await this.redis.setWithTTL(key, sessionId, ttlSeconds);
    this.logger.debug('Cached session code', 'CacheService', { code, sessionId, ttlSeconds });
  }
  /** Look up a session ID by its 6-digit code */
  async getSessionByCode(code: string): Promise<string | null> {
    const key = `${REDIS_KEYS.SESSION_CODE}${code}`;
    return this.redis.get(key);
  }
  /** Remove a session code mapping (after join or expiry) */
  async invalidateSessionCode(code: string): Promise<void> {
    const key = `${REDIS_KEYS.SESSION_CODE}${code}`;
    await this.redis.del(key);
    this.logger.debug('Invalidated session code', 'CacheService', { code });
  }
  // ─── Active Session Cache ─────────────────────────────────
  /** Cache a full session object for fast reads */
  async setActiveSession(
    sessionId: string,
    data: Record<string, unknown>,
    ttlSeconds: number,
  ): Promise<void> {
    const key = `${REDIS_KEYS.SESSION_ACTIVE}${sessionId}`;
    await this.redis.setWithTTL(key, JSON.stringify(data), ttlSeconds);
  }
  /** Get a cached session object */
  async getActiveSession(sessionId: string): Promise<Record<string, unknown> | null> {
    const key = `${REDIS_KEYS.SESSION_ACTIVE}${sessionId}`;
    const raw = await this.redis.get(key);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      this.logger.warn('Failed to parse cached session', 'CacheService', { sessionId });
      await this.redis.del(key);
      return null;
    }
  }
  /** Remove a cached session */
  async invalidateSession(sessionId: string): Promise<void> {
    const key = `${REDIS_KEYS.SESSION_ACTIVE}${sessionId}`;
    await this.redis.del(key);
  }
  // ─── Device ↔ Session Mapping ─────────────────────────────
  /** Track which session a device is currently in */
  async setDeviceSession(
    deviceId: string,
    sessionId: string,
    ttlSeconds: number,
  ): Promise<void> {
    const key = `${REDIS_KEYS.DEVICE_SESSION}${deviceId}`;
    await this.redis.setWithTTL(key, sessionId, ttlSeconds);
  }
  /** Check if a device is already in a session */
  async getDeviceSession(deviceId: string): Promise<string | null> {
    const key = `${REDIS_KEYS.DEVICE_SESSION}${deviceId}`;
    return this.redis.get(key);
  }
  /** Clear device-session mapping */
  async clearDeviceSession(deviceId: string): Promise<void> {
    const key = `${REDIS_KEYS.DEVICE_SESSION}${deviceId}`;
    await this.redis.del(key);
  }
  // ─── Code Existence Check ─────────────────────────────────
  /** Check if a session code exists in Redis (fast collision check) */
  async isCodeCached(code: string): Promise<boolean> {
    const key = `${REDIS_KEYS.SESSION_CODE}${code}`;
    return this.redis.exists(key);
  }
}