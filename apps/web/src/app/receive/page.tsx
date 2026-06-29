'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useSession, useSessionStatus } from '@/hooks/use-session';

export default function ReceivePage() {
  const {
    currentSession,
    senderDevice,
    status,
    error,
    joinSession,
    reset,
  } = useSession();

  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Poll session status once joined
  const { data: sessionDetail } = useSessionStatus(
    currentSession?.id ?? null,
  );

  // Auto-focus the first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleDigitChange = useCallback(
    (index: number, value: string) => {
      // Only accept digits
      const digit = value.replace(/\D/g, '').slice(-1);
      const newDigits = [...digits];
      newDigits[index] = digit;
      setDigits(newDigits);

      // Auto-advance to next input
      if (digit && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
    },
    [digits],
  );

  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent) => {
      // Backspace: clear current and go back
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

      // Focus the next empty input or last
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

  const liveStatus = sessionDetail?.session?.status ?? currentSession?.status;

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 right-1/3 w-[500px] h-[500px] bg-purple-500/8 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] bg-blue-500/8 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-10">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-300 transition-colors mb-6"
          >
            ← Back
          </Link>
          <h1 className="text-4xl font-bold tracking-tight">
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Receive Files
            </span>
          </h1>
          <p className="text-gray-400 mt-2">
            Enter the 6-digit code from the sender to connect.
          </p>
        </div>

        {/* Pre-join: Code Input */}
        {!currentSession && (
          <div className="space-y-8">
            {/* Code input */}
            <div className="flex justify-center gap-3">
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
                    w-14 h-16 text-center text-2xl font-mono font-bold rounded-xl
                    border-2 bg-white/[0.03] outline-none transition-all duration-200
                    ${digit
                      ? 'border-blue-500/40 text-white'
                      : 'border-white/10 text-gray-400'
                    }
                    focus:border-blue-400 focus:bg-white/[0.06] focus:ring-2 focus:ring-blue-500/20
                  `}
                  aria-label={`Digit ${index + 1}`}
                />
              ))}
            </div>

            {/* Join button */}
            <button
              id="btn-join-session"
              onClick={handleJoin}
              disabled={!isCodeComplete || status === 'joining'}
              className={`
                w-full py-4 rounded-xl font-semibold text-lg transition-all duration-300
                ${!isCodeComplete || status === 'joining'
                  ? 'bg-gray-700/50 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 hover:scale-[1.01] active:scale-[0.99]'
                }
              `}
            >
              {status === 'joining' ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                  Joining session...
                </span>
              ) : (
                'Join Session'
              )}
            </button>

            <p className="text-center text-sm text-gray-500">
              Ask the sender for their 6-digit code, or scan their QR code.
            </p>
          </div>
        )}

        {/* Post-join: Session Info */}
        {currentSession && (
          <div className="space-y-8">
            {/* Success status */}
            <div className="flex items-center justify-center">
              <div
                className={`
                  inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm
                  ${liveStatus === 'JOINED'
                    ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                    : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                  }
                `}
              >
                <span className="w-2 h-2 rounded-full bg-green-400" />
                {liveStatus === 'JOINED'
                  ? 'Connected to sender!'
                  : liveStatus}
              </div>
            </div>

            {/* Connected device info */}
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5">
              <div className="text-center">
                <div className="text-4xl mb-3">🔗</div>
                <h3 className="text-lg font-semibold text-white mb-1">
                  Session Joined
                </h3>
                <p className="text-sm text-gray-400">
                  Ready for file transfer (Phase 3)
                </p>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <p className="text-xs text-gray-500 mb-1">Sender</p>
                  <p className="text-sm text-gray-300">
                    {sessionDetail?.senderDevice?.deviceName ??
                      senderDevice?.deviceName ??
                      'Unknown'}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <p className="text-xs text-gray-500 mb-1">Status</p>
                  <p className="text-sm text-gray-300">{liveStatus}</p>
                </div>
              </div>

              {/* Files list */}
              {sessionDetail?.files && sessionDetail.files.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs text-gray-500 mb-2">
                    Files to receive
                  </p>
                  <div className="space-y-2">
                    {sessionDetail.files.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.02] border border-white/5"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-sm">📄</span>
                          <span className="text-sm text-gray-300 truncate">
                            {file.fileName}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500 shrink-0 ml-2">
                          {file.fileSize < 1024 * 1024
                            ? `${(file.fileSize / 1024).toFixed(1)} KB`
                            : `${(file.fileSize / (1024 * 1024)).toFixed(1)} MB`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Leave button */}
            <button
              onClick={reset}
              className="w-full py-3 rounded-xl border border-white/10 bg-white/[0.03] text-gray-400 hover:text-white hover:bg-white/[0.06] transition-all duration-300"
            >
              Leave Session
            </button>
          </div>
        )}

        {/* Error display */}
        {error && (
          <div className="mt-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}
      </div>
    </main>
  );
}
