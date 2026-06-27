import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, type PoolClient, type QueryResult } from 'pg';
import { LoggerService } from '../common/logger/logger.service';
export class DatabaseException extends Error {
  constructor(
    message: string,
    public readonly query?: string,
    public readonly originalError?: Error,
  ) {
    super(message);
    this.name = 'DatabaseException';
  }
}
@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private pool!: Pool;
  constructor(
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {}
  async onModuleInit() {
    const databaseUrl = this.configService.get<string>('NEON_DATABASE_URL');
    this.pool = new Pool({
      connectionString: databaseUrl,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      ssl: {
        rejectUnauthorized: false,
      },
    });
    this.pool.on('error', (err) => {
      this.logger.error('Unexpected database pool error', 'DatabaseService', err);
    });
    this.logger.info('Database pool initialized', 'DatabaseService');
  }
  async onModuleDestroy() {
    if (this.pool) {
      await this.pool.end();
      this.logger.info('Database pool closed', 'DatabaseService');
    }
  }
  /**
   * Execute a parameterized SQL query.
   */
  async query<T extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    params?: unknown[],
  ): Promise<QueryResult<T>> {
    try {
      const start = Date.now();
      const result = await this.pool.query<T>(text, params);
      const duration = Date.now() - start;
      this.logger.debug(`Query executed in ${duration}ms`, 'DatabaseService', {
        query: text.substring(0, 100),
        rows: result.rowCount,
        duration,
      });
      return result;
    } catch (error) {
      throw new DatabaseException(
        `Query failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        text,
        error instanceof Error ? error : undefined,
      );
    }
  }
  /**
   * Execute a callback within a database transaction.
   * Automatically handles BEGIN/COMMIT/ROLLBACK.
   */
  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw new DatabaseException(
        `Transaction failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        undefined,
        error instanceof Error ? error : undefined,
      );
    } finally {
      client.release();
    }
  }
  /**
   * Health check — execute a simple query.
   */
  async healthCheck(): Promise<void> {
    await this.pool.query('SELECT 1');
  }
}
