import { Client } from 'pg';
import * as fs from 'fs';

const connectionString = 'postgresql://postgres:JgSgyqhBg81wFPoM@db.qczwrubsiuafhwojfzbm.supabase.co:5432/postgres';

async function migrate() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log('Connected to DB. Running migrations...');
    
    const sql1 = fs.readFileSync('./supabase/migrations/20260911000000_update_pad_and_attended_patients.sql', 'utf8');
    await client.query(sql1);
    console.log('Migration 1 applied.');

    const sql2 = fs.readFileSync('./supabase/migrations/20260911120000_add_anamnesis.sql', 'utf8');
    await client.query(sql2);
    console.log('Migration 2 applied.');
    
    // We also need to reload schema cache in supabase. This usually happens automatically or by calling a function.
    // In postgrest, we can notify pgrst to reload the schema cache.
    await client.query(`NOTIFY pgrst, 'reload schema'`);
    console.log('Notified PostgREST to reload schema.');

  } catch (error) {
    console.error('Migration error:', error);
  } finally {
    await client.end();
  }
}

migrate();
