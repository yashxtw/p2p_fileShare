/**
 * Shared enumerations used across the P2P file sharing platform.
 */
/** Status of a file transfer operation */
export enum TransferStatus {
  PENDING = 'PENDING',
  CONNECTING = 'CONNECTING',
  TRANSFERRING = 'TRANSFERRING',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}
/** Standardized error codes */
export enum ErrorCode {
  // General
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  RATE_LIMITED = 'RATE_LIMITED',
  // Auth
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',
  TOKEN_INVALID = 'TOKEN_INVALID',
  // Transfer
  TRANSFER_FAILED = 'TRANSFER_FAILED',
  PEER_DISCONNECTED = 'PEER_DISCONNECTED',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  // Database
  DATABASE_ERROR = 'DATABASE_ERROR',
  DUPLICATE_ENTRY = 'DUPLICATE_ENTRY',
}
/** User role */
export enum UserRole {
  USER = 'USER',
  ADMIN = 'ADMIN',
}
/** WebSocket event types */
export enum WsEvent {
  // Connection
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  // Signaling
  SIGNAL_OFFER = 'signal:offer',
  SIGNAL_ANSWER = 'signal:answer',
  SIGNAL_ICE = 'signal:ice',
  // Transfer
  TRANSFER_INIT = 'transfer:init',
  TRANSFER_ACCEPT = 'transfer:accept',
  TRANSFER_REJECT = 'transfer:reject',
  TRANSFER_PROGRESS = 'transfer:progress',
  TRANSFER_COMPLETE = 'transfer:complete',
  TRANSFER_ERROR = 'transfer:error',
  // Room
  ROOM_JOIN = 'room:join',
  ROOM_LEAVE = 'room:leave',
  ROOM_PEERS = 'room:peers',
}
