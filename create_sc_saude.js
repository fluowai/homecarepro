import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL ?? 'https://qczwrubsiuafhwojfzbm.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const USER_INITIAL_PASSWORD = process.env.SC_SAUDE_INITIAL_PASSWORD;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Set SUPABASE_SERVICE_ROLE_KEY env var (services key rotated; do not hardcode).');
  process.exit(1);
}
if (!USER_INITIAL_PASSWORD) {
  console.error('Set SC_SAUDE_INITIAL_PASSWORD env var to define the initial user password.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const parentId = 'tenant-1786073450488';
  const tenantId = `tenant-scsaude-${Date.now()}`;

  console.log('Creating clinic SC SAUDE under revenda', parentId);

  const { data: tenant, error: tErr } = await supabase.from('tenants').insert({
    id: tenantId,
    name: 'SC SAUDE',
    cnpj: '',
    plan: 'Pro',
    status: 'active',
    parent_id: parentId,
    tenant_type: 'homecare'
  }).select().single();

  if (tErr) {
    console.error('Error creating tenant:', tErr);
    return;
  }
  console.log('Created tenant:', tenant);

  const email = process.env.SC_SAUDE_EMAIL ?? 'camilaisabelpereira547@gmail.com';
  console.log(`Creating user ${email}`);
  const { data: user, error: uErr } = await supabase.auth.admin.createUser({
    email,
    password: USER_INITIAL_PASSWORD,
    email_confirm: true,
    user_metadata: {
      tenant_id: tenantId,
      full_name: 'Camila Isabel Pereira',
      role: 'admin'
    }
  });

  if (uErr) {
    console.error('Error creating user:', uErr);
    return;
  }

  console.log(`Created user successfully. Login: ${email}`);
  console.log('Initial password comes from SC_SAUDE_INITIAL_PASSWORD env var.');
}

run();