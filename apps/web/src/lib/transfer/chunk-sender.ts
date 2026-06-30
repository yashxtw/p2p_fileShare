import { PacketType, serializePacket } from './packet-serializer';

export interface ChunkSenderOptions {
  chunkSize?: number;
  onProgress?: (bytesSent: number) => void;
  onComplete?: () => void;
  onError?: (err: Error) => void;
}

/**
 * Handles slicing, reading, and sending file chunks over WebRTC with backpressure management.
 */
export class ChunkSender {
  private file: File;
  private transferId: string;
  private channel: RTCDataChannel;
  private chunkSize: number;
  private currentChunk = 0;
  private totalChunks: number;
  private isPaused = false;
  private isCancelled = false;
  private onProgress: (bytesSent: number) => void;
  private onComplete: () => void;
  private onError: (err: Error) => void;

  constructor(
    file: File,
    transferId: string,
    channel: RTCDataChannel,
    options: ChunkSenderOptions = {},
  ) {
    this.file = file;
    this.transferId = transferId;
    this.channel = channel;
    this.chunkSize = options.chunkSize || 160 * 1024; // Default: 160 KB to fit within 256 KB max message limit
    this.totalChunks = Math.ceil(this.file.size / this.chunkSize);
    this.onProgress = options.onProgress || (() => {});
    this.onComplete = options.onComplete || (() => {});
    this.onError = options.onError || (() => {});

    // Configure DataChannel backpressure thresholds
    this.channel.bufferedAmountLowThreshold = 4 * 1024 * 1024; // 4 MB low threshold
    this.channel.onbufferedamountlow = () => {
      this.sendNext();
    };
  }

  /**
   * Start transmission from the beginning or current chunk.
   */
  start(): void {
    this.isPaused = false;
    this.isCancelled = false;
    this.sendNext();
  }

  /**
   * Pause reading and sending chunks.
   */
  pause(): void {
    this.isPaused = true;
  }

  /**
   * Resume sending chunks.
   */
  resume(): void {
    if (this.isPaused) {
      this.isPaused = false;
      this.sendNext();
    }
  }

  /**
   * Cancel transfer, cleaning up active operations.
   */
  cancel(): void {
    this.isCancelled = true;
    try {
      const cancelPacket = serializePacket({
        packetType: PacketType.CANCEL,
        transferId: this.transferId,
        chunkIndex: this.currentChunk,
        totalChunks: this.totalChunks,
        payload: new ArrayBuffer(0),
      });
      if (this.channel.readyState === 'open') {
        this.channel.send(cancelPacket);
      }
    } catch {
      // Channel might already be closed
    }
  }

  /**
   * Current chunk index.
   */
  getCurrentChunk(): number {
    return this.currentChunk;
  }

  /**
   * Total chunk count.
   */
  getTotalChunks(): number {
    return this.totalChunks;
  }

  // ─── Private Loop ──────────────────────────────────────────

  private sendNext(): void {
    if (this.isPaused || this.isCancelled) return;

    if (this.currentChunk >= this.totalChunks) {
      this.onComplete();
      return;
    }

    // Enforce backpressure: Pause reading if browser output buffer is too full (> 16 MB)
    if (this.channel.bufferedAmount > 16 * 1024 * 1024) {
      return;
    }

    const startByte = this.currentChunk * this.chunkSize;
    const endByte = Math.min(this.file.size, startByte + this.chunkSize);
    const slice = this.file.slice(startByte, endByte);

    const reader = new FileReader();

    reader.onload = () => {
      if (this.isCancelled || this.isPaused) return;

      const arrayBuffer = reader.result as ArrayBuffer;

      try {
        const packet = serializePacket({
          packetType: PacketType.CHUNK,
          transferId: this.transferId,
          chunkIndex: this.currentChunk,
          totalChunks: this.totalChunks,
          payload: arrayBuffer,
        });

        if (this.channel.readyState !== 'open') {
          throw new Error('RTCDataChannel is closed');
        }

        this.channel.send(packet);
        this.currentChunk++;
        this.onProgress(arrayBuffer.byteLength);

        // Keep pumping chunks if the buffer is below threshold
        this.sendNext();
      } catch (err: any) {
        this.onError(err);
      }
    };

    reader.onerror = () => {
      this.onError(new Error('Failed to read file slice from disk'));
    };

    reader.readAsArrayBuffer(slice);
  }
}
