import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { LoggerService } from './common/logger/logger.service';
import { RedisIoAdapter } from './common/adapters/socket-io.adapter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });
  const logger = app.get(LoggerService);
  const configService = app.get(ConfigService);

  // Configure custom Redis Socket.IO adapter
  const redisUrl = configService.get<string>('REDIS_URL');
  const redisIoAdapter = new RedisIoAdapter(app, redisUrl!);
  await redisIoAdapter.connectToRedis();
  app.useWebSocketAdapter(redisIoAdapter);

  // Global pipes, filters, interceptors
  app.useGlobalFilters(new GlobalExceptionFilter(logger));
  app.useGlobalInterceptors(
    new LoggingInterceptor(logger),
    new ResponseInterceptor(),
  );

  // CORS
  const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';
  app.enableCors({
    origin: corsOrigin,
    credentials: true,
  });
  const port = process.env.PORT || 4000;
  await app.listen(port);
  logger.info(`🚀 API server running on http://localhost:${port}`, 'Bootstrap');
}

bootstrap();
