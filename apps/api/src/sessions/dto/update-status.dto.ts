import { z } from 'zod';
import { SessionStatus } from '@p2p-share/shared-types';
/** PATCH /sessions/:id/status — update session status */
export const updateStatusSchema = z.object({
  status: z.nativeEnum(SessionStatus, {
    errorMap: () => ({
      message: `Status must be one of: ${Object.values(SessionStatus).join(', ')}`,
    }),
  }),
});
export type UpdateStatusDto = z.infer<typeof updateStatusSchema>;