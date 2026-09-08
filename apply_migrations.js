import pg from 'pg';
import fs from 'fs';

const { Client } = pg;
const client = new Client({ connectionString: 'postgresql://postgres:JgSgyqhBg81wFPoM@db.qczwrubsiuafhwojfzbm.supabase.co:5432/postgres' });

async function run() {
  await client.connect();
  const file = 'supabase/migrations/20260906000002_create_email_templates.sql';
  const sql = fs.readFileSync(file, 'utf8');
  await client.query(sql);
  await client.query("NOTIFY pgrst, 'reload schema';");
  console.log("Schema applied and reloaded!");
  await client.end();
}

run();
