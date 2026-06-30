'use client';

import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { WsEvent, WebRtcState } from '@p2p-share/shared-types';
import { useSignalingStore } from '@/stores/signaling.store';
import { useDevice } from './use-device';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export function useSignaling(sessionId: string | null) {
  const store = useSignalingStore();
  const { deviceInfo, isReady: isDeviceReady } = useDevice();
  const socketRef = useRef<Socket | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize socket connection
  useEffect(() => {
    if (!sessionId || !isDeviceReady || !deviceInfo.fingerprint) return;

    // Connect to WebSocket gateway
    const socket = io(API_BASE_URL, {
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      store.setSocketStatus('connected');
      store.setError(null);
      // Automatically join session room upon connection
      socket.emit(WsEvent.SESSION_JOIN, {
        sessionId,
        deviceId: deviceInfo.fingerprint,
      });
    });

    socket.on('disconnect', () => {
      store.setSocketStatus('disconnected');
    });

    socket.on('connect_error', (error) => {
      store.setError(error.message);
      store.setSocketStatus('disconnected');
    });

    // Server signaling callbacks
    socket.on(WsEvent.SESSION_CREATED, () => {
      store.setConnectionState(WebRtcState.WAITING);
    });

    socket.on(WsEvent.PEER_JOINED, (data: { senderDeviceId: string; receiverDeviceId: string }) => {
      store.setPeerStatus('online');
      store.setConnectionState(WebRtcState.PAIRING);
    });

    socket.on(WsEvent.OFFER_RECEIVED, (data: { offer: RTCSessionDescriptionInit }) => {
      store.setOffer(data.offer);
      store.setConnectionState(WebRtcState.NEGOTIATING);
    });

    socket.on(WsEvent.ANSWER_RECEIVED, (data: { answer: RTCSessionDescriptionInit }) => {
      store.setAnswer(data.answer);
      store.setConnectionState(WebRtcState.CONNECTED);
    });

    socket.on(WsEvent.ICE_CANDIDATE_RECEIVED, (data: { candidate: RTCIceCandidateInit }) => {
      store.addIceCandidate(data.candidate);
    });

    socket.on(WsEvent.PEER_CONNECTED, () => {
      store.setConnectionState(WebRtcState.CONNECTED);
      store.setPeerStatus('online');
    });

    socket.on(WsEvent.PEER_DISCONNECTED, () => {
      store.setPeerStatus('offline');
      store.setConnectionState(WebRtcState.DISCONNECTED);
    });

    socket.on(WsEvent.ERROR, (err: { message: string; code: string }) => {
      store.setError(err.message);
    });

    socket.on(WsEvent.HEARTBEAT_ACK, () => {
      // heartbeat successfully processed by server
    });

    // Start 20s client heartbeat updates
    heartbeatIntervalRef.current = setInterval(() => {
      if (socket.connected) {
        socket.emit(WsEvent.HEARTBEAT, { deviceId: deviceInfo.fingerprint });
      }
    }, 20000);

    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      socket.disconnect();
      socketRef.current = null;
      store.reset();
    };
  }, [sessionId, isDeviceReady, deviceInfo.fingerprint]);

  /** Emit WebRTC Offer */
  const sendOffer = useCallback(
    (offer: RTCSessionDescriptionInit) => {
      if (!socketRef.current || !sessionId || !deviceInfo.fingerprint) return;
      socketRef.current.emit(WsEvent.SIGNAL_OFFER, {
        sessionId,
        offer,
        senderDeviceId: deviceInfo.fingerprint,
      });
      store.setConnectionState(WebRtcState.NEGOTIATING);
    },
    [sessionId, deviceInfo.fingerprint],
  );

  /** Emit WebRTC Answer */
  const sendAnswer = useCallback(
    (answer: RTCSessionDescriptionInit) => {
      if (!socketRef.current || !sessionId || !deviceInfo.fingerprint) return;
      socketRef.current.emit(WsEvent.SIGNAL_ANSWER, {
        sessionId,
        answer,
        receiverDeviceId: deviceInfo.fingerprint,
      });
      store.setConnectionState(WebRtcState.CONNECTED);
    },
    [sessionId, deviceInfo.fingerprint],
  );

  /** Emit WebRTC ICE Candidate ( trickle ICE ) */
  const sendIceCandidate = useCallback(
    (candidate: RTCIceCandidateInit) => {
      if (!socketRef.current || !sessionId) return;
      socketRef.current.emit(WsEvent.SIGNAL_ICE, {
        sessionId,
        candidate,
      });
    },
    [sessionId],
  );

  /** Manually disconnect / leave session */
  const leaveSession = useCallback(() => {
    if (!socketRef.current || !sessionId) return;
    socketRef.current.emit(WsEvent.SESSION_LEAVE, { sessionId });
    store.reset();
  }, [sessionId]);

  return {
    ...store,
    sendOffer,
    sendAnswer,
    sendIceCandidate,
    leaveSession,
  };
}
