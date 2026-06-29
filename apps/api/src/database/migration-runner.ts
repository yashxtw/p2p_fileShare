/**
 * Migration runner for Neon PostgreSQL.
 * 
 * Reads .sql files from the migrations/ directory, tracks executed
 * migrations in a _migrations table, and runs pending ones in order.
 * 
 * Usage: npx ts-node src/database/migration-runner.ts
 */

import 'dotenv/config';
import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');
const MIGRATIONS_TABLE = '_migrations';

async function run() {
  const databaseUrl = process.env.NEON_DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ NEON_DATABASE_URL environment variable is required');
    process.exit(1);
  }
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });
  try {
    // Ensure migrations tracking table exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Get already-executed migrations
    const { rows: executed } = await pool.query(
      `SELECT name FROM ${MIGRATIONS_TABLE} ORDER BY id`,
    );
    const executedNames = new Set(executed.map((r: { name: string }) => r.name));
    
    // Read migration files
    if (!fs.existsSync(MIGRATIONS_DIR)) {
      console.warn('⚠️  No migrations directory found');
      return;
    }
    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql'))
      .sort();
    const pending = files.filter((f) => !executedNames.has(f));
    if (pending.length === 0) {
      console.log('✅ No pending migrations');
      return;
    }
    console.log(`📦 Found ${pending.length} pending migration(s):\n`);
    for (const file of pending) {
      const filePath = path.join(MIGRATIONS_DIR, file);
      const sql = fs.readFileSync(filePath, 'utf-8');
      console.log(`  ▶ Running: ${file}`);
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query(
          `INSERT INTO ${MIGRATIONS_TABLE} (name) VALUES ($1)`,
          [file],
        );
        await client.query('COMMIT');
        console.log(`  ✅ Completed: ${file}`);
      } catch (error) {
        await client.query('ROLLBACK');
        console.error(`  ❌ Failed: ${file}`);
        throw error;
      } finally {
        client.release();
      }
    }
    console.log(`\n✅ All ${pending.length} migration(s) completed successfully`);
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();