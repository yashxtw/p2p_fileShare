'use client';

import { useCallback } from 'react';
import { useTransferStore, QueueFile } from '@/stores/transfer.store';
import { QueueManager } from '@/lib/transfer/queue-manager';
import { TransferQueueState, TransferState } from '@p2p-share/shared-types';

let activeQueueManager: QueueManager | null = null;

export function useTransfer() {
  const store = useTransferStore();

  /**
   * Initializes the queue manager with the established WebRTC DataChannel.
   */
  const initializeTransferManager = useCallback((channel: RTCDataChannel) => {
    if (activeQueueManager) {
      activeQueueManager.destroy();
    }
    activeQueueManager = new QueueManager(channel);
  }, []);

  /**
   * Cleans up the queue manager and resets store state.
   */
  const terminateTransferSession = useCallback(() => {
    if (activeQueueManager) {
      activeQueueManager.destroy();
      activeQueueManager = null;
    }
    useTransferStore.getState().reset();
  }, []);

  /**
   * Enqueues standard browser File objects.
   */
  const queueFilesForTransfer = useCallback(
    (files: FileList | File[]) => {
      const formattedFiles: QueueFile[] = Array.from(files).map((f) => ({
        id: crypto.randomUUID(),
        name: f.name,
        size: f.size,
        mimeType: f.type || 'application/octet-stream',
        progressBytes: 0,
        status: TransferQueueState.WAITING,
        file: f,
      }));

      useTransferStore.getState().addFilesToQueue(formattedFiles);
    },
    [],
  );

  /**
   * Initiates sending files in the queue.
   */
  const startFileTransmission = useCallback(async () => {
    if (!activeQueueManager) {
      console.warn('Cannot start transfer: WebRTC DataChannel is not initialized');
      return;
    }
    await activeQueueManager.processNextFile();
  }, []);

  /**
   * Pauses the active transfer.
   */
  const pauseActiveTransfer = useCallback(() => {
    if (activeQueueManager) {
      activeQueueManager.pause();
    }
  }, []);

  /**
   * Resumes the active transfer.
   */
  const resumeActiveTransfer = useCallback(() => {
    if (activeQueueManager) {
      activeQueueManager.resume();
    }
  }, []);

  /**
   * Cancels the active transfer.
   */
  const cancelActiveTransfer = useCallback(() => {
    if (activeQueueManager) {
      activeQueueManager.cancelActiveTransfer();
    }
  }, []);

  // Formatting helpers
  const formatSpeed = useCallback((bytesPerSec: number): string => {
    if (bytesPerSec === 0) return '0 B/s';
    const k = 1024;
    const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
    const i = Math.floor(Math.log(bytesPerSec) / Math.log(k));
    return parseFloat((bytesPerSec / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  const formatETA = useCallback((seconds: number | null): string => {
    if (seconds === null) return '--:--';
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  }, []);

  return {
    ...store,
    initializeTransferManager,
    terminateTransferSession,
    queueFilesForTransfer,
    startFileTransmission,
    pauseActiveTransfer,
    resumeActiveTransfer,
    cancelActiveTransfer,
    formatSpeed,
    formatETA,
  };
}
