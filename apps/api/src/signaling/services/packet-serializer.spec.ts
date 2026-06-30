import { PacketType, serializePacket, deserializePacket } from '../../../../web/src/lib/transfer/packet-serializer';

describe('WebRTC Binary Packet Serializer', () => {
  it('should serialize and deserialize a METADATA packet correctly', () => {
    const payloadText = JSON.stringify({
      fileId: 'file-123',
      fileName: 'test-file.txt',
      mimeType: 'text/plain',
      size: 100,
      totalChunks: 1,
      chunkSize: 100,
      checksum: 'sha256-dummy-hash',
    });
    const payloadBytes = new TextEncoder().encode(payloadText);

    const originalPacket = {
      packetType: PacketType.METADATA,
      transferId: 'abcdef01-abcd-abcd-abcd-abcdef012345', // 36 chars UUID
      chunkIndex: 0,
      totalChunks: 1,
      payload: payloadBytes.buffer as ArrayBuffer,
    };

    const serialized = serializePacket(originalPacket);
    const deserialized = deserializePacket(serialized);

    expect(deserialized.packetType).toBe(originalPacket.packetType);
    expect(deserialized.transferId).toBe(originalPacket.transferId);
    expect(deserialized.chunkIndex).toBe(originalPacket.chunkIndex);
    expect(deserialized.totalChunks).toBe(originalPacket.totalChunks);

    const deserializedText = new TextDecoder().decode(deserialized.payload);
    expect(deserializedText).toBe(payloadText);
  });

  it('should serialize and deserialize a CHUNK packet with raw binary payload correctly', () => {
    const rawBytes = new Uint8Array([10, 20, 30, 40, 50, 60, 70, 80, 90, 100]);

    const originalPacket = {
      packetType: PacketType.CHUNK,
      transferId: '12345678-1234-1234-1234-1234567890ab', // 36 chars UUID
      chunkIndex: 5,
      totalChunks: 10,
      payload: rawBytes.buffer as ArrayBuffer,
    };

    const serialized = serializePacket(originalPacket);
    const deserialized = deserializePacket(serialized);

    expect(deserialized.packetType).toBe(originalPacket.packetType);
    expect(deserialized.transferId).toBe(originalPacket.transferId);
    expect(deserialized.chunkIndex).toBe(originalPacket.chunkIndex);
    expect(deserialized.totalChunks).toBe(originalPacket.totalChunks);

    const deserializedBytes = new Uint8Array(deserialized.payload);
    expect(Array.from(deserializedBytes)).toEqual(Array.from(rawBytes));
  });

  it('should serialize and deserialize a control packet with empty payload correctly', () => {
    const originalPacket = {
      packetType: PacketType.CANCEL,
      transferId: '00000000-0000-0000-0000-000000000000',
      chunkIndex: 0,
      totalChunks: 0,
      payload: new ArrayBuffer(0),
    };

    const serialized = serializePacket(originalPacket);
    const deserialized = deserializePacket(serialized);

    expect(deserialized.packetType).toBe(originalPacket.packetType);
    expect(deserialized.transferId).toBe(originalPacket.transferId);
    expect(deserialized.payload.byteLength).toBe(0);
  });

  it('should throw an error if trying to deserialize a buffer smaller than the header size', () => {
    const tinyBuffer = new ArrayBuffer(10);
    expect(() => deserializePacket(tinyBuffer)).toThrow('Buffer is too small to contain header');
  });
});
