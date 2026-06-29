import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database.service';
import { LoggerService } from '../../common/logger/logger.service';
import type { TransferFile } from '@p2p-share/shared-types';
/**
 * Row shape returned from the transfer_files table.
 */
interface TransferFileRow {
  [key: string]: unknown;
  id: string;
  session_id: string;
  file_name: string;
  file_size: string; // BIGINT comes back as string from pg
  mime_type: string;
  created_at: string;
}
/** Maps a DB row to the application-level TransferFile interface */
function toTransferFile(row: TransferFileRow): TransferFile {
  return {
    id: row.id,
    sessionId: row.session_id,
    fileName: row.file_name,
    fileSize: parseInt(row.file_size, 10),
    mimeType: row.mime_type,
    createdAt: row.created_at,
  };
}
@Injectable()
export class TransferFileRepository {
  constructor(
    private readonly db: DatabaseService,
    private readonly logger: LoggerService,
  ) {}
  /** Create a single transfer file record */
  async create(data: {
    sessionId: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
  }): Promise<TransferFile> {
    const result = await this.db.query<TransferFileRow>(
      `INSERT INTO transfer_files (session_id, file_name, file_size, mime_type)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [data.sessionId, data.fileName, data.fileSize, data.mimeType],
    );
    return toTransferFile(result.rows[0]);
  }
  /**
   * Create multiple transfer file records in a single transaction.
   * All files are inserted atomically — if one fails, none are persisted.
   */
  async createMany(
    files: Array<{
      sessionId: string;
      fileName: string;
      fileSize: number;
      mimeType: string;
    }>,
  ): Promise<TransferFile[]> {
    if (files.length === 0) return [];
    return this.db.transaction(async (client) => {
      const results: TransferFile[] = [];
      for (const file of files) {
        const result = await client.query<TransferFileRow>(
          `INSERT INTO transfer_files (session_id, file_name, file_size, mime_type)
           VALUES ($1, $2, $3, $4)
           RETURNING *`,
          [file.sessionId, file.fileName, file.fileSize, file.mimeType],
        );
        results.push(toTransferFile(result.rows[0]));
      }
      this.logger.debug(
        `Inserted ${results.length} transfer files`,
        'TransferFileRepository',
        { sessionId: files[0].sessionId },
      );
      return results;
    });
  }
  /** Find all files for a session */
  async findBySessionId(sessionId: string): Promise<TransferFile[]> {
    const result = await this.db.query<TransferFileRow>(
      `SELECT * FROM transfer_files WHERE session_id = $1 ORDER BY created_at`,
      [sessionId],
    );
    return result.rows.map(toTransferFile);
  }
  /** Delete all files for a session */
  async deleteBySessionId(sessionId: string): Promise<number> {
    const result = await this.db.query(
      `DELETE FROM transfer_files WHERE session_id = $1`,
      [sessionId],
    );
    return result.rowCount ?? 0;
  }
}
