import fs from 'fs';
import path from 'path';
import pg from 'pg';

const connectionString = process.env.SUPABASE_DB_URL;
if (!connectionString) {
  console.error('Error: SUPABASE_DB_URL environment variable is required.');
  console.error('Set it in your .env file or export it before running this script.');
  process.exit(1);
}

const migrationsDir = process.argv[2] || './supabase/migrations';

async function run() {
  const client = new pg.Client({ connectionString });

  try {
    await client.connect();
    console.log('Connected to database.');

    const files = fs.readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort((a, b) => a.localeCompare(b));

    console.log(`Found ${files.length} migration files in ${migrationsDir}`);

    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      console.log(`Executing: ${file}...`);
      const sql = fs.readFileSync(filePath, 'utf8');
      await client.query(sql);
      console.log(`✓ ${file} executed successfully`);
    }

    console.log('\nAll migrations applied successfully!');
  } catch (err) {
    console.error('Error executing migrations:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
