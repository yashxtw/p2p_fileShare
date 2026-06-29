/**
 * API request/response type definitions.
 */
import type { ErrorCode, SessionStatus } from './enums';
import type { Session, Device, TransferFile, QrPayload, DeviceInfo, FileMetadata } from './interfaces';
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
// ─── Session API Types ───────────────────────────────────────
/** POST /sessions — create a new session */
export interface CreateSessionRequest {
  device: DeviceInfo;
  files?: FileMetadata[];
}
/** Response from POST /sessions */
export interface CreateSessionResponse {
  session: Session;
  senderDevice: Device;
  files: TransferFile[];
  qrPayload: QrPayload;
}
/** POST /sessions/join — join a session by code */
export interface JoinSessionRequest {
  code: string;
  device: DeviceInfo;
}
/** Response from POST /sessions/join */
export interface JoinSessionResponse {
  session: Session;
  senderDevice: Device;
  receiverDevice: Device;
}
/** PATCH /sessions/:id/status */
export interface UpdateSessionStatusRequest {
  status: SessionStatus;
}
/** GET /sessions/:id or /sessions/code/:code */
export interface SessionDetailResponse {
  session: Session;
  senderDevice?: Device;
  receiverDevice?: Device;
  files: TransferFile[];
}