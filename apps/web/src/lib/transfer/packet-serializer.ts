export enum PacketType {
  METADATA = 0,
  CHUNK = 1,
  ACK = 2,
  COMPLETE = 3,
  ERROR = 4,
  PAUSE = 5,
  RESUME = 6,
  CANCEL = 7,
}

export interface TransferPacket {
  packetType: PacketType;
  transferId: string;
  chunkIndex: number;
  totalChunks: number;
  payload: ArrayBuffer;
}

const HEADER_SIZE = 49; // 1 (type) + 36 (transferId UUID) + 4 (index) + 4 (total) + 4 (length)

/**
 * Serializes a TransferPacket into a raw ArrayBuffer.
 */
export function serializePacket(packet: TransferPacket): ArrayBuffer {
  const payloadBytes = new Uint8Array(packet.payload);
  const buffer = new ArrayBuffer(HEADER_SIZE + payloadBytes.length);
  const view = new DataView(buffer);

  // 1. Write PacketType (1 byte)
  view.setUint8(0, packet.packetType);

  // 2. Write transferId (36 bytes string)
  const encoder = new TextEncoder();
  const idBytes = encoder.encode(packet.transferId.padEnd(36, ' '));
  const uint8View = new Uint8Array(buffer);
  uint8View.set(idBytes.subarray(0, 36), 1);

  // 3. Write chunkIndex (4 bytes)
  view.setUint32(37, packet.chunkIndex, false); // Big endian

  // 4. Write totalChunks (4 bytes)
  view.setUint32(41, packet.totalChunks, false);

  // 5. Write payloadLength (4 bytes)
  view.setUint32(45, payloadBytes.length, false);

  // 6. Write payload bytes
  uint8View.set(payloadBytes, HEADER_SIZE);

  return buffer;
}

/**
 * Deserializes an ArrayBuffer back into a TransferPacket.
 */
export function deserializePacket(buffer: ArrayBuffer): TransferPacket {
  if (buffer.byteLength < HEADER_SIZE) {
    throw new Error('Buffer is too small to contain header');
  }

  const view = new DataView(buffer);
  const uint8View = new Uint8Array(buffer);

  // 1. Read PacketType
  const packetType = view.getUint8(0) as PacketType;

  // 2. Read transferId (36 bytes string)
  const decoder = new TextDecoder();
  const transferId = decoder.decode(uint8View.subarray(1, 37)).trim();

  // 3. Read chunkIndex
  const chunkIndex = view.getUint32(37, false);

  // 4. Read totalChunks
  const totalChunks = view.getUint32(41, false);

  // 5. Read payloadLength
  const payloadLength = view.getUint32(45, false);

  // 6. Read payload
  const payload = buffer.slice(HEADER_SIZE, HEADER_SIZE + payloadLength);

  return {
    packetType,
    transferId,
    chunkIndex,
    totalChunks,
    payload,
  };
}
