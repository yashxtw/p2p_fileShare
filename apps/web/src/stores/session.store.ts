import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Session, Device, TransferFile, FileMetadata, QrPayload } from '@p2p-share/shared-types';

type SessionUIStatus = 'idle' | 'creating' | 'joining' | 'ready' | 'error';

interface SessionState {
  /** Current session data */
  currentSession: Session | null;
  /** 6-digit session code */
  sessionCode: string | null;
  /** QR payload for the sender page */
  qrPayload: QrPayload | null;
  /** Sender device info */
  senderDevice: Device | null;
  /** Receiver device info */
  receiverDevice: Device | null;
  /** Files to transfer */
  files: TransferFile[];
  /** Selected files (before session creation) */
  selectedFiles: FileMetadata[];
  /** UI status */
  status: SessionUIStatus;
  /** Error message */
  error: string | null;

  // ── Actions ──
  setSession: (session: Session) => void;
  setSessionCode: (code: string) => void;
  setQrPayload: (payload: QrPayload) => void;
  setSenderDevice: (device: Device) => void;
  setReceiverDevice: (device: Device) => void;
  setFiles: (files: TransferFile[]) => void;
  setSelectedFiles: (files: FileMetadata[]) => void;
  addSelectedFile: (file: FileMetadata) => void;
  removeSelectedFile: (index: number) => void;
  setStatus: (status: SessionUIStatus) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState = {
  currentSession: null,
  sessionCode: null,
  qrPayload: null,
  senderDevice: null,
  receiverDevice: null,
  files: [],
  selectedFiles: [],
  status: 'idle' as SessionUIStatus,
  error: null,
};

export const useSessionStore = create<SessionState>()(
  devtools(
    (set) => ({
      ...initialState,

      setSession: (session) => set({ currentSession: session }),
      setSessionCode: (code) => set({ sessionCode: code }),
      setQrPayload: (payload) => set({ qrPayload: payload }),
      setSenderDevice: (device) => set({ senderDevice: device }),
      setReceiverDevice: (device) => set({ receiverDevice: device }),
      setFiles: (files) => set({ files }),
      setSelectedFiles: (files) => set({ selectedFiles: files }),
      addSelectedFile: (file) =>
        set((state) => ({
          selectedFiles: [...state.selectedFiles, file],
        })),
      removeSelectedFile: (index) =>
        set((state) => ({
          selectedFiles: state.selectedFiles.filter((_, i) => i !== index),
        })),
      setStatus: (status) => set({ status }),
      setError: (error) => set({ error, status: error ? 'error' : 'idle' }),
      reset: () => set(initialState),
    }),
    { name: 'session-store' },
  ),
);
