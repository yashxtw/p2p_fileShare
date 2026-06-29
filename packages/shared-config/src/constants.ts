/**
 * Shared constants for the P2P file sharing platform.
 */
/** Application defaults */
export const APP = {
  NAME: 'P2P FileShare',
  VERSION: '0.2.0',
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

/** Session configuration */
export const SESSION = {
  CODE_LENGTH: 6,
  CODE_CHARS: '0123456789',      // Numeric only — easy to type on phones
  EXPIRY_MINUTES: 10,            // Unclaimed sessions expire in 10 minutes
  ACTIVE_EXPIRY_MINUTES: 60,     // Joined sessions get extended to 60 minutes
  MAX_FILES: 50,
  CLEANUP_INTERVAL_MINUTES: 5,   // How often the cron job runs
} as const;

/** Device configuration */
export const DEVICE = {
  FINGERPRINT_TTL_DAYS: 30,
  NAME_MAX_LENGTH: 255,
} as const;

/** Redis key prefixes */
export const REDIS_KEYS = {
  SESSION_CODE: 'session:code:',     // code → sessionId mapping for fast lookup
  SESSION_ACTIVE: 'session:active:', // sessionId → serialized session cache
  DEVICE_SESSION: 'device:session:', // deviceId → current sessionId
  RATE_LIMIT: 'rate:',
  CACHE: 'cache:',
} as const;

/** API routes */
export const API_ROUTES = {
  HEALTH: '/health',
  SESSIONS: '/sessions',
  DEVICES: '/devices',
} as const;