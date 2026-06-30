import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { WsEvent, WebRtcState, ErrorCode } from '@p2p-share/shared-types';
import { SignalingService } from '../services/signaling.service';
import { PresenceService } from '../services/presence.service';
import { PeerService } from '../services/peer.service';
import { LoggerService } from '../../common/logger/logger.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class SignalingGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly signalingService: SignalingService,
    private readonly presenceService: PresenceService,
    private readonly peerService: PeerService,
    private readonly logger: LoggerService,
  ) {}

  handleConnection(client: Socket) {
    this.logger.debug(`Socket connected: ${client.id}`, 'SignalingGateway');
  }

  async handleDisconnect(client: Socket) {
    const { deviceId, sessionId } = client.data;
    this.logger.debug(`Socket disconnected: ${client.id} (device: ${deviceId})`, 'SignalingGateway');

    if (deviceId && sessionId) {
      await this.presenceService.trackOffline(deviceId);
      
      const roomName = `room:session:${sessionId}`;
      // Notify remaining peer in room
      client.to(roomName).emit(WsEvent.PEER_DISCONNECTED, { deviceId });
      
      try {
        await this.signalingService.transitionState(sessionId, WebRtcState.DISCONNECTED);
      } catch (err) {
        // Suppress invalid transition logs if already failed/expired
      }
    }
  }

  /**
   * Client joins a session room.
   */
  @SubscribeMessage(WsEvent.SESSION_JOIN)
  async handleJoinSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; deviceId: string },
  ) {
    const { sessionId, deviceId } = data;
    const roomName = `room:session:${sessionId}`;

    try {
      // 1. Validate session is valid and active in database
      await this.signalingService.validateSession(sessionId);

      // 2. Enforce max 2 participants in Socket.IO room
      const room = this.server.sockets.adapter.rooms.get(roomName);
      const participantCount = room ? room.size : 0;

      if (participantCount >= 2) {
        client.emit(WsEvent.ERROR, {
          message: 'Session is full',
          code: ErrorCode.SESSION_FULL,
        });
        return;
      }

      // 3. Bind metadata to socket instance
      client.data.deviceId = deviceId;
      client.data.sessionId = sessionId;

      // 4. Join socket room
      await client.join(roomName);
      await this.presenceService.trackOnline(deviceId, client.id);

      // 5. Update pairing status
      const pair = await this.peerService.getPeerPair(sessionId);
      if (!pair.senderDeviceId) {
        // First participant (Sender)
        await this.peerService.savePeerPair(sessionId, {
          senderDeviceId: deviceId,
          senderSocketId: client.id,
        });
        await this.signalingService.transitionState(sessionId, WebRtcState.WAITING);
      } else {
        // Second participant (Receiver)
        await this.peerService.savePeerPair(sessionId, {
          receiverDeviceId: deviceId,
          receiverSocketId: client.id,
        });
        
        await this.signalingService.transitionState(sessionId, WebRtcState.JOINED);
        await this.signalingService.transitionState(sessionId, WebRtcState.PAIRING);

        // Notify both peers
        this.server.to(roomName).emit(WsEvent.PEER_JOINED, {
          receiverDeviceId: deviceId,
          senderDeviceId: pair.senderDeviceId,
        });
      }

      client.emit(WsEvent.SESSION_CREATED, { sessionId, room: roomName });
    } catch (error: any) {
      this.logger.error(`Join session failed`, 'SignalingGateway', error);
      client.emit(WsEvent.ERROR, {
        message: error.message || 'Failed to join room',
        code: error.error?.code || ErrorCode.INTERNAL_ERROR,
      });
    }
  }

  /**
   * Forward SDP Offer.
   */
  @SubscribeMessage(WsEvent.SIGNAL_OFFER)
  async handleOffer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; offer: any; senderDeviceId: string },
  ) {
    const { sessionId, offer, senderDeviceId } = data;
    const roomName = `room:session:${sessionId}`;

    try {
      await this.signalingService.transitionState(sessionId, WebRtcState.NEGOTIATING);
      client.to(roomName).emit(WsEvent.OFFER_RECEIVED, { offer, senderDeviceId });
      this.logger.debug(`SDP Offer forwarded for session: ${sessionId}`, 'SignalingGateway');
    } catch (error: any) {
      client.emit(WsEvent.ERROR, {
        message: error.message || 'Offer forwarding failed',
        code: ErrorCode.STATE_TRANSITION_INVALID,
      });
    }
  }

  /**
   * Forward SDP Answer.
   */
  @SubscribeMessage(WsEvent.SIGNAL_ANSWER)
  async handleAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; answer: any; receiverDeviceId: string },
  ) {
    const { sessionId, answer, receiverDeviceId } = data;
    const roomName = `room:session:${sessionId}`;

    try {
      await this.signalingService.transitionState(sessionId, WebRtcState.CONNECTED);
      client.to(roomName).emit(WsEvent.ANSWER_RECEIVED, { answer, receiverDeviceId });
      this.server.to(roomName).emit(WsEvent.PEER_CONNECTED, { sessionId });
      this.logger.debug(`SDP Answer forwarded for session: ${sessionId}`, 'SignalingGateway');
    } catch (error: any) {
      client.emit(WsEvent.ERROR, {
        message: error.message || 'Answer forwarding failed',
        code: ErrorCode.STATE_TRANSITION_INVALID,
      });
    }
  }

  /**
   * Forward ICE candidate immediately (trickle ICE).
   */
  @SubscribeMessage(WsEvent.SIGNAL_ICE)
  async handleIceCandidate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string; candidate: any },
  ) {
    const { sessionId, candidate } = data;
    const roomName = `room:session:${sessionId}`;

    // trickle immediately to the other peer in the room
    client.to(roomName).emit(WsEvent.ICE_CANDIDATE_RECEIVED, { candidate });
  }

  /**
   * Heartbeat tracker to verify device is online.
   */
  @SubscribeMessage(WsEvent.HEARTBEAT)
  async handleHeartbeat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { deviceId: string },
  ) {
    const { deviceId } = data;
    const isOnline = await this.presenceService.trackHeartbeat(deviceId);
    client.emit(WsEvent.HEARTBEAT_ACK, { success: isOnline });
  }

  /**
   * Close a session room.
   */
  @SubscribeMessage(WsEvent.SESSION_LEAVE)
  async handleLeaveSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string },
  ) {
    const { sessionId } = data;
    const roomName = `room:session:${sessionId}`;

    await client.leave(roomName);
    this.server.to(roomName).emit(WsEvent.PEER_DISCONNECTED, { deviceId: client.data.deviceId });
    await this.signalingService.transitionState(sessionId, WebRtcState.FAILED);
  }
}
