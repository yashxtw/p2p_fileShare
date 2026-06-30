import { TransferState, TransferQueueState } from '@p2p-share/shared-types';
import { useTransferStore, QueueFile } from '../../stores/transfer.store';
import { PacketType, serializePacket, deserializePacket } from './packet-serializer';
import { ChunkSender } from './chunk-sender';
import { ChunkReceiver, FileMetadata } from './chunk-receiver';
import { computeHash } from './hash-helper';

/**
 * Orchestrates sending and receiving queues, speed estimation,
 * and data channel packet routing.
 */
export class QueueManager {
  private channel: RTCDataChannel;
  private activeSender: ChunkSender | null = null;
  private activeReceiver: ChunkReceiver | null = null;
  
  // Speed calculation metrics
  private bytesTransferredInInterval = 0;
  private intervalStartTime = Date.now();
  private statsTimer: NodeJS.Timeout | null = null;

  constructor(channel: RTCDataChannel) {
    this.channel = channel;
    this.channel.binaryType = 'arraybuffer';
    this.channel.onmessage = (e) => this.handleChannelMessage(e.data);
    
    // Start speed and ETA updates every second
    this.statsTimer = setInterval(() => this.calculateStats(), 1000);
  }

  /**
   * Cleans up background intervals and timers.
   */
  destroy(): void {
    if (this.statsTimer) {
      clearInterval(this.statsTimer);
    }
    if (this.activeSender) this.activeSender.cancel();
    if (this.activeReceiver) this.activeReceiver.cancel();
  }

  /**
   * SENDER: Start transferring the next WAITING file in queue.
   */
  async processNextFile(): Promise<void> {
    const store = useTransferStore.getState();
    const nextFile = store.queue.find((f) => f.status === TransferQueueState.WAITING);

    if (!nextFile || !nextFile.file) {
      // All files finished
      const allCompleted = store.queue.every((f) => f.status === TransferQueueState.COMPLETED);
      store.setTransferState(allCompleted ? TransferState.COMPLETED : TransferState.IDLE);
      store.setActiveTransferId(null);
      return;
    }

    store.setTransferState(TransferState.PREPARING);
    store.setActiveTransferId(nextFile.id);
    store.updateFileProgress(nextFile.id, 0, TransferQueueState.PREPARING);

    try {
      const file = nextFile.file;
      const chunkSize = 160 * 1024; // 160 KB
      const totalChunks = Math.ceil(file.size / chunkSize);

      // Compute SHA-256 integrity check using Web Worker
      const arrayBuffer = await file.arrayBuffer();
      const checksum = await computeHash(arrayBuffer);

      // Update checksum in queue
      nextFile.checksum = checksum;

      // 1. Send METADATA packet
      const metadataPayload: FileMetadata = {
        fileId: nextFile.id,
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        size: file.size,
        totalChunks,
        chunkSize,
        checksum,
      };

      const metaBytes = new TextEncoder().encode(JSON.stringify(metadataPayload));
      const metaPacket = serializePacket({
        packetType: PacketType.METADATA,
        transferId: nextFile.id,
        chunkIndex: 0,
        totalChunks,
        payload: metaBytes.buffer as ArrayBuffer,
      });

      this.channel.send(metaPacket);

      // 2. Initialize ChunkSender
      store.updateFileProgress(nextFile.id, 0, TransferQueueState.SENDING);
      store.setTransferState(TransferState.TRANSFERRING);

      this.activeSender = new ChunkSender(file, nextFile.id, this.channel, {
        chunkSize,
        onProgress: (bytesSent) => {
          this.bytesTransferredInInterval += bytesSent;
          const currentFile = useTransferStore.getState().queue.find((f) => f.id === nextFile.id);
          const currentProgress = (currentFile?.progressBytes || 0) + bytesSent;
          store.updateFileProgress(nextFile.id, currentProgress);
          this.updateTotalProgressPercentage();
        },
        onComplete: () => {
          // Send COMPLETE packet
          const completePacket = serializePacket({
            packetType: PacketType.COMPLETE,
            transferId: nextFile.id,
            chunkIndex: totalChunks,
            totalChunks,
            payload: new ArrayBuffer(0),
          });
          this.channel.send(completePacket);

          store.updateFileProgress(nextFile.id, file.size, TransferQueueState.COMPLETED);
          this.activeSender = null;
          this.processNextFile();
        },
        onError: (err) => {
          this.handleTransferError(nextFile.id, err);
        },
      });

      this.activeSender.start();
    } catch (err: any) {
      this.handleTransferError(nextFile.id, err);
    }
  }

