import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { LoggerService } from '../common/logger/logger.service';
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client!: Redis;
  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {}
  async onModuleInit() {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    this.client = new Redis(redisUrl!, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times: number) => {
        if (times > 10) {
          this.logger.error('Redis: max retries reached, giving up', 'RedisService');
          return null;
        }
        // Exponential backoff: 200ms, 400ms, 800ms, ...up to 30s
        const base = 200 * Math.pow(2, times - 1);
        const delay = base > 30000 ? 30000 : base;
        this.logger.warn(`Redis: retrying connection in ${delay}ms (attempt ${times})`, 'RedisService');
        return delay;
      },
      lazyConnect: false,
    });
    this.client.on('connect', () => {
      this.logger.info('Redis connected', 'RedisService');
    });
    this.client.on('error', (err) => {
      this.logger.error('Redis connection error', 'RedisService', err);
    });
    this.client.on('close', () => {
      this.logger.warn('Redis connection closed', 'RedisService');
    });
  }
  async onModuleDestroy() {
    if (this.client) {
      await this.client.quit();
      this.logger.info('Redis connection closed gracefully', 'RedisService');
    }
  }
  /** Get a value by key */
  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }
  /** Set a value */
  async set(key: string, value: string): Promise<void> {
    await this.client.set(key, value);
  }
  /** Set a value with TTL (in seconds) */
  async setWithTTL(key: string, value: string, ttlSeconds: number): Promise<void> {
    await this.client.set(key, value, 'EX', ttlSeconds);
  }
  /** Delete a key */
  async del(key: string): Promise<number> {
    return this.client.del(key);
  }
  /** Check if a key exists */
  async exists(key: string): Promise<boolean> {
    const result = await this.client.exists(key);
    return result === 1;
  }
  /** Get the underlying Redis client for advanced operations */
  getClient(): Redis {
    return this.client;
  }
  /** Health check — PING */
  async healthCheck(): Promise<void> {
    const result = await this.client.ping();
    if (result !== 'PONG') {
      throw new Error(`Redis health check failed: got "${result}" instead of PONG`);
    }
  }
}