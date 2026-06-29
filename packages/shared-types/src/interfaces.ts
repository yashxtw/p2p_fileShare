/**
 * Shared interfaces used across the P2P file sharing platform.
 */
import type { SessionStatus } from './enums';
/** Base entity with common fields */
export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

/** Anonymous device — identified by fingerprint, no login required */
export interface Device {
  id: string;
  deviceName: string | null;
  browser: string | null;
  platform: string | null;
  os: string | null;
  ipAddress: string | null;
  fingerprint: string;
  createdAt: string;
  lastSeenAt: string;
}

/** File metadata — describes a file to be transferred */
export interface FileMetadata {
  name: string;
  size: number;
  type: string;
  lastModified: number;
  hash?: string;
}

/** Transfer file — persisted file metadata linked to a session */
export interface TransferFile {
  id: string;
  sessionId: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  createdAt: string;
}

/** Session — the core entity representing a transfer session */
export interface Session {
  id: string;
  sessionCode: string;
  status: SessionStatus;
  senderDeviceId: string;
  receiverDeviceId: string | null;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

/** Session with related data */
export interface SessionWithDetails extends Session {
  senderDevice?: Device;
  receiverDevice?: Device;
  files?: TransferFile[];
}
/** Audit log entry */
export interface AuditLog {
  id: string;
  sessionId: string | null;
  eventType: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}
/** Peer info for session (anonymous — no username, just device info) */
export interface PeerInfo {
  deviceId: string;
  deviceName: string | null;
  browser: string | null;
  isOnline: boolean;
}
/** Device info sent from the client */
export interface DeviceInfo {
  deviceName?: string;
  browser?: string;
  platform?: string;
  os?: string;
  fingerprint: string;
}
/** QR payload data — frontend renders this as a QR code */
export interface QrPayload {
  sessionCode: string;
  expiresAt: string;
}