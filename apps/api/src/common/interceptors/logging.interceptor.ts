import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { LoggerService } from '../logger/logger.service';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  constructor(private readonly logger: LoggerService) {}
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    const start = Date.now();
    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse();
          const duration = Date.now() - start;
          this.logger.info(
            `${method} ${url} → ${response.statusCode} (${duration}ms)`,
            'HTTP',
          );
        },
        error: () => {
          const duration = Date.now() - start;
          this.logger.warn(
            `${method} ${url} → ERROR (${duration}ms)`,
            'HTTP',
          );
        },
      }),
    );
  }
}