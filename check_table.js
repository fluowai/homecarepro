import pg from 'pg';
const { Client } = pg;
const client = new Client({ connectionString: 'postgresql://postgres:JgSgyqhBg81wFPoM@db.qczwrubsiuafhwojfzbm.supabase.co:5432/postgres' });
client.connect()
  .then(() => client.query("SELECT to_regclass('public.email_templates');"))
  .then(res => { console.log(res.rows[0]); client.end(); })
  .catch(e => { console.error(e); client.end(); });
