import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { TransferState, TransferQueueState } from '@p2p-share/shared-types';

export interface QueueFile {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  progressBytes: number;
  status: TransferQueueState;
  checksum?: string;
  file?: File;
}

interface TransferStoreState {
  transferState: TransferState;
  queue: QueueFile[];
  activeTransferId: string | null;
  speed: number; // in Bytes/second
  eta: number | null; // in seconds
  totalProgress: number; // overall percentage (0 - 100)
  error: string | null;

  setTransferState: (state: TransferState) => void;
  setQueue: (queue: QueueFile[]) => void;
  addFilesToQueue: (files: QueueFile[]) => void;
  updateFileProgress: (id: string, progressBytes: number, status?: TransferQueueState) => void;
  setSpeedAndEta: (speed: number, eta: number | null) => void;
  setTotalProgress: (progress: number) => void;
  setActiveTransferId: (id: string | null) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState = {
  transferState: TransferState.IDLE,
  queue: [],
  activeTransferId: null,
  speed: 0,
  eta: null,
  totalProgress: 0,
  error: null,
};

export const useTransferStore = create<TransferStoreState>()(
  devtools(
    (set) => ({
      ...initialState,

      setTransferState: (state) => set({ transferState: state }),
      setQueue: (queue) => set({ queue }),
      addFilesToQueue: (files) =>
        set((state) => ({
          queue: [...state.queue, ...files],
          transferState: state.transferState === TransferState.IDLE ? TransferState.FILES_SELECTED : state.transferState,
        })),
      updateFileProgress: (id, progressBytes, status) =>
        set((state) => {
          const updatedQueue = state.queue.map((file) => {
            if (file.id === id) {
              return {
                ...file,
                progressBytes,
                status: status || file.status,
              };
            }
            return file;
          });
          return { queue: updatedQueue };
        }),
      setSpeedAndEta: (speed, eta) => set({ speed, eta }),
      setTotalProgress: (totalProgress) => set({ totalProgress }),
      setActiveTransferId: (id) => set({ activeTransferId: id }),
      setError: (error) => set({ error, transferState: error ? TransferState.FAILED : TransferState.IDLE }),
      reset: () => set(initialState),
    }),
    { name: 'transfer-store' },
  ),
);
