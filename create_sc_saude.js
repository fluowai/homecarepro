import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://qczwrubsiuafhwojfzbm.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFjendydWJzaXVhZmh3b2pmemJtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NTE2NDc4MCwiZXhwIjoyMTAwNzQwNzgwfQ.GGXbSrR7246BCMZZ_ROFGUgA8BYcWZqbAilFX_5aHws'
);

async function run() {
  const parentId = 'tenant-1786073450488'; // audicare revenda
  const tenantId = `tenant-scsaude-${Date.now()}`;
  
  console.log('Creating clinic SC SAUDE under revenda', parentId);
  
  const { data: tenant, error: tErr } = await supabase.from('tenants').insert({
    id: tenantId,
    name: 'SC SAUDE',
    cnpj: '',
    plan: 'Pro', // Standard plan
    status: 'active',
    parent_id: parentId,
    tenant_type: 'homecare'
  }).select().single();
  
  if (tErr) {
    console.error('Error creating tenant:', tErr);
    return;
  }
  console.log('Created tenant:', tenant);
  
  console.log('Creating user camilaisabelpereira547@gmail.com');
  const { data: user, error: uErr } = await supabase.auth.admin.createUser({
    email: 'camilaisabelpereira547@gmail.com',
    password: 'MudarSenha123!', 
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
  
  console.log('Created user successfully. Please notify the user to log in using camilaisabelpereira547@gmail.com and password MudarSenha123!');
}

run();
