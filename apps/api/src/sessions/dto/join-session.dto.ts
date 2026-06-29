import { z } from 'zod';
import { deviceInfoSchema } from './create-session.dto';
/** POST /sessions/join — join a session by 6-digit code */
export const joinSessionSchema = z.object({
  code: z
    .string()
    .length(6, 'Session code must be exactly 6 digits')
    .regex(/^\d{6}$/, 'Session code must contain only digits'),
  device: deviceInfoSchema,
});
export type JoinSessionDto = z.infer<typeof joinSessionSchema>;