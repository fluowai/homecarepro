import fs from 'fs';
import pg from 'pg';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const connectionString = process.env.SUPABASE_DB_URL;
const sqlFile = process.argv[2] || 'supabase/migrations/20260803000000_add_plans_and_support.sql';

async function run() {
  const client = new pg.Client({ connectionString });
  try {
    await client.connect();
    console.log('Connected. Running migration...');
    const sql = fs.readFileSync(sqlFile, 'utf8');
    await client.query(sql);
    console.log('Migration applied successfully!');
  } catch (err) {
    console.error('Failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
