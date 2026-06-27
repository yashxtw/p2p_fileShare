/**
 * API request/response type definitions.
 */
import type { ErrorCode } from './enums';
/** Standard successful API response */
export interface ApiResponse<T = unknown> {
  success: true;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}
/** Standard error API response */
export interface ApiErrorResponse {
  success: false;
  error: {
    message: string;
    code: ErrorCode;
    details?: Record<string, unknown>;
  };
}
/** Health check response */
export interface HealthCheckResponse {
  status: 'ok' | 'degraded' | 'down';
  timestamp: string;
  services: {
    database: ServiceHealth;
    redis: ServiceHealth;
  };
}
/** Individual service health */
export interface ServiceHealth {
  status: 'ok' | 'down';
  latency: string;
  error?: string;
}
/** Pagination query params */
export interface PaginationQuery {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
