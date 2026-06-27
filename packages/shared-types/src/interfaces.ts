/**
 * Shared interfaces used across the P2P file sharing platform.
 */
import type { TransferStatus, UserRole } from './enums';
/** Base entity with common fields */
export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}
/** User entity */
export interface User extends BaseEntity {
  email: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  role: UserRole;
}
/** File metadata */
export interface FileMetadata {
  name: string;
  size: number;
  type: string;
  lastModified: number;
  hash?: string;
}
/** Transfer session */
export interface TransferSession extends BaseEntity {
  senderId: string;
  receiverId: string;
  files: FileMetadata[];
  status: TransferStatus;
  progress: number;
  totalBytes: number;
  transferredBytes: number;
  speed?: number;
  roomId: string;
}
/** Peer info for WebRTC */
export interface PeerInfo {
  id: string;
  username: string;
  displayName: string;
  isOnline: boolean;
}
/** Room for peer discovery */
export interface Room {
  id: string;
  code: string;
  peers: PeerInfo[];
  createdAt: string;
  expiresAt: string;
}
