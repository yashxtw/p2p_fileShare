'use client';

import { useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useSession } from '@/hooks/use-session';
import { useSessionStatus } from '@/hooks/use-session';
import type { FileMetadata } from '@p2p-share/shared-types';

export default function SendPage() {
  const {
    sessionCode,
    qrPayload,
    currentSession,
    selectedFiles,
    status,
    error,
    addSelectedFile,
    removeSelectedFile,
    setSelectedFiles,
    createSession,
    reset,
  } = useSession();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [copied, setCopied] = useState(false);

  // Poll session status once created
  const { data: sessionDetail } = useSessionStatus(
    currentSession?.id ?? null,
  );

  const handleFileSelect = useCallback(
    (fileList: FileList | null) => {
      if (!fileList) return;
      const newFiles: FileMetadata[] = Array.from(fileList).map((f) => ({
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

  const liveStatus = sessionDetail?.status ?? currentSession?.status;

  return (
   <main className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Subtle grid background */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)',
          backgroundSize: '64px 64px',
        }}
      />

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-10">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-white transition-colors mb-6"
          >
            ← Back
          </Link>
          <h1 className="text-4xl font-bold tracking-tight text-white">
            Send Files
          </h1>
          <p className="text-gray-400 mt-2">
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
                relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer
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
              <p className="text-sm text-gray-500">
                or click to browse · Max 500 MB per file
              </p>
            </div>

            {/* Selected files list */}
            {selectedFiles.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-gray-400">
                    {selectedFiles.length} file{selectedFiles.length > 1 ? 's' : ''} selected
                  </h3>
                  <button
                    onClick={() => setSelectedFiles([])}
                    className="text-xs text-gray-500 hover:text-white transition-colors"
                  >
                    Clear all
                  </button>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {selectedFiles.map((file, index) => (
                    <div
                      key={`${file.name}-${index}`}
                      className="flex items-center justify-between px-4 py-3 rounded-xl bg-white/[0.03] border border-white/10"
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
                        onClick={() => removeSelectedFile(index)}
                        className="text-gray-500 hover:text-white transition-colors ml-2 shrink-0"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Create button */}
            <button
              id="btn-create-session"
              onClick={handleCreate}
              disabled={status === 'creating'}
              className={`
                w-full py-4 rounded-xl font-semibold text-lg transition-all duration-300
                ${status === 'creating'
                  ? 'bg-white/10 text-gray-500 cursor-wait'
                  : 'bg-white text-black hover:bg-gray-200 hover:scale-[1.01] active:scale-[0.99]'
                }
              `}
            >
              {status === 'creating' ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
                  Creating session...
                </span>
              ) : (
                'Create Session'
              )}
            </button>
          </div>
        )}

        {/* Post-session: Code Display */}
        {currentSession && sessionCode && (
          <div className="space-y-8">
            {/* Status badge */}
            <div className="flex items-center justify-center">
              <div
                className={`
                  inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-mono tracking-wide
                  ${liveStatus === 'WAITING'
                    ? 'border border-white/20 text-gray-300'
                    : liveStatus === 'JOINED'
                      ? 'border border-white text-white'
                      : 'border border-white/20 text-gray-300'
                  }
                `}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${liveStatus === 'WAITING'
                      ? 'bg-gray-300 animate-pulse'
                      : liveStatus === 'JOINED'
                        ? 'bg-white'
                        : 'bg-gray-300'
                    }`}
                />
                {liveStatus === 'WAITING'
                  ? 'WAITING FOR RECEIVER...'
                  : liveStatus === 'JOINED'
                    ? 'RECEIVER JOINED'
                    : liveStatus}
              </div>
            </div>

            {/* Session code display */}
            <div className="text-center">
              <p className="text-sm text-gray-400 mb-4">
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
                      className="w-14 h-16 flex items-center justify-center text-3xl font-mono font-bold rounded-xl bg-white/[0.05] border border-white/15 group-hover:border-white/40 transition-all duration-300"
                      style={{ animationDelay: `${i * 80}ms` }}
                    >
                      {digit}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-3 group-hover:text-white transition-colors font-mono">
                  {copied ? '✓ COPIED' : 'CLICK TO COPY'}
                </p>
              </button>
            </div>

            {/* QR Payload (debug / future use) */}
            {qrPayload && (
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10">
                <p className="text-xs text-gray-500 mb-2 font-mono uppercase tracking-wide">QR Payload</p>
                <pre className="text-xs text-gray-400 font-mono overflow-x-auto">
                  {JSON.stringify(qrPayload, null, 2)}
                </pre>
              </div>
            )}

            {/* Session info */}
            {sessionDetail && (
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10">
                  <p className="text-xs text-gray-500 mb-1 font-mono uppercase tracking-wide">Sender</p>
                  <p className="text-sm text-gray-300">
                    {sessionDetail.senderDevice?.deviceName ?? 'Unknown'}
                  </p>
                </div>
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/10">
                  <p className="text-xs text-gray-500 mb-1 font-mono uppercase tracking-wide">Receiver</p>
                  <p className="text-sm text-gray-300">
                    {sessionDetail.receiverDevice?.deviceName ?? 'Waiting...'}
                  </p>
                </div>
              </div>
            )}

            {/* New session button */}
            <button
              onClick={reset}
              className="w-full py-3 rounded-xl border border-white/15 bg-white/[0.03] text-gray-400 hover:text-white hover:bg-white/[0.06] hover:border-white/30 transition-all duration-300"
            >
              Create New Session
            </button>
          </div>
        )}

        {/* Error display */}
        {error && (
          <div className="mt-6 p-4 rounded-xl bg-white/[0.05] border border-white/30 text-white text-sm">
            {error}
          </div>
        )}
      </div>
    </main>
  );
}