import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { LoggerService } from '../logger/logger.service';
import type { ApiErrorResponse } from '@p2p-share/shared-types';
import { AppError } from '@p2p-share/shared-utils';
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(private readonly logger: LoggerService) {}
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();
    let statusCode: number;
    let message: string;
    let errorCode: string;
    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      message =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : (exceptionResponse as { message?: string }).message || exception.message;
      errorCode = this.httpStatusToErrorCode(statusCode);
    } else if (exception instanceof AppError) {
      statusCode = exception.statusCode;
      message = exception.message;
      errorCode = exception.code;
    } else if (exception instanceof Error) {
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      message =
        process.env.NODE_ENV === 'production'
          ? 'Internal server error'
          : exception.message;
      errorCode = 'INTERNAL_ERROR';
    } else {
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Internal server error';
      errorCode = 'INTERNAL_ERROR';
    }
    // Log the error
    this.logger.error(
      `${request.method} ${request.url} → ${statusCode}: ${message}`,
      'ExceptionFilter',
      exception instanceof Error ? exception : new Error(String(exception)),
    );
    const errorResponse: ApiErrorResponse = {
      success: false,
      error: {
        message,
        code: errorCode as ApiErrorResponse['error']['code'],
      },
    };
    response.status(statusCode).json(errorResponse);
  }
  private httpStatusToErrorCode(status: number): string {
    const map: Record<number, string> = {
      400: 'VALIDATION_ERROR',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      429: 'RATE_LIMITED',
      500: 'INTERNAL_ERROR',
    };
    return map[status] || 'INTERNAL_ERROR';
  }
}