  /**
   * Pause the active sender.
   */
  pause(): void {
    if (this.activeSender) {
      this.activeSender.pause();
      const store = useTransferStore.getState();
      const fileId = store.activeTransferId;
      if (fileId) {
        store.updateFileProgress(fileId, store.queue.find((f) => f.id === fileId)?.progressBytes || 0, TransferQueueState.PREPARING);
      }
      
      // Notify receiver
      if (fileId && this.channel.readyState === 'open') {
        const pausePacket = serializePacket({
          packetType: PacketType.PAUSE,
          transferId: fileId,
          chunkIndex: this.activeSender.getCurrentChunk(),
          totalChunks: this.activeSender.getTotalChunks(),
          payload: new ArrayBuffer(0),
        });
        this.channel.send(pausePacket);
      }
    }
  }

  /**
   * Resume the active sender.
   */
  resume(): void {
    if (this.activeSender) {
      this.activeSender.resume();
      const store = useTransferStore.getState();
      const fileId = store.activeTransferId;
      if (fileId) {
        store.updateFileProgress(fileId, store.queue.find((f) => f.id === fileId)?.progressBytes || 0, TransferQueueState.SENDING);
      }

      // Notify receiver
      if (fileId && this.channel.readyState === 'open') {
        const resumePacket = serializePacket({
          packetType: PacketType.RESUME,
          transferId: fileId,
          chunkIndex: this.activeSender.getCurrentChunk(),
          totalChunks: this.activeSender.getTotalChunks(),
          payload: new ArrayBuffer(0),
        });
        this.channel.send(resumePacket);
      }
    }
  }

  /**
   * Cancel active sender or receiver file.
   */
  cancelActiveTransfer(): void {
    const store = useTransferStore.getState();
    const fileId = store.activeTransferId;
    if (!fileId) return;

    if (this.activeSender) {
      this.activeSender.cancel();
      this.activeSender = null;
    }
    if (this.activeReceiver) {
      this.activeReceiver.cancel();
      this.activeReceiver = null;
    }

    store.updateFileProgress(fileId, 0, TransferQueueState.CANCELLED);
    store.setActiveTransferId(null);
    store.setTransferState(TransferState.IDLE);
    
    // Attempt next file if sending
    this.processNextFile();
  }

  // ─── Packet Dispatcher ─────────────────────────────────────

