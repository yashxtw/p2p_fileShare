import { PacketType, serializePacket, deserializePacket, TransferPacket } from './packet-serializer';
import { computeHash } from './hash-helper';

export interface FileMetadata {
  fileId: string;
  fileName: string;
  mimeType: string;
  size: number;
  totalChunks: number;
  chunkSize: number;
  checksum: string;
}

export interface ChunkReceiverOptions {
  onProgress?: (bytesReceived: number) => void;
  onComplete?: (blob: Blob) => void;
  onError?: (err: Error) => void;
}

/**
 * Manages chunk collection, ordering, duplicate elimination, reassembly,
 * and SHA-256 integrity verification on the receiving end.
 */
export class ChunkReceiver {
  private transferId: string;
  private channel: RTCDataChannel;
  private metadata: FileMetadata;
  private chunksArray: Array<ArrayBuffer | null>;
  private receivedCount = 0;
  private isCancelled = false;
  private onProgress: (bytesReceived: number) => void;
  private onComplete: (blob: Blob) => void;
  private onError: (err: Error) => void;

  constructor(
    transferId: string,
    channel: RTCDataChannel,
    metadata: FileMetadata,
    options: ChunkReceiverOptions = {},
  ) {
    this.transferId = transferId;
    this.channel = channel;
    this.metadata = metadata;
    this.chunksArray = new Array<ArrayBuffer | null>(metadata.totalChunks).fill(null);
    this.onProgress = options.onProgress || (() => {});
    this.onComplete = options.onComplete || (() => {});
    this.onError = options.onError || (() => {});
  }

  /**
   * Process an incoming raw chunk packet buffer.
   */
  async handleChunkPacket(packet: TransferPacket): Promise<void> {
    if (this.isCancelled) return;

    const { chunkIndex, totalChunks, payload } = packet;

    // 1. Boundary checking
    if (chunkIndex < 0 || chunkIndex >= this.metadata.totalChunks) {
      this.loggerError('Received out-of-bounds chunk index');
      return;
    }

    // 2. Duplicate protection
    if (this.chunksArray[chunkIndex] !== null) {
      return; // Ignore duplicate chunk
    }

    // 3. Store chunk
    this.chunksArray[chunkIndex] = payload;
    this.receivedCount++;
    this.onProgress(payload.byteLength);

    // 4. Send ACK back to sender
    this.sendAck(chunkIndex);

    // 5. Complete check
    if (this.receivedCount === this.metadata.totalChunks) {
      await this.assembleAndVerify();
    }
  }

  /**
   * Cancel and release buffer memory.
   */
  cancel(): void {
    this.isCancelled = true;
    this.clearMemory();
  }

  // ─── Private Helpers ───────────────────────────────────────

  private sendAck(chunkIndex: number): void {
    try {
      if (this.channel.readyState === 'open') {
        const ackPacket = serializePacket({
          packetType: PacketType.ACK,
          transferId: this.transferId,
          chunkIndex,
          totalChunks: this.metadata.totalChunks,
          payload: new ArrayBuffer(0),
        });
        this.channel.send(ackPacket);
      }
    } catch {
      // Channel might have closed
    }
  }

  private async assembleAndVerify(): Promise<void> {
    try {
      // 1. Check for missing chunks (gap detection)
      const missingIndexes: number[] = [];
      for (let i = 0; i < this.chunksArray.length; i++) {
        if (this.chunksArray[i] === null) {
          missingIndexes.push(i);
        }
      }

      if (missingIndexes.length > 0) {
        throw new Error(`Corrupted transfer: missing ${missingIndexes.length} chunk(s)`);
      }

      // 2. Concatenate and calculate hash
      const verifiedChunks = this.chunksArray as ArrayBuffer[];
      const totalBytes = verifiedChunks.reduce((acc, c) => acc + c.byteLength, 0);
      
      const flatBuffer = new Uint8Array(totalBytes);
      let offset = 0;
      for (const chunk of verifiedChunks) {
        flatBuffer.set(new Uint8Array(chunk), offset);
        offset += chunk.byteLength;
      }

      // Compute SHA-256 integrity hash using Web Worker
      const calculatedHash = await computeHash(flatBuffer.buffer as ArrayBuffer);

      if (calculatedHash !== this.metadata.checksum) {
        throw new Error('Integrity validation failed: SHA-256 checksum mismatch');
      }

      // 3. Create blob and download
      const blob = new Blob(verifiedChunks, { type: this.metadata.mimeType });
      this.clearMemory();
      this.onComplete(blob);
    } catch (err: any) {
      this.clearMemory();
      this.onError(err);
    }
  }

  private clearMemory(): void {
    this.chunksArray = [];
    this.receivedCount = 0;
  }

  private loggerError(msg: string): void {
    console.error(`[ChunkReceiver:${this.transferId}] ${msg}`);
  }
}
