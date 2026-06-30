import { Module } from '@nestjs/common';
import { SignalingGateway } from './gateways/signaling.gateway';
import { SignalingService } from './services/signaling.service';
import { PresenceService } from './services/presence.service';
import { PeerService } from './services/peer.service';

@Module({
  providers: [
    SignalingGateway,
    SignalingService,
    PresenceService,
    PeerService,
  ],
  exports: [
    SignalingService,
    PresenceService,
    PeerService,
  ],
})
export class SignalingModule {}
