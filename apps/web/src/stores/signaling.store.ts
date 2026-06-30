import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { WebRtcState } from '@p2p-share/shared-types';

export type SocketStatus = 'connected' | 'disconnected' | 'reconnecting';
export type PeerStatus = 'online' | 'offline';

interface SignalingState {
  socketStatus: SocketStatus;
  peerStatus: PeerStatus;
  connectionState: WebRtcState;
  offer: RTCSessionDescriptionInit | null;
  answer: RTCSessionDescriptionInit | null;
  iceCandidates: RTCIceCandidateInit[];
  error: string | null;

  setSocketStatus: (status: SocketStatus) => void;
  setPeerStatus: (status: PeerStatus) => void;
  setConnectionState: (state: WebRtcState) => void;
  setOffer: (offer: RTCSessionDescriptionInit | null) => void;
  setAnswer: (answer: RTCSessionDescriptionInit | null) => void;
  addIceCandidate: (candidate: RTCIceCandidateInit) => void;
  clearIceCandidates: () => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState = {
  socketStatus: 'disconnected' as SocketStatus,
  peerStatus: 'offline' as PeerStatus,
  connectionState: WebRtcState.WAITING,
  offer: null,
  answer: null,
  iceCandidates: [],
  error: null,
};

export const useSignalingStore = create<SignalingState>()(
  devtools(
    (set) => ({
      ...initialState,

      setSocketStatus: (status) => set({ socketStatus: status }),
      setPeerStatus: (status) => set({ peerStatus: status }),
      setConnectionState: (state) => set({ connectionState: state }),
      setOffer: (offer) => set({ offer }),
      setAnswer: (answer) => set({ answer }),
      addIceCandidate: (candidate) =>
        set((state) => ({
          iceCandidates: [...state.iceCandidates, candidate],
        })),
      clearIceCandidates: () => set({ iceCandidates: [] }),
      setError: (error) => set({ error }),
      reset: () => set(initialState),
    }),
    { name: 'signaling-store' },
  ),
);
