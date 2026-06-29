import { z } from 'zod';
/** Validation schema for device info sent from the client */
export const deviceInfoSchema = z.object({
  deviceName: z.string().max(255).optional(),
  browser: z.string().max(100).optional(),
  platform: z.string().max(100).optional(),
  os: z.string().max(100).optional(),
  fingerprint: z
    .string()
    .min(8, 'Fingerprint must be at least 8 characters')
    .max(64, 'Fingerprint must be at most 64 characters'),
});
/** Validation schema for file metadata */
export const fileMetadataSchema = z.object({
  name: z.string().min(1).max(512),
  size: z.number().int().positive().max(500 * 1024 * 1024), // 500 MB max
  type: z.string().min(1).max(255),
  lastModified: z.number().int().nonnegative(),
});
/** POST /sessions — create a new session */
export const createSessionSchema = z.object({
  device: deviceInfoSchema,
  files: z.array(fileMetadataSchema).max(50).optional(),
});
export type CreateSessionDto = z.infer<typeof createSessionSchema>;
