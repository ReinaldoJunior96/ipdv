import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './pool.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDir = path.resolve(__dirname, '../../sql/migrations');
async function ensureSchemaMigrationsTable() {
    await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id BIGSERIAL PRIMARY KEY,
      filename TEXT NOT NULL UNIQUE,
      executed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
}
async function getPendingMigrations() {
    const files = (await readdir(migrationsDir))
        .filter((file) => file.endsWith('.sql'))
        .sort();
    const { rows } = await pool.query('SELECT filename FROM schema_migrations');
    const executed = new Set(rows.map((row) => row.filename));
    return files.filter((file) => !executed.has(file));
}
async function runMigration(filename) {
    const client = await pool.connect();
    try {
        const filePath = path.join(migrationsDir, filename);
        const sql = await readFile(filePath, 'utf8');
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [filename]);
        await client.query('COMMIT');
        console.log(`Applied migration: ${filename}`);
    }
    catch (error) {
        await client.query('ROLLBACK');
        throw error;
    }
    finally {
        client.release();
    }
}
async function main() {
    try {
        await ensureSchemaMigrationsTable();
        const pendingMigrations = await getPendingMigrations();
        if (!pendingMigrations.length) {
            console.log('No pending migrations.');
            return;
        }
        for (const filename of pendingMigrations) {
            await runMigration(filename);
        }
        console.log('Migrations completed successfully.');
    }
    finally {
        await pool.end();
    }
}
main().catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
});
