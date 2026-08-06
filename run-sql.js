import fs from 'fs';
import path from 'path';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.SUPABASE_DB_URL;
if (!connectionString) {
  console.error('Error: SUPABASE_DB_URL environment variable is required.');
  console.error('Set it in your .env file or export it before running this script.');
  process.exit(1);
}

const args = process.argv.slice(2);
const isBaseline = args.includes('--baseline');
const migrationsDir = args.find((a) => !a.startsWith('--')) || './supabase/migrations';

const TRACKING_TABLE = 'schema_migrations';

async function run() {
  const client = new pg.Client({ connectionString });

  try {
    await client.connect();
    console.log('Connected to database.');

    // Migration tracking table
    await client.query(`CREATE TABLE IF NOT EXISTS public.${TRACKING_TABLE} (
      filename text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    );`);

    const files = fs.readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort((a, b) => a.localeCompare(b));

    if (files.length === 0) {
      console.log(`No migration files found in ${migrationsDir}`);
      return;
    }

    const { rows } = await client.query(`SELECT filename FROM public.${TRACKING_TABLE}`);
    const applied = new Set(rows.map((r) => r.filename));

    // Baseline mode: record current files as applied WITHOUT executing them.
    // Use once when adopting the runner against an already-migrated database.
    if (isBaseline) {
      const toBaseline = files.filter((f) => !applied.has(f));
      for (const file of toBaseline) {
        await client.query(`INSERT INTO public.${TRACKING_TABLE} (filename) VALUES ($1)`, [file]);
        console.log(`baselined: ${file}`);
      }
      console.log(`\nBaseline done. ${toBaseline.length} file(s) recorded as applied (not executed).`);
      return;
    }

    const pending = files.filter((f) => !applied.has(f));
    console.log(`Found ${files.length} migration files. Applied: ${applied.size}. Pending: ${pending.length}.`);

    for (const file of pending) {
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      console.log(`Executing: ${file}...`);
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(`INSERT INTO public.${TRACKING_TABLE} (filename) VALUES ($1)`, [file]);
        await client.query('COMMIT');
        console.log(`✓ ${file} executed successfully`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`✗ ${file} FAILED:`, err.message);
        process.exit(1);
      }
    }

    console.log('\nAll pending migrations applied successfully!');
  } catch (err) {
    console.error('Error executing migrations:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
