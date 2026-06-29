import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Body,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import type { Request } from 'express';
import { SessionService } from './session.service';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { createSessionSchema, type CreateSessionDto } from './dto/create-session.dto';
import { joinSessionSchema, type JoinSessionDto } from './dto/join-session.dto';
import { updateStatusSchema, type UpdateStatusDto } from './dto/update-status.dto';

@Controller('sessions')
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  /**
   * POST /sessions
   * Create a new transfer session. Returns session + 6-digit code + QR payload.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createSession(
    @Body(new ZodValidationPipe(createSessionSchema)) body: CreateSessionDto,
    @Req() req: Request,
  ) {
    const ipAddress = this.extractIp(req);
    return this.sessionService.createSession(body, ipAddress);
  }

  /**
   * POST /sessions/join
   * Join a session by 6-digit code.
   */
  @Post('join')
  @HttpCode(HttpStatus.OK)
  async joinSession(
    @Body(new ZodValidationPipe(joinSessionSchema)) body: JoinSessionDto,
    @Req() req: Request,
  ) {
    const ipAddress = this.extractIp(req);
    return this.sessionService.joinSession(body, ipAddress);
  }

  /**
   * GET /sessions/:id
   * Get session details by UUID.
   */
  @Get(':id')
  async getSessionById(@Param('id') id: string) {
    return this.sessionService.getSessionById(id);
  }

  /**
   * GET /sessions/code/:code
   * Get session details by 6-digit code.
   */
  @Get('code/:code')
  async getSessionByCode(@Param('code') code: string) {
    return this.sessionService.getSessionByCode(code);
  }

  /**
   * PATCH /sessions/:id/status
   * Update session status (state machine validated).
   */
  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateStatusSchema)) body: UpdateStatusDto,
  ) {
    return this.sessionService.updateStatus(id, body.status);
  }

  /**
   * POST /sessions/:id/expire
   * Manually expire a session.
   */
  @Post(':id/expire')
  @HttpCode(HttpStatus.OK)
  async expireSession(@Param('id') id: string) {
    return this.sessionService.expireSession(id);
  }

  /**
   * Extract client IP from the request, handling proxies.
   */
  private extractIp(req: Request): string | undefined {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
      return forwarded.split(',')[0].trim();
    }
    return req.socket?.remoteAddress;
  }
}
