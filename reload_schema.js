import pg from 'pg';
const { Client } = pg;
const client = new Client({ connectionString: 'postgresql://postgres:JgSgyqhBg81wFPoM@db.qczwrubsiuafhwojfzbm.supabase.co:5432/postgres' });
client.connect()
  .then(() => client.query("NOTIFY pgrst, 'reload schema';"))
  .then(() => { console.log('Schema reloaded!'); client.end(); })
  .catch(e => { console.error(e); client.end(); });
