/**
 * Shared enumerations used across the P2P file sharing platform.
 */

/** Session lifecycle states — models the state machine */
export enum SessionStatus {
  WAITING = 'WAITING',
  JOINED = 'JOINED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  TRANSFERRING = 'TRANSFERRING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

/** Standardized error codes */
export enum ErrorCode {
  // General
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  RATE_LIMITED = 'RATE_LIMITED',

  // Session
  SESSION_NOT_FOUND = 'SESSION_NOT_FOUND',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  SESSION_FULL = 'SESSION_FULL',
  INVALID_SESSION_CODE = 'INVALID_SESSION_CODE',
  INVALID_STATE_TRANSITION = 'INVALID_STATE_TRANSITION',

  // Transfer
  TRANSFER_FAILED = 'TRANSFER_FAILED',
  PEER_DISCONNECTED = 'PEER_DISCONNECTED',
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',

  // Database
  DATABASE_ERROR = 'DATABASE_ERROR',
  DUPLICATE_ENTRY = 'DUPLICATE_ENTRY',

  // Signaling Specific
  PEER_OFFLINE = 'PEER_OFFLINE',
  INVALID_OFFER = 'INVALID_OFFER',
  INVALID_ANSWER = 'INVALID_ANSWER',
  INVALID_CANDIDATE = 'INVALID_CANDIDATE',
  STATE_TRANSITION_INVALID = 'STATE_TRANSITION_INVALID',
  UNKNOWN_SOCKET = 'UNKNOWN_SOCKET',
}

/** Audit log event types */
export enum AuditEventType {
  SESSION_CREATED = 'SESSION_CREATED',
  SESSION_JOINED = 'SESSION_JOINED',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  SESSION_CANCELLED = 'SESSION_CANCELLED',
  STATUS_CHANGED = 'STATUS_CHANGED',
  FILE_ADDED = 'FILE_ADDED',
  DEVICE_REGISTERED = 'DEVICE_REGISTERED',
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

  // Session
  SESSION_JOIN = 'session:join',
  SESSION_LEAVE = 'session:leave',
  SESSION_PEERS = 'session:peers',

  // Client -> Server Events
  CREATE_SESSION = 'create-session',
  JOIN_SESSION = 'join-session',
  OFFER = 'offer',
  ANSWER = 'answer',
  ICE_CANDIDATE = 'ice-candidate',
  HEARTBEAT = 'heartbeat',
  DISCONNECT_SESSION = 'disconnect-session',
  LEAVE_SESSION = 'leave-session',

  // Server -> Client Events
  SESSION_CREATED = 'session-created',
  PEER_JOINED = 'peer-joined',
  OFFER_RECEIVED = 'offer-received',
  ANSWER_RECEIVED = 'answer-received',
  ICE_CANDIDATE_RECEIVED = 'ice-candidate-received',
  PEER_CONNECTED = 'peer-connected',
  PEER_DISCONNECTED = 'peer-disconnected',
  CONNECTION_STATE_CHANGED = 'connection-state-changed',
  ERROR = 'error',
  HEARTBEAT_ACK = 'heartbeat-ack',
}

/** WebRTC connection states tracked in signaling */
export enum WebRtcState {
  WAITING = 'WAITING',
  JOINED = 'JOINED',
  PAIRING = 'PAIRING',
  NEGOTIATING = 'NEGOTIATING',
  CONNECTED = 'CONNECTED',
  DISCONNECTED = 'DISCONNECTED',
  FAILED = 'FAILED',
}

/** Individual file transfer states within the queue */
export enum TransferQueueState {
  WAITING = 'WAITING',
  PREPARING = 'PREPARING',
  SENDING = 'SENDING',
  VERIFYING = 'VERIFYING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

/** Global file transfer engine state */
export enum TransferState {
  IDLE = 'IDLE',
  FILES_SELECTED = 'FILES_SELECTED',
  PREPARING = 'PREPARING',
  NEGOTIATING = 'NEGOTIATING',
  TRANSFERRING = 'TRANSFERRING',
  VERIFYING = 'VERIFYING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}
