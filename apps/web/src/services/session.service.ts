/**
 * Session API client — typed methods for session endpoints.
 * Uses the shared apiClient for all HTTP calls.
 */
import { apiClient } from '@/lib/api-client';
import type {
  CreateSessionResponse,
  JoinSessionResponse,
  SessionDetailResponse,
  CreateSessionRequest,
  JoinSessionRequest,
  UpdateSessionStatusRequest,
} from '@p2p-share/shared-types';
import type { Session } from '@p2p-share/shared-types';

export const sessionApi = {
  /** Create a new transfer session */
  createSession: (payload: CreateSessionRequest) =>
    apiClient.post<CreateSessionResponse>('/sessions', payload),

  /** Join a session by 6-digit code */
  joinSession: (payload: JoinSessionRequest) =>
    apiClient.post<JoinSessionResponse>('/sessions/join', payload),

  /** Get session details by UUID */
  getSession: (id: string) =>
    apiClient.get<SessionDetailResponse>(`/sessions/${id}`),

  /** Get session details by 6-digit code */
  getSessionByCode: (code: string) =>
    apiClient.get<SessionDetailResponse>(`/sessions/code/${code}`),

  /** Update session status */
  updateStatus: (id: string, payload: UpdateSessionStatusRequest) =>
    apiClient.patch<Session>(`/sessions/${id}/status`, payload),

  /** Manually expire a session */
  expireSession: (id: string) =>
    apiClient.post<Session>(`/sessions/${id}/expire`),
};
