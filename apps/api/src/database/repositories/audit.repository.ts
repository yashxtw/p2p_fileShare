import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database.service';
import type { AuditLog, AuditEventType } from '@p2p-share/shared-types';
/**
 * Row shape returned from the audit_logs table.
 */
interface AuditLogRow {
  [key: string]: unknown;
  id: string;
  session_id: string | null;
  event_type: string;
  metadata: Record<string, unknown>;
  created_at: string;
}
/** Maps a DB row to the application-level AuditLog interface */
function toAuditLog(row: AuditLogRow): AuditLog {
  return {
    id: row.id,
    sessionId: row.session_id,
    eventType: row.event_type,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
  };
}

@Injectable()
export class AuditRepository {
  constructor(private readonly db: DatabaseService) {}

  /** Create an audit log entry */
  async create(data: {
    sessionId?: string;
    eventType: AuditEventType;
    metadata?: Record<string, unknown>;
  }): Promise<AuditLog> {
    const result = await this.db.query<AuditLogRow>(
      `INSERT INTO audit_logs (session_id, event_type, metadata)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [
        data.sessionId ?? null,
        data.eventType,
        JSON.stringify(data.metadata ?? {}),
      ],
    );
    return toAuditLog(result.rows[0]);
  }

  /** Find all audit logs for a session, ordered chronologically */
  async findBySessionId(sessionId: string): Promise<AuditLog[]> {
    const result = await this.db.query<AuditLogRow>(
      `SELECT * FROM audit_logs WHERE session_id = $1 ORDER BY created_at ASC`,
      [sessionId],
    );
    return result.rows.map(toAuditLog);
  }

  /** Find audit logs by event type */
  async findByEventType(eventType: AuditEventType): Promise<AuditLog[]> {
    const result = await this.db.query<AuditLogRow>(
      `SELECT * FROM audit_logs WHERE event_type = $1 ORDER BY created_at DESC LIMIT 100`,
      [eventType],
    );
    return result.rows.map(toAuditLog);
  }
}