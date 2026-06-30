'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useSession } from '@/hooks/use-session';
import { useSignaling } from '@/hooks/use-signaling';
import { WebRtcState } from '@p2p-share/shared-types';

export default function WebRtcTestPage() {
  const {
    currentSession,
    sessionCode: restSessionCode,
    createSession: restCreateSession,
    joinSession: restJoinSession,
    status: restStatus,
    error: restError,
    reset: restReset,
  } = useSession();

  const [inputCode, setInputCode] = useState('');
  const [role, setRole] = useState<'sender' | 'receiver' | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [rtcConnectionState, setRtcConnectionState] = useState<string>('new');
  const [iceGatheringState, setIceGatheringState] = useState<string>('new');
  const [signalingState, setSignalingState] = useState<string>('stable');

  // WebSocket signaling channel hook
  const sessionId = currentSession?.id ?? null;
  const signaling = useSignaling(sessionId);

  const pcRef = useRef<RTCPeerConnection | null>(null);

  const log = useCallback((message: string) => {
    setLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${message}`, ...prev.slice(0, 49)]);
  }, []);

  // WebRTC ICE configuration (public stun servers)
  const rtcConfig = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  };

  /** Create RTCPeerConnection and bind listeners */
  const initPeerConnection = useCallback(() => {
    if (pcRef.current) return pcRef.current;

    log('Initializing RTCPeerConnection...');
    const pc = new RTCPeerConnection(rtcConfig);
    pcRef.current = pc;

    // Monitor connection states
    pc.onconnectionstatechange = () => {
      setRtcConnectionState(pc.connectionState);
      log(`RTCPeerConnection connectionState: ${pc.connectionState}`);
    };

    pc.onicegatheringstatechange = () => {
      setIceGatheringState(pc.iceGatheringState);
      log(`RTCPeerConnection iceGatheringState: ${pc.iceGatheringState}`);
    };

    pc.onsignalingstatechange = () => {
      setSignalingState(pc.signalingState);
      log(`RTCPeerConnection signalingState: ${pc.signalingState}`);
    };

    // Relay generated local ICE candidate immediately (Trickle ICE)
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        log(`Local ICE candidate generated: ${event.candidate.candidate.substring(0, 40)}...`);
        signaling.sendIceCandidate(event.candidate.toJSON());
      }
    };

    return pc;
  }, [signaling, log]);

  // Handle incoming SDP Offer
  useEffect(() => {
    if (signaling.offer && role === 'receiver') {
      log('SDP Offer received from signaling server!');
      const pc = initPeerConnection();
      
      pc.setRemoteDescription(new RTCSessionDescription(signaling.offer))
        .then(() => {
          log('Remote SDP Offer set successfully.');
        })
        .catch((err) => log(`Failed to set Remote Offer Description: ${err.message}`));
    }
  }, [signaling.offer, role, initPeerConnection, log]);

  // Handle incoming SDP Answer
  useEffect(() => {
    if (signaling.answer && role === 'sender') {
      log('SDP Answer received from signaling server!');
      const pc = pcRef.current;
      if (pc) {
        pc.setRemoteDescription(new RTCSessionDescription(signaling.answer))
          .then(() => {
            log('Remote SDP Answer set successfully.');
          })
          .catch((err) => log(`Failed to set Remote Answer Description: ${err.message}`));
      }
    }
  }, [signaling.answer, role, log]);

  // Process trickled Remote ICE Candidates
  useEffect(() => {
    if (signaling.iceCandidates.length > 0) {
      const pc = pcRef.current;
      if (pc && pc.remoteDescription) {
        signaling.iceCandidates.forEach((candidateInit) => {
          pc.addIceCandidate(new RTCIceCandidate(candidateInit))
            .then(() => log(`Remote ICE Candidate added successfully`))
            .catch((err) => log(`Failed to add Remote ICE Candidate: ${err.message}`));
        });
        signaling.clearIceCandidates();
      }
    }
  }, [signaling.iceCandidates, log, signaling]);

  // Sender: Create and send SDP Offer
  const makeOffer = async () => {
    const pc = initPeerConnection();
    try {
      log('Creating SDP Offer...');
      // Request offer to receive video to generate candidate sdp without real tracks
      const offer = await pc.createOffer({ offerToReceiveVideo: true });
      await pc.setLocalDescription(offer);
      log('Local SDP Offer description set.');
      signaling.sendOffer(offer);
      log('SDP Offer sent to signaling gateway.');
    } catch (err: any) {
      log(`Offer generation failed: ${err.message}`);
    }
  };

  // Receiver: Create and send SDP Answer
  const makeAnswer = async () => {
    const pc = pcRef.current;
    if (!pc) {
      log('Error: RTCPeerConnection not initialized.');
      return;
    }
    try {
      log('Creating SDP Answer...');
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      log('Local SDP Answer description set.');
      signaling.sendAnswer(answer);
      log('SDP Answer sent to signaling gateway.');
    } catch (err: any) {
      log(`Answer generation failed: ${err.message}`);
    }
  };

  const handleStartSender = async () => {
    setRole('sender');
    log('REST: Creating session...');
    try {
      await restCreateSession([]);
      log('REST: Session created successfully.');
    } catch (err: any) {
      log(`REST: Session creation failed: ${err.message}`);
    }
  };

  const handleStartReceiver = async () => {
    if (!inputCode) return;
    setRole('receiver');
    log(`REST: Joining session ${inputCode}...`);
    try {
      await restJoinSession(inputCode);
      log('REST: Session joined successfully.');
    } catch (err: any) {
      log(`REST: Session join failed: ${err.message}`);
    }
  };

  const handleReset = () => {
    log('Resetting states...');
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    signaling.leaveSession();
    restReset();
    setRole(null);
    setInputCode('');
    setRtcConnectionState('new');
    setIceGatheringState('new');
    setSignalingState('stable');
    setLogs([]);
  };

  return (
    <main className="min-h-screen bg-black text-white relative overflow-hidden font-sans">
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />

      <div className="relative z-10 max-w-4xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center border-b border-white/10 pb-6">
          <div>
            <Link href="/" className="text-sm text-gray-500 hover:text-white transition-colors">
              ← Back
            </Link>
            <h1 className="text-3xl font-bold tracking-tight mt-2 font-mono">WEBRTC SIGNALING TESTER</h1>
            <p className="text-sm text-gray-400">Debug real-time Socket.IO SDP/ICE negotiation.</p>
          </div>
          <button
            onClick={handleReset}
            className="px-4 py-2 border border-white/15 hover:bg-white/10 hover:border-white/30 rounded-lg text-sm transition-all"
          >
            Reset Test
          </button>
        </div>

        {/* Setup Role / Connection */}
        {!role ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            {/* Sender panel */}
            <div className="border border-white/10 p-6 rounded-2xl bg-white/[0.02]">
              <h3 className="text-lg font-semibold mb-3 font-mono">1. SENDER MODE</h3>
              <p className="text-sm text-gray-400 mb-6">Create a transfer session, get a code, and await pairing.</p>
              <button
                onClick={handleStartSender}
                className="w-full py-3 bg-white text-black hover:bg-gray-200 font-semibold rounded-lg transition-all"
              >
                Create Room (Sender)
              </button>
            </div>

            {/* Receiver panel */}
            <div className="border border-white/10 p-6 rounded-2xl bg-white/[0.02]">
              <h3 className="text-lg font-semibold mb-3 font-mono">2. RECEIVER MODE</h3>
              <p className="text-sm text-gray-400 mb-4">Enter the code from the sender to connect.</p>
              <input
                type="text"
                maxLength={6}
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                placeholder="Enter 6-digit code"
                className="w-full py-3 px-4 bg-white/5 border border-white/15 rounded-lg text-center font-mono text-xl tracking-widest focus:outline-none focus:border-white mb-4"
              />
              <button
                onClick={handleStartReceiver}
                disabled={inputCode.length !== 6}
                className="w-full py-3 border border-white/15 hover:bg-white/10 text-white font-semibold rounded-lg transition-all disabled:opacity-50"
              >
                Join Room (Receiver)
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Connection Information */}
            <div className="lg:col-span-2 space-y-6">
              {/* Session State */}
              <div className="border border-white/10 p-6 rounded-2xl bg-white/[0.02] space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs uppercase text-gray-500 font-mono">Role</span>
                  <span className="px-2.5 py-1 rounded text-xs font-mono font-bold uppercase bg-white text-black">
                    {role}
                  </span>
                </div>

                {restSessionCode && (
                  <div className="flex justify-between items-center border-t border-white/5 pt-3">
                    <span className="text-xs uppercase text-gray-500 font-mono">Session Code</span>
                    <span className="text-xl font-mono font-bold text-white">{restSessionCode}</span>
                  </div>
                )}

                <div className="flex justify-between items-center border-t border-white/5 pt-3">
                  <span className="text-xs uppercase text-gray-500 font-mono">WebSocket Status</span>
                  <span className="text-sm font-mono text-white">{signaling.socketStatus.toUpperCase()}</span>
                </div>

                <div className="flex justify-between items-center border-t border-white/5 pt-3">
                  <span className="text-xs uppercase text-gray-500 font-mono">Signaling Room State</span>
                  <span className="text-sm font-mono text-white font-semibold">{signaling.connectionState}</span>
                </div>

                <div className="flex justify-between items-center border-t border-white/5 pt-3">
                  <span className="text-xs uppercase text-gray-500 font-mono">Peer Status</span>
                  <span className="text-sm font-mono text-white">{signaling.peerStatus.toUpperCase()}</span>
                </div>
              </div>

              {/* WebRTC Interactive Actions */}
              <div className="border border-white/10 p-6 rounded-2xl bg-white/[0.02] space-y-4">
                <h3 className="text-md font-semibold font-mono">WEBRTC ACTIONS</h3>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={makeOffer}
                    disabled={role !== 'sender' || signaling.connectionState === WebRtcState.WAITING}
                    className="py-3 bg-white text-black font-semibold rounded-lg transition-all text-sm disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    1. Create & Send Offer
                  </button>
                  <button
                    onClick={makeAnswer}
                    disabled={role !== 'receiver' || !signaling.offer}
                    className="py-3 bg-white text-black font-semibold rounded-lg transition-all text-sm disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    2. Create & Send Answer
                  </button>
                </div>
              </div>
            </div>

            {/* Live WebRTC PeerConnection States */}
            <div className="border border-white/10 p-6 rounded-2xl bg-white/[0.02] space-y-4">
              <h3 className="text-md font-semibold font-mono">PEERCONNECTION STATES</h3>

              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-500 uppercase font-mono">Connection State</p>
                  <p className={`text-lg font-bold font-mono mt-1 ${
                    rtcConnectionState === 'connected' ? 'text-green-400' : 'text-white'
                  }`}>{rtcConnectionState.toUpperCase()}</p>
                </div>
                
                <div className="border-t border-white/5 pt-3">
                  <p className="text-xs text-gray-500 uppercase font-mono">ICE Gathering</p>
                  <p className="text-sm font-semibold font-mono text-white mt-1">{iceGatheringState.toUpperCase()}</p>
                </div>

                <div className="border-t border-white/5 pt-3">
                  <p className="text-xs text-gray-500 uppercase font-mono">Signaling State</p>
                  <p className="text-sm font-semibold font-mono text-white mt-1">{signalingState.toUpperCase()}</p>
                </div>

                <div className="border-t border-white/5 pt-3">
                  <p className="text-xs text-gray-500 uppercase font-mono">ICE Candidates Received</p>
                  <p className="text-sm font-semibold font-mono text-white mt-1">{signaling.iceCandidates.length}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Logs */}
        <div className="border border-white/10 p-6 rounded-2xl bg-white/[0.01]">
          <h3 className="text-md font-semibold mb-3 font-mono">LOG CONSOLE</h3>
          <div className="bg-black border border-white/10 rounded-lg p-4 h-64 overflow-y-auto font-mono text-xs text-gray-400 space-y-1">
            {logs.length === 0 ? (
              <p className="text-gray-600">Console is empty. Actions will be logged here.</p>
            ) : (
              logs.map((log, index) => <p key={index}>{log}</p>)
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
