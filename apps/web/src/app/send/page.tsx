'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useSession } from '@/hooks/use-session';
import { useSessionStatus } from '@/hooks/use-session';
import { useWebRtcSession } from '@/hooks/use-webrtc-session';
import { useTransfer } from '@/hooks/use-transfer';
import { TransferState, TransferQueueState } from '@p2p-share/shared-types';
import type { FileMetadata } from '@p2p-share/shared-types';

export default function SendPage() {
  const {
    sessionCode,
    qrPayload,
    currentSession,
    selectedFiles,
    status,
    error: restError,
    addSelectedFile,
    removeSelectedFile,
    setSelectedFiles,
    createSession,
    reset: restReset,
  } = useSession();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [copied, setCopied] = useState(false);
  const [rawFiles, setRawFiles] = useState<File[]>([]);

  // WebRTC Handshake
  const webrtc = useWebRtcSession(currentSession ? 'sender' : null);

  // File Transfer Engine
  const {
    queue,
    transferState,
    speed,
    eta,
    totalProgress,
    queueFilesForTransfer,
    startFileTransmission,
    pauseActiveTransfer,
    resumeActiveTransfer,
    cancelActiveTransfer,
    formatSpeed,
    formatETA,
  } = useTransfer();

  // Populate queue once peer connection establishes
  useEffect(() => {
    if (webrtc.peerConnectionState === 'connected' && queue.length === 0 && rawFiles.length > 0) {
      queueFilesForTransfer(rawFiles);
    }
  }, [webrtc.peerConnectionState, queue.length, rawFiles, queueFilesForTransfer]);

  // Poll session status once created (REST fallback)
  const { data: sessionDetail } = useSessionStatus(
    currentSession?.id ?? null,
  );

  const handleFileSelect = useCallback(
    (fileList: FileList | null) => {
      if (!fileList) return;
      const filesArray = Array.from(fileList);
      setRawFiles((prev) => [...prev, ...filesArray]);
      const newFiles: FileMetadata[] = filesArray.map((f) => ({
        name: f.name,
        size: f.size,
        type: f.type || 'application/octet-stream',
        lastModified: f.lastModified,
      }));
      newFiles.forEach((f) => addSelectedFile(f));
    },
    [addSelectedFile],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      handleFileSelect(e.dataTransfer.files);
    },
    [handleFileSelect],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleCreate = useCallback(async () => {
    try {
      await createSession(selectedFiles);
    } catch {
      // Error already set in store
    }
  }, [createSession, selectedFiles]);

  const handleCopyCode = useCallback(async () => {
    if (!sessionCode) return;
    await navigator.clipboard.writeText(sessionCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [sessionCode]);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleReset = () => {
    setRawFiles([]);
    restReset();
    webrtc.cleanup();
  };

  const liveStatus = sessionDetail?.status ?? currentSession?.status;

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
          SEND
        </span>
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-2xl">
          {/* Header */}
          <div className="mb-10 text-center">
            <h1 className="font-bold tracking-tighter leading-[0.9] text-[clamp(2.5rem,7vw,4.5rem)] mb-4">
              SEND<span className="text-transparent [-webkit-text-stroke:1.5px_white]">.</span>
            </h1>
            <p className="text-gray-400">
              Select files, get a code, share it with the receiver.
            </p>
          </div>

          {/* Pre-session: File Selection */}
          {!currentSession && (
            <div className="space-y-6">
              {/* Drop zone */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`
                  relative border-2 border-dashed p-12 text-center cursor-pointer
                  transition-all duration-300
                  ${isDragOver
                    ? 'border-white bg-white/10 scale-[1.01]'
                    : 'border-white/15 bg-white/[0.02] hover:border-white/30 hover:bg-white/[0.04]'
                  }
                `}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={(e) => handleFileSelect(e.target.files)}
                  className="hidden"
                  id="file-input"
                />
                <div className="text-5xl mb-4 grayscale">
                  {isDragOver ? '📥' : '📂'}
                </div>
                <p className="text-lg text-gray-300 mb-1">
                  {isDragOver ? 'Drop files here' : 'Drag & drop files here'}
                </p>
                <p className="text-sm text-gray-500 font-mono tracking-wide">
                  OR CLICK TO BROWSE · MAX 500MB / FILE
                </p>
              </div>

              {/* Selected files list */}
              {selectedFiles.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-t border-white/10 pt-4">
                    <h3 className="text-xs font-mono uppercase tracking-widest text-gray-500">
                      {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''} selected
                    </h3>
                    <button
                      onClick={() => {
                        setSelectedFiles([]);
                        setRawFiles([]);
                      }}
                      className="text-xs font-mono uppercase tracking-widest text-gray-500 hover:text-white transition-colors"
                    >
                      Clear all
                    </button>
                  </div>

                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {selectedFiles.map((file, index) => (
                      <div
                        key={`${file.name}-${index}`}
                        className="flex items-center justify-between px-4 py-3 bg-white/[0.03] border border-white/10"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-lg grayscale">📄</span>
                          <div className="min-w-0">
                            <p className="text-sm text-gray-200 truncate">
                              {file.name}
                            </p>
                            <p className="text-xs text-gray-500 font-mono">
                              {formatFileSize(file.size)} · {file.type || 'Unknown type'}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            removeSelectedFile(index);
                            setRawFiles((prev) => prev.filter((_, i) => i !== index));
                          }}
                          className="text-gray-500 hover:text-white transition-colors ml-2 shrink-0"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Create button — ticket style */}
              <button
                id="btn-create-session"
                onClick={handleCreate}
                disabled={status === 'creating' || selectedFiles.length === 0}
                className={`
                  w-full py-5 font-bold text-sm tracking-widest uppercase transition-all duration-300
                  ${status === 'creating' || selectedFiles.length === 0
                    ? 'bg-white/10 text-gray-500 cursor-not-allowed'
                    : 'bg-white text-black hover:bg-gray-200'
                  }
                `}
              >
                {status === 'creating' ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
                    Creating session...
                  </span>
                ) : (
                  'Create Session →'
                )}
              </button>
            </div>
          )}

          {/* Post-session Handshake / Transfer Dashboard */}
          {currentSession && sessionCode && (
            <div className="space-y-8">
              {webrtc.peerConnectionState === 'connected' ? (
                // ─── PeerConnection Established: Render Transfer Engine ───
                <div className="border border-white/15 p-6 space-y-6">
                  <div className="flex justify-between items-center border-b border-white/10 pb-4">
                    <h3 className="text-sm font-bold font-mono tracking-widest uppercase">P2P File Queue</h3>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-mono uppercase bg-white text-black">
                      Connected
                    </div>
                  </div>

                  {/* Queue list */}
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

                  {/* Stats block — numbered editorial style */}
                  {transferState === TransferState.TRANSFERRING && (
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

                  {/* Engine Controls */}
                  <div className="border-t border-white/10 pt-4 flex gap-px">
                    {transferState === TransferState.FILES_SELECTED || transferState === TransferState.IDLE ? (
                      <button
                        onClick={startFileTransmission}
                        className="w-full py-4 bg-white text-black font-bold text-sm tracking-widest uppercase hover:bg-gray-200 transition-all"
                      >
                        Start File Transfer
                      </button>
                    ) : transferState === TransferState.TRANSFERRING ? (
                      <>
                        <button
                          onClick={pauseActiveTransfer}
                          className="flex-1 py-4 border border-white/20 text-white font-bold text-sm tracking-widest uppercase hover:bg-white/5 transition-all"
                        >
                          Pause
                        </button>
                        <button
                          onClick={cancelActiveTransfer}
                          className="flex-1 py-4 border border-white/20 text-gray-400 font-bold text-sm tracking-widest uppercase hover:text-white hover:bg-white/5 transition-all"
                        >
                          Cancel
                        </button>
                      </>
                    ) : transferState === TransferState.PREPARING ? (
                      <>
                        <button
                          onClick={resumeActiveTransfer}
                          className="flex-1 py-4 border border-white/20 text-white font-bold text-sm tracking-widest uppercase hover:bg-white/5 transition-all"
                        >
                          Resume
                        </button>
                        <button
                          onClick={cancelActiveTransfer}
                          className="flex-1 py-4 border border-white/20 text-gray-400 font-bold text-sm tracking-widest uppercase hover:text-white hover:bg-white/5 transition-all"
                        >
                          Cancel
                        </button>
                      </>
                    ) : transferState === TransferState.COMPLETED ? (
                      <button
                        onClick={handleReset}
                        className="w-full py-4 bg-white text-black font-bold text-sm tracking-widest uppercase hover:bg-gray-200 transition-all"
                      >
                        Create New Session
                      </button>
                    ) : null}
                  </div>
                </div>
              ) : (
                // ─── PeerConnection Handshake: Render Code Awaiting Pairing ───
                <>
                  {/* Status badge */}
                  <div className="flex items-center justify-center">
                    <div
                      className={`
                        inline-flex items-center gap-2 px-4 py-1.5 text-xs font-mono uppercase tracking-widest
                        ${liveStatus === 'WAITING'
                          ? 'border border-white/20 text-gray-300'
                          : liveStatus === 'JOINED' || webrtc.peerConnectionState === 'connecting'
                            ? 'border border-white text-white'
                            : 'border border-white/20 text-gray-300'
                        }
                      `}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${liveStatus === 'WAITING'
                          ? 'bg-gray-300 animate-pulse'
                          : 'bg-white animate-ping'
                        }`}
                      />
                      {liveStatus === 'WAITING'
                        ? 'Waiting for receiver...'
                        : webrtc.peerConnectionState === 'connecting'
                          ? 'Negotiating peer connection...'
                          : 'Establishing handshake...'}
                    </div>
                  </div>

                  {/* Session code display */}
                  <div className="text-center">
                    <p className="text-xs font-mono uppercase tracking-widest text-gray-500 mb-4">
                      Share this code with the receiver
                    </p>
                    <button
                      onClick={handleCopyCode}
                      className="group relative inline-block"
                      title="Click to copy"
                    >
                      <div className="flex gap-2 justify-center">
                        {sessionCode.split('').map((digit, i) => (
                          <span
                            key={i}
                            className="w-14 h-16 flex items-center justify-center text-3xl font-mono font-bold bg-white/[0.05] border border-white/15 group-hover:border-white/40 transition-all duration-300"
                            style={{ animationDelay: `${i * 80}ms` }}
                          >
                            {digit}
                          </span>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500 mt-3 group-hover:text-white transition-colors font-mono tracking-widest">
                        {copied ? '✓ COPIED' : 'CLICK TO COPY'}
                      </p>
                    </button>
                  </div>

                  {/* Session info */}
                  {sessionDetail && (
                    <div className="grid grid-cols-2 border-t border-white/15">
                      <div className="px-4 py-5 border-r border-white/10">
                        <p className="text-xs font-mono text-gray-600 mb-2 uppercase tracking-widest">Sender</p>
                        <p className="text-sm text-gray-300">
                          {sessionDetail.senderDevice?.deviceName ?? 'Unknown'}
                        </p>
                      </div>
                      <div className="px-4 py-5">
                        <p className="text-xs font-mono text-gray-600 mb-2 uppercase tracking-widest">Receiver</p>
                        <p className="text-sm text-gray-300">
                          {sessionDetail.receiverDevice?.deviceName ?? 'Waiting...'}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Reset session button */}
                  <button
                    onClick={handleReset}
                    className="w-full py-4 border border-white/15 bg-white/[0.03] text-gray-400 font-bold text-sm tracking-widest uppercase hover:text-white hover:bg-white/[0.06] hover:border-white/30 transition-all duration-300"
                  >
                    Cancel Session
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