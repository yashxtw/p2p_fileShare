'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useSession, useSessionStatus } from '@/hooks/use-session';
import { useWebRtcSession } from '@/hooks/use-webrtc-session';
import { useTransfer } from '@/hooks/use-transfer';
import { TransferState } from '@p2p-share/shared-types';

export default function ReceivePage() {
  const {
    currentSession,
    senderDevice,
    status,
    error: restError,
    joinSession,
    reset: restReset,
  } = useSession();

  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // WebRTC Handshake
  const webrtc = useWebRtcSession(currentSession ? 'receiver' : null);

  // File Transfer Engine
  const {
    queue,
    transferState,
    speed,
    eta,
    totalProgress,
    cancelActiveTransfer,
    formatSpeed,
    formatETA,
  } = useTransfer();

  // Poll session status once joined (REST fallback)
  const { data: sessionDetail } = useSessionStatus(
    currentSession?.id ?? null,
  );

  // Auto-focus the first input on mount
  useEffect(() => {
    if (!currentSession) {
      inputRefs.current[0]?.focus();
    }
  }, [currentSession]);

  const handleDigitChange = useCallback(
    (index: number, value: string) => {
      const digit = value.replace(/\D/g, '').slice(-1);
      const newDigits = [...digits];
      newDigits[index] = digit;
      setDigits(newDigits);

      if (digit && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
    },
    [digits],
  );

  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent) => {
      if (e.key === 'Backspace' && !digits[index] && index > 0) {
        const newDigits = [...digits];
        newDigits[index - 1] = '';
        setDigits(newDigits);
        inputRefs.current[index - 1]?.focus();
      }
    },
    [digits],
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      e.preventDefault();
      const pasted = e.clipboardData
        .getData('text')
        .replace(/\D/g, '')
        .slice(0, 6);
      if (pasted.length === 0) return;

      const newDigits = [...digits];
      for (let i = 0; i < pasted.length; i++) {
        newDigits[i] = pasted[i];
      }
      setDigits(newDigits);

      const nextEmpty = newDigits.findIndex((d) => !d);
      const focusIndex = nextEmpty === -1 ? 5 : nextEmpty;
      inputRefs.current[focusIndex]?.focus();
    },
    [digits],
  );

  const code = digits.join('');
  const isCodeComplete = code.length === 6;

  const handleJoin = useCallback(async () => {
    if (!isCodeComplete) return;
    try {
      await joinSession(code);
    } catch {
      // Error already set in store
    }
  }, [isCodeComplete, code, joinSession]);

  const handleReset = () => {
    setDigits(['', '', '', '', '', '']);
    restReset();
    webrtc.cleanup();
  };

  const liveStatus = sessionDetail?.session?.status ?? currentSession?.status;

  return (
    <main className="min-h-screen bg-black text-white relative overflow-hidden selection:bg-white selection:text-black flex flex-col">
      {/* Corner brackets */}
      <div className="absolute top-6 left-6 w-8 h-8 border-l border-t border-white/30" />
      <div className="absolute top-6 right-6 w-8 h-8 border-r border-t border-white/30" />
      <div className="absolute bottom-6 left-6 w-8 h-8 border-l border-b border-white/30" />
      <div className="absolute bottom-6 right-6 w-8 h-8 border-r border-b border-white/30" />

      {/* Subtle grid background */}
      <div
        className="absolute inset-0 opacity-[0.025] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between px-8 md:px-16 pt-8 text-xs font-mono tracking-widest text-gray-500 shrink-0">
        <Link
          href="/"
          onClick={handleReset}
          className="flex items-center gap-2 hover:text-white transition-colors"
        >
          ← P2P/FILESHARE
        </Link>
        <span className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          RECEIVE
        </span>
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-2xl">
          {/* Header */}
          <div className="mb-10 text-center">
            <h1 className="font-bold tracking-tighter leading-[0.9] text-[clamp(2.5rem,7vw,4.5rem)] mb-4">
              JOIN<span className="text-transparent [-webkit-text-stroke:1.5px_white]">.</span>
            </h1>
            <p className="text-gray-400">
              Enter the 6-digit code from the sender to connect.
            </p>
          </div>

          {/* Pre-join: Code Input */}
          {!currentSession && (
            <div className="space-y-8">
              {/* Code input */}
              <div className="flex justify-center gap-2">
                {digits.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => { inputRefs.current[index] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={index === 0 ? handlePaste : undefined}
                    className={`
                      w-14 h-16 text-center text-2xl font-mono font-bold
                      border bg-white/[0.03] outline-none transition-all duration-200
                      ${digit
                        ? 'border-white text-white font-semibold'
                        : 'border-white/15 text-gray-400'
                      }
                      focus:border-white focus:bg-white/[0.06]
                    `}
                    aria-label={`Digit ${index + 1}`}
                  />
                ))}
              </div>

              {/* Join button — ticket style */}
              <button
                id="btn-join-session"
                onClick={handleJoin}
                disabled={!isCodeComplete || status === 'joining'}
                className={`
                  w-full py-5 font-bold text-sm tracking-widest uppercase transition-all duration-300
                  ${!isCodeComplete || status === 'joining'
                    ? 'bg-white/10 text-gray-500 cursor-not-allowed'
                    : 'bg-white text-black hover:bg-gray-200'
                  }
                `}
              >
                {status === 'joining' ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
                    Joining session...
                  </span>
                ) : (
                  'Join Session →'
                )}
              </button>

              <p className="text-center text-xs font-mono uppercase tracking-widest text-gray-600">
                Ask the sender for their 6-digit code to start the handshake
              </p>
            </div>
          )}

          {/* Post-join: Session / Transfer Dashboard */}
          {currentSession && (
            <div className="space-y-8">
              {webrtc.peerConnectionState === 'connected' ? (
                // ─── PeerConnection Established: Render Receiver Dashboard ───
                <div className="border border-white/15 p-6 space-y-6">
                  <div className="flex justify-between items-center border-b border-white/10 pb-4">
                    <h3 className="text-sm font-bold font-mono tracking-widest uppercase">Receiving Queue</h3>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-mono uppercase bg-white text-black">
                      Connected
                    </div>
                  </div>

                  {/* Queue list */}
                  {queue.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center font-mono py-8 tracking-wide">
                      Awaiting incoming file metadata...
                    </p>
                  ) : (
                    <div className="space-y-3 max-h-60 overflow-y-auto">
                      {queue.map((file) => (
                        <div
                          key={file.id}
                          className="px-4 py-3 bg-white/[0.01] border border-white/5 space-y-2"
                        >
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-300 truncate max-w-xs">{file.name}</span>
                            <span className="text-xs text-gray-500 font-mono">{file.status}</span>
                          </div>
                          {/* Individual Progress Bar */}
                          <div className="w-full bg-white/5 h-1.5 overflow-hidden">
                            <div
                              className="bg-white h-1.5 transition-all duration-300"
                              style={{ width: `${(file.progressBytes / file.size) * 100}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Stats block — numbered editorial style */}
                  {transferState === TransferState.TRANSFERRING && queue.length > 0 && (
                    <div className="grid grid-cols-3 border-t border-white/15 pt-4">
                      {[
                        { n: '01', label: 'Speed', value: formatSpeed(speed) },
                        { n: '02', label: 'ETA', value: formatETA(eta) },
                        { n: '03', label: 'Total', value: `${totalProgress}%` },
                      ].map((stat) => (
                        <div key={stat.label} className="text-center border-r border-white/10 last:border-r-0">
                          <p className="text-xs font-mono text-gray-600 mb-1">{stat.n}</p>
                          <p className="text-lg font-bold font-mono text-white">{stat.value}</p>
                          <p className="text-xs text-gray-500 mt-1 uppercase tracking-wide">{stat.label}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Receiver Control Actions */}
                  {transferState === TransferState.TRANSFERRING && (
                    <div className="border-t border-white/10 pt-4">
                      <button
                        onClick={cancelActiveTransfer}
                        className="w-full py-4 border border-white/20 text-gray-400 font-bold text-sm tracking-widest uppercase hover:text-white hover:bg-white/5 transition-all"
                      >
                        Cancel Transfer
                      </button>
                    </div>
                  )}

                  {transferState === TransferState.COMPLETED && (
                    <div className="border-t border-white/10 pt-4">
                      <button
                        onClick={handleReset}
                        className="w-full py-4 bg-white text-black font-bold text-sm tracking-widest uppercase hover:bg-gray-200 transition-all"
                      >
                        Done / Exit Session
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                // ─── PeerConnection Handshake: Render Connected Room State ───
                <>
                  <div className="flex items-center justify-center">
                    <div
                      className={`
                        inline-flex items-center gap-2 px-4 py-1.5 text-xs font-mono uppercase tracking-widest
                        ${liveStatus === 'JOINED' || webrtc.peerConnectionState === 'connecting'
                          ? 'border border-white text-white'
                          : 'border border-white/20 text-gray-300'
                        }
                      `}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                      {webrtc.peerConnectionState === 'connecting'
                        ? 'Negotiating peer connection...'
                        : 'Handshaking with sender...'}
                    </div>
                  </div>

                  <div className="p-6 border border-white/15 bg-white/[0.02]">
                    <div className="text-center">
                      <div className="text-4xl mb-3 grayscale">🔗</div>
                      <h3 className="text-lg font-semibold text-white mb-1">
                        Session Joined
                      </h3>
                      <p className="text-sm text-gray-500 font-mono tracking-wide">
                        Establishing direct browser-to-browser tunnel...
                      </p>
                    </div>

                    <div className="mt-6 grid grid-cols-2 border-t border-white/10">
                      <div className="px-3 py-5 border-r border-white/10">
                        <p className="text-xs text-gray-600 mb-1 font-mono uppercase tracking-widest">Sender</p>
                        <p className="text-sm text-gray-300 truncate">
                          {sessionDetail?.senderDevice?.deviceName ??
                            senderDevice?.deviceName ??
                            'Unknown'}
                        </p>
                      </div>
                      <div className="px-3 py-5">
                        <p className="text-xs text-gray-600 mb-1 font-mono uppercase tracking-widest">Status</p>
                        <p className="text-sm text-gray-300 font-mono">{webrtc.peerConnectionState.toUpperCase()}</p>
                      </div>
                    </div>
                  </div>

                  {/* Cancel/Leave button */}
                  <button
                    onClick={handleReset}
                    className="w-full py-4 border border-white/15 bg-white/[0.03] text-gray-400 font-bold text-sm tracking-widest uppercase hover:text-white hover:bg-white/[0.06] hover:border-white/30 transition-all duration-300"
                  >
                    Cancel Connection
                  </button>
                </>
              )}
            </div>
          )}

          {/* Error display */}
          {(restError || webrtc.error) && (
            <div className="mt-6 p-4 border border-white/30 text-white text-sm font-mono">
              {restError || webrtc.error}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="relative z-10 flex items-center justify-between px-8 md:px-16 pb-8 text-[10px] text-gray-600 font-mono tracking-widest shrink-0">
        <span>WEBRTC · NESTJS</span>
        <span>© 2026</span>
      </div>
    </main>
  );
}