  private handleChannelMessage(buffer: ArrayBuffer): void {
    const packet = deserializePacket(buffer);
    const store = useTransferStore.getState();

    switch (packet.packetType) {
      case PacketType.METADATA: {
        const metaText = new TextDecoder().decode(packet.payload);
        const metadata = JSON.parse(metaText) as FileMetadata;

        // RECEIVER: Allocate file entry in UI store
        const newFile: QueueFile = {
          id: metadata.fileId,
          name: metadata.fileName,
          size: metadata.size,
          mimeType: metadata.mimeType,
          progressBytes: 0,
          status: TransferQueueState.PREPARING,
          checksum: metadata.checksum,
        };

        store.addFilesToQueue([newFile]);
        store.setActiveTransferId(metadata.fileId);
        store.setTransferState(TransferState.TRANSFERRING);
        store.updateFileProgress(metadata.fileId, 0, TransferQueueState.SENDING);

        // Instanciate chunk receiver
        this.activeReceiver = new ChunkReceiver(metadata.fileId, this.channel, metadata, {
          onProgress: (bytesReceived) => {
            this.bytesTransferredInInterval += bytesReceived;
            const currentProgress = (store.queue.find((f) => f.id === metadata.fileId)?.progressBytes || 0) + bytesReceived;
            store.updateFileProgress(metadata.fileId, currentProgress);
            this.updateTotalProgressPercentage();
          },
          onComplete: (blob) => {
            store.updateFileProgress(metadata.fileId, metadata.size, TransferQueueState.COMPLETED);
            this.activeReceiver = null;
            store.setActiveTransferId(null);
            store.setTransferState(TransferState.COMPLETED);

            // Auto-trigger browser download
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = metadata.fileName;
            a.click();
            URL.revokeObjectURL(url);
          },
          onError: (err) => {
            this.handleTransferError(metadata.fileId, err);
          },
        });
        break;
      }

      case PacketType.CHUNK: {
        if (this.activeReceiver) {
          this.activeReceiver.handleChunkPacket(packet);
        }
        break;
      }

      case PacketType.ACK: {
        // Handle delivery updates
        break;
      }

      case PacketType.PAUSE: {
        // RECEIVER: display paused status
        const fileId = store.activeTransferId;
        if (fileId) {
          store.updateFileProgress(fileId, store.queue.find((f) => f.id === fileId)?.progressBytes || 0, TransferQueueState.WAITING);
        }
        break;
      }

      case PacketType.RESUME: {
        // RECEIVER: display sending status
        const fileId = store.activeTransferId;
        if (fileId) {
          store.updateFileProgress(fileId, store.queue.find((f) => f.id === fileId)?.progressBytes || 0, TransferQueueState.SENDING);
        }
        break;
      }

      case PacketType.CANCEL: {
        this.cancelActiveTransfer();
        break;
      }

      default:
        break;
    }
  }

  // ─── Throughput & Math Calculations ────────────────────────

  private calculateStats(): void {
    const store = useTransferStore.getState();
    const activeId = store.activeTransferId;
    if (!activeId) {
      store.setSpeedAndEta(0, null);
      return;
    }

    const now = Date.now();
    const timeDelta = (now - this.intervalStartTime) / 1000; // in seconds
    if (timeDelta <= 0) return;

    // Calculate speed: Bytes per second
    const instantSpeed = Math.round(this.bytesTransferredInInterval / timeDelta);
    
    // Reset interval counters
    this.bytesTransferredInInterval = 0;
    this.intervalStartTime = now;

    // Find active file remaining bytes
    const activeFile = store.queue.find((f) => f.id === activeId);
    if (!activeFile) return;

    const remainingBytes = activeFile.size - activeFile.progressBytes;
    
    // Calculate ETA (Remaining time)
    let eta: number | null = null;
    if (instantSpeed > 0) {
      eta = Math.max(0, Math.ceil(remainingBytes / instantSpeed));
    }

    store.setSpeedAndEta(instantSpeed, eta);
  }

  private updateTotalProgressPercentage(): void {
    const store = useTransferStore.getState();
    if (store.queue.length === 0) return;

    const totalBytes = store.queue.reduce((acc, f) => acc + f.size, 0);
    const totalTransferred = store.queue.reduce((acc, f) => acc + f.progressBytes, 0);

    if (totalBytes > 0) {
      const percentage = Math.round((totalTransferred / totalBytes) * 100);
      store.setTotalProgress(percentage);
    }
  }

  private handleTransferError(fileId: string, error: Error): void {
    const store = useTransferStore.getState();
    store.updateFileProgress(fileId, 0, TransferQueueState.FAILED);
    store.setError(error.message);
    this.loggerError(`File error for ID ${fileId}: ${error.message}`);
  }

  private loggerError(msg: string): void {
    console.error(`[QueueManager] ${msg}`);
  }
}
