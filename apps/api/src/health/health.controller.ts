import { Controller, Get } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { RedisService } from '../redis/redis.service';
import type { HealthCheckResponse, ServiceHealth } from '@p2p-share/shared-types';

@Controller('health')
export class HealthController {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly redisService: RedisService,
  ) {}

  @Get()
  async check(): Promise<HealthCheckResponse> {
    const [dbHealth, redisHealth] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
    ]);
    const allOk = dbHealth.status === 'ok' && redisHealth.status === 'ok';
    const allDown = dbHealth.status === 'down' && redisHealth.status === 'down';
    return {
      status: allOk ? 'ok' : allDown ? 'down' : 'degraded',
      timestamp: new Date().toISOString(),
      services: {
        database: dbHealth,
        redis: redisHealth,
      },
    };
  }

  private async checkDatabase(): Promise<ServiceHealth> {
    try {
      const start = Date.now();
      await this.databaseService.healthCheck();
      const latency = Date.now() - start;
      return { status: 'ok', latency: `${latency}ms` };
    } catch (error) {
      return {
        status: 'down',
        latency: '0ms',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
  
  private async checkRedis(): Promise<ServiceHealth> {
    try {
      const start = Date.now();
      await this.redisService.healthCheck();
      const latency = Date.now() - start;
      return { status: 'ok', latency: `${latency}ms` };
    } catch (error) {
      return {
        status: 'down',
        latency: '0ms',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}