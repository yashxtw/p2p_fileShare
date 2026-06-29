import { Module, Global } from '@nestjs/common';
import { DatabaseService } from './database.service';
import {
  DeviceRepository,
  SessionRepository,
  TransferFileRepository,
  AuditRepository,
} from './repositories';
const repositories = [
  DeviceRepository,
  SessionRepository,
  TransferFileRepository,
  AuditRepository,
];
@Global()
@Module({
  providers: [DatabaseService, ...repositories],
  exports: [DatabaseService, ...repositories],
})
export class DatabaseModule {}