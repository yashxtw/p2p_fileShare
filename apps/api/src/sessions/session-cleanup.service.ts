import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SessionService } from './session.service';
import { LoggerService } from '../common/logger/logger.service';

/**
 * Scheduled task that expires stale WAITING sessions.
 * Runs every 5 minutes.
 */
@Injectable()
export class SessionCleanupService {
  constructor(
    private readonly sessionService: SessionService,
    private readonly logger: LoggerService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async handleCleanup() {
    try {
      const expired = await this.sessionService.expireStale();
      if (expired > 0) {
        this.logger.info(
          `Session cleanup: expired ${expired} stale session(s)`,
          'SessionCleanupService',
        );
      }
    } catch (error) {
      this.logger.error(
        'Session cleanup failed',
        'SessionCleanupService',
        error instanceof Error ? error : undefined,
      );
    }
  }
}
