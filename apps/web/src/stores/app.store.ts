import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
/** Application-wide state */
interface AppState {
  /** Whether the app has been initialized */
  isInitialized: boolean;
  /** Currently connected peer count */
  connectedPeers: number;
  /** Current room code, if in a room */
  roomCode: string | null;
  /** Actions */
  setInitialized: (initialized: boolean) => void;
  setConnectedPeers: (count: number) => void;
  setRoomCode: (code: string | null) => void;
  reset: () => void;
}
const initialState = {
  isInitialized: false,
  connectedPeers: 0,
  roomCode: null,
};
export const useAppStore = create<AppState>()(
  devtools(
    (set) => ({
      ...initialState,
      setInitialized: (initialized) => set({ isInitialized: initialized }),
      setConnectedPeers: (count) => set({ connectedPeers: count }),
      setRoomCode: (code) => set({ roomCode: code }),
      reset: () => set(initialState),
    }),
    { name: 'app-store' },
  ),
);