import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppConfigModule } from './config/config.module';
import { HealthModule } from './health/health.module';
import { DatabaseModule } from './database/database.module';
import { RedisModule } from './redis/redis.module';
import { LoggerModule } from './common/logger/logger.module';
import { CacheModule } from './cache/cache.module';
import { SessionModule } from './sessions/session.module';
import { DeviceModule } from './devices/device.module';

@Module({
  imports: [
    // Core infrastructure
    AppConfigModule,
    LoggerModule,
    DatabaseModule,
    RedisModule,
    CacheModule,
    ScheduleModule.forRoot(),

    // Feature modules
    HealthModule,
    SessionModule,
    DeviceModule,
  ],
})
export class AppModule {}
