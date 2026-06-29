'use client';

import { useQuery } from '@tanstack/react-query';
import { sessionApi } from '@/services/session.service';
import { useSessionStore } from '@/stores/session.store';
import { useCallback } from 'react';
import { useDevice } from './use-device';
import type { FileMetadata } from '@p2p-share/shared-types';

/**
 * Hook for session creation and joining.
 * Manages the session lifecycle from the frontend side.
 */
export function useSession() {
  const store = useSessionStore();
  const { deviceInfo, isReady } = useDevice();

  /** Create a new session with selected files */
  const createSession = useCallback(
    async (files: FileMetadata[] = []) => {
      if (!isReady) return;

      store.setStatus('creating');
      store.setError(null);

      try {
        const result = await sessionApi.createSession({
          device: deviceInfo,
          files: files.length > 0 ? files : undefined,
        });

        store.setSession(result.session);
        store.setSessionCode(result.session.sessionCode);
        store.setQrPayload(result.qrPayload);
        if (result.senderDevice) {
          store.setSenderDevice(result.senderDevice);
        }
        store.setStatus('ready');

        return result;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Failed to create session';
        store.setError(message);
        throw error;
      }
    },
    [isReady, deviceInfo, store],
  );

  /** Join an existing session by 6-digit code */
  const joinSession = useCallback(
    async (code: string) => {
      if (!isReady) return;

      store.setStatus('joining');
      store.setError(null);

      try {
        const result = await sessionApi.joinSession({
          code,
          device: deviceInfo,
        });

        store.setSession(result.session);
        store.setSessionCode(result.session.sessionCode);
        if (result.senderDevice) {
          store.setSenderDevice(result.senderDevice);
        }
        store.setStatus('ready');

        return result;
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Failed to join session';
        store.setError(message);
        throw error;
      }
    },
    [isReady, deviceInfo, store],
  );

  return {
    ...store,
    createSession,
    joinSession,
    isDeviceReady: isReady,
  };
}

/**
 * Hook to poll session status by ID.
 * Automatically refetches every 3 seconds while the session is active.
 */
export function useSessionStatus(sessionId: string | null) {
  return useQuery({
    queryKey: ['session', sessionId],
    queryFn: () => sessionApi.getSession(sessionId!),
    enabled: !!sessionId,
    refetchInterval: 3000,
    refetchIntervalInBackground: false,
  });
}
