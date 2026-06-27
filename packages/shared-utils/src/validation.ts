/**
 * Validation helpers using Zod.
 */
import { z } from 'zod';
/** Validate email format */
export const emailSchema = z.string().email('Invalid email address').toLowerCase().trim();
/** Validate username */
export const usernameSchema = z
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(30, 'Username must be at most 30 characters')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, hyphens, and underscores')
  .trim();
/** Validate password strength */
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password must be at most 128 characters')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');
/** Validate file size (in bytes) */
export function validateFileSize(sizeInBytes: number, maxSizeInMB: number = 500): boolean {
  return sizeInBytes > 0 && sizeInBytes <= maxSizeInMB * 1024 * 1024;
}
/** Validate room code format */
export const roomCodeSchema = z
  .string()
  .length(6, 'Room code must be exactly 6 characters')
  .regex(/^[A-Z0-9]+$/, 'Room code must contain only uppercase letters and numbers');
/** Safe parse helper with typed result */
export function safeParse<T>(schema: z.ZodSchema<T>, data: unknown): {
  success: boolean;
  data?: T;
  errors?: string[];
} {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    errors: result.error.errors.map((e) => e.message),
  };
}