'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useSession } from './use-session';
import { useSignaling } from './use-signaling';
import { useTransfer } from './use-transfer';
import { WebRtcState } from '@p2p-share/shared-types';

const rtcConfig = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export function useWebRtcSession(role: 'sender' | 'receiver' | null) {
  const { currentSession } = useSession();
  const sessionId = currentSession?.id ?? null;

  const signaling = useSignaling(sessionId);
  const { initializeTransferManager, terminateTransferSession } = useTransfer();

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const [peerConnectionState, setPeerConnectionState] = useState<RTCPeerConnectionState>('new');

  const cleanup = useCallback(() => {
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    setPeerConnectionState('new');
    terminateTransferSession();
  }, [terminateTransferSession]);

  /** Initialize peer connection and bind common events */
  const initPeerConnection = useCallback(() => {
    if (pcRef.current) return pcRef.current;

    const pc = new RTCPeerConnection(rtcConfig);
    pcRef.current = pc;

    pc.onconnectionstatechange = () => {
      setPeerConnectionState(pc.connectionState);
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        cleanup();
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        signaling.sendIceCandidate(event.candidate.toJSON());
      }
    };

    return pc;
  }, [signaling, cleanup]);

  // SENDER FLOW: Automatically start connection handshake once receiver joins Socket room
  useEffect(() => {
    if (role !== 'sender' || !sessionId || signaling.connectionState !== WebRtcState.PAIRING) return;
    if (pcRef.current) return; // Already negotiating

    const pc = initPeerConnection();

    // Create the transfer DataChannel
    const channel = pc.createDataChannel('file-transfer', {
      ordered: true,
    });

    channel.onopen = () => {
      initializeTransferManager(channel);
    };

    channel.onclose = () => {
      cleanup();
    };

    // Generate Offer
    pc.createOffer({ offerToReceiveVideo: true })
      .then((offer) => pc.setLocalDescription(offer))
      .then(() => {
        if (pc.localDescription) {
          signaling.sendOffer(pc.localDescription);
        }
      })
      .catch(cleanup);
  }, [role, sessionId, signaling.connectionState, initPeerConnection, initializeTransferManager, cleanup]);

  // RECEIVER FLOW: Automatically respond to SDP Offer
  useEffect(() => {
    if (role !== 'receiver' || !sessionId || !signaling.offer) return;
    if (pcRef.current) return; // Already negotiating

    const pc = initPeerConnection();

    // Catch the incoming DataChannel
    pc.ondatachannel = (event) => {
      const channel = event.channel;
      channel.onopen = () => {
        initializeTransferManager(channel);
      };
      channel.onclose = () => {
        cleanup();
      };
    };

    // Set Remote Offer and generate Answer
    pc.setRemoteDescription(new RTCSessionDescription(signaling.offer))
      .then(() => pc.createAnswer())
      .then((answer) => pc.setLocalDescription(answer))
      .then(() => {
        if (pc.localDescription) {
          signaling.sendAnswer(pc.localDescription);
        }
      })
      .catch(cleanup);
  }, [role, sessionId, signaling.offer, initPeerConnection, initializeTransferManager, cleanup]);

  // SENDER FLOW: Automatically set remote answer once received
  useEffect(() => {
    if (role !== 'sender' || !sessionId || !signaling.answer) return;
    const pc = pcRef.current;
    if (pc && !pc.remoteDescription) {
      pc.setRemoteDescription(new RTCSessionDescription(signaling.answer))
        .catch(cleanup);
    }
  }, [role, sessionId, signaling.answer, cleanup]);

  // BOTH: Process trickled ICE candidates from signaling server
  useEffect(() => {
    if (signaling.iceCandidates.length > 0) {
      const pc = pcRef.current;
      if (pc && pc.remoteDescription) {
        signaling.iceCandidates.forEach((candidateInit) => {
          pc.addIceCandidate(new RTCIceCandidate(candidateInit)).catch(() => {});
        });
        signaling.clearIceCandidates();
      }
    }
  }, [signaling.iceCandidates, peerConnectionState, signaling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  return {
    peerConnectionState,
    signalingState: signaling.connectionState,
    socketStatus: signaling.socketStatus,
    peerStatus: signaling.peerStatus,
    error: signaling.error,
    cleanup,
  };
}
