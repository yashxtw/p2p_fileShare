import { SignalingService } from './signaling.service';
import { WebRtcState } from '@p2p-share/shared-types';
import { RedisService } from '../../redis/redis.service';
import { SessionRepository } from '../../database/repositories/session.repository';
import { AuditRepository } from '../../database/repositories/audit.repository';
import { LoggerService } from '../../common/logger/logger.service';
import { Test, TestingModule } from '@nestjs/testing';

describe('SignalingService (WebRTC State Machine)', () => {
  let service: SignalingService;
  let redisServiceMock: any;
  let sessionRepoMock: any;
  let auditRepoMock: any;
  let loggerServiceMock: any;

  beforeEach(async () => {
    redisServiceMock = {
      get: jest.fn(),
      setWithTTL: jest.fn(),
      del: jest.fn(),
      exists: jest.fn(),
    };
    sessionRepoMock = {
      findById: jest.fn(),
    };
    auditRepoMock = {
      create: jest.fn().mockResolvedValue({}),
    };
    loggerServiceMock = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SignalingService,
        { provide: RedisService, useValue: redisServiceMock },
        { provide: SessionRepository, useValue: sessionRepoMock },
        { provide: AuditRepository, useValue: auditRepoMock },
        { provide: LoggerService, useValue: loggerServiceMock },
      ],
    }).compile();

    service = module.get<SignalingService>(SignalingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('transitionState', () => {
    it('should successfully transition from WAITING to JOINED', async () => {
      redisServiceMock.get.mockResolvedValue(WebRtcState.WAITING);
      
      const nextState = await service.transitionState('session-1', WebRtcState.JOINED);
      
      expect(nextState).toBe(WebRtcState.JOINED);
      expect(redisServiceMock.setWithTTL).toHaveBeenCalledWith(
        'connection:state:session-1',
        WebRtcState.JOINED,
        3600
      );
    });

    it('should reject invalid transition from WAITING directly to CONNECTED', async () => {
      redisServiceMock.get.mockResolvedValue(WebRtcState.WAITING);

      await expect(
        service.transitionState('session-1', WebRtcState.CONNECTED)
      ).rejects.toThrow();

      expect(redisServiceMock.setWithTTL).not.toHaveBeenCalled();
    });

    it('should successfully transition from CONNECTED to DISCONNECTED', async () => {
      redisServiceMock.get.mockResolvedValue(WebRtcState.CONNECTED);

      const nextState = await service.transitionState('session-1', WebRtcState.DISCONNECTED);

      expect(nextState).toBe(WebRtcState.DISCONNECTED);
    });

    it('should successfully transition from DISCONNECTED back to NEGOTIATING', async () => {
      redisServiceMock.get.mockResolvedValue(WebRtcState.DISCONNECTED);

      const nextState = await service.transitionState('session-1', WebRtcState.NEGOTIATING);

      expect(nextState).toBe(WebRtcState.NEGOTIATING);
    });

    it('should return current state immediately if current state is target state', async () => {
      redisServiceMock.get.mockResolvedValue(WebRtcState.CONNECTED);

      const nextState = await service.transitionState('session-1', WebRtcState.CONNECTED);

      expect(nextState).toBe(WebRtcState.CONNECTED);
      expect(redisServiceMock.setWithTTL).not.toHaveBeenCalled();
    });
  });
});
