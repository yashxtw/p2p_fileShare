/**
 * Shared constants for the P2P file sharing platform.
 */
/** Application defaults */
export const APP = {
  NAME: 'P2P FileShare',
  VERSION: '0.1.0',
  DESCRIPTION: 'Production-grade real-time P2P file sharing platform',
} as const;
/** Network ports */
export const PORTS = {
  WEB: 3000,
  API: 4000,
  WS: 4001,
} as const;
/** File transfer limits */
export const TRANSFER = {
  MAX_FILE_SIZE_MB: 500,
  MAX_FILE_SIZE_BYTES: 500 * 1024 * 1024,
  MAX_FILES_PER_TRANSFER: 50,
  CHUNK_SIZE_BYTES: 64 * 1024, // 64 KB chunks for WebRTC
} as const;
/** Room configuration */
export const ROOM = {
  CODE_LENGTH: 6,
  MAX_PEERS: 10,
  EXPIRY_MINUTES: 60,
} as const;
/** Auth configuration */
export const AUTH = {
  TOKEN_EXPIRY: '7d',
  REFRESH_TOKEN_EXPIRY: '30d',
  BCRYPT_ROUNDS: 12,
} as const;
/** Redis key prefixes */
export const REDIS_KEYS = {
  SESSION: 'session:',
  ROOM: 'room:',
  RATE_LIMIT: 'rate:',
  CACHE: 'cache:',
} as const;
/** API routes */
export const API_ROUTES = {
  HEALTH: '/health',
  AUTH: '/auth',
  USERS: '/users',
  ROOMS: '/rooms',
  TRANSFERS: '/transfers',
} as const;
