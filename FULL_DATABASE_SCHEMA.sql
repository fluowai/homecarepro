-- Migration: 20260726000000_initial_schema.sql
-- ============================================================================
-- HomeCare Pro - Initial Database Schema
-- Run with: supabase db push  (or paste into Supabase SQL Editor)
-- ============================================================================

-- 1. EXTENSIONS
-- ============================================================================
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- 2. HELPER: get current user's tenant
-- ============================================================================
create or replace function public.get_user_tenant_id()
returns text as $$
  select tenant_id from public.user_profiles where id = auth.uid()
$$ language sql security definer stable;

-- 3. TABLES
-- ============================================================================

-- Tenants (multi-tenant root)
create table public.tenants (
  id        text primary key,
  name      text not null,
  logo      text default '',
  cnpj      text not null,
  plan      text default 'Free',
  created_at timestamptz default now()
);

-- User profiles (extends auth.users)
create table public.user_profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  tenant_id  text not null references public.tenants(id) on delete cascade,
  full_name  text not null,
  role       text default 'operator' check (role in ('admin', 'operator', 'viewer')),
  avatar_url text default '',
  created_at timestamptz default now()
);

-- Patients
create table public.patients (
  id          text primary key,
  tenant_id   text not null references public.tenants(id) on delete cascade,
  name        text not null,
  birth_date  text default '',
  cpf         text default '',
  phone       text default '',
  email       text default '',
  status      text default 'active' check (status in ('active', 'inactive')),
  plan_type   text default 'Particular',
  avatar      text default '',
  diagnostic  text default '',
  allergies   jsonb default '[]'::jsonb,
  medications jsonb default '[]'::jsonb,
  files       jsonb default '[]'::jsonb,
  timeline    jsonb default '[]'::jsonb,
  address     jsonb default '{}'::jsonb,
  summary_ai  text default '',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- Professionals
create table public.professionals (
  id          text primary key,
  tenant_id   text not null references public.tenants(id) on delete cascade,
  name        text not null,
  specialty   text not null default 'Enfermeiro',
  registration text default '',
  status      text default 'active' check (status in ('active', 'busy', 'offline')),
  email       text default '',
  phone       text default '',
  avatar      text default '',
  rating      numeric(2,1) default 5.0,
  created_at  timestamptz default now()
);

-- Visits
create table public.visits (
  id               text primary key,
  tenant_id        text not null references public.tenants(id) on delete cascade,
  patient_id       text not null references public.patients(id) on delete cascade,
  professional_id  text not null references public.professionals(id) on delete cascade,
  date             text not null,
  time_start       text not null,
  time_end         text not null,
  status           text default 'agendada' check (status in ('agendada', 'em_andamento', 'concluida', 'cancelada')),
  check_in_time    text,
  check_out_time   text,
  check_in_location  text,
  check_out_location text,
  report           text default '',
  value            numeric(10,2) default 0,
  created_at       timestamptz default now()
);

-- CRM Leads
create table public.leads (
  id               text primary key,
  tenant_id        text not null references public.tenants(id) on delete cascade,
  name             text not null,
  phone            text default '',
  email            text default '',
  status           text default 'lead' check (status in ('lead', 'avaliacao', 'proposta', 'fechado')),
  source           text default '',
  estimated_value  numeric(10,2) default 0,
  last_interaction text default '',
  notes            text default '',
  created_at       timestamptz default now()
);

-- Messages
create table public.messages (
  id          text primary key,
  tenant_id   text not null references public.tenants(id) on delete cascade,
  patient_id  text not null references public.patients(id) on delete cascade,
  sender      text not null check (sender in ('patient', 'system', 'operator')),
  text        text not null,
  "timestamp" timestamptz default now(),
  read        boolean default false
);

-- Medicines
create table public.medicines (
  id            text primary key,
  tenant_id     text not null references public.tenants(id) on delete cascade,
  name          text not null,
  dosage        text default '',
  manufacturer  text default '',
  expiry_date   text default '',
  quantity      integer default 0,
  min_quantity  integer default 0,
  created_at    timestamptz default now()
);

-- Survey Responses
create table public.surveys (
  id              text primary key,
  tenant_id       text not null references public.tenants(id) on delete cascade,
  visit_id        text references public.visits(id) on delete set null,
  patient_id      text references public.patients(id) on delete set null,
  professional_id text references public.professionals(id) on delete set null,
  rating          integer default 0,
  comment         text default '',
  date            text default '',
  channel         text default 'whatsapp' check (channel in ('whatsapp', 'sms')),
  sent_at         timestamptz default now(),
  responded_at    timestamptz
);

-- Survey Config (per tenant, single row)
create table public.survey_config (
  id              text primary key default 'default',
  tenant_id       text not null references public.tenants(id) on delete cascade unique,
  channel         text default 'whatsapp' check (channel in ('whatsapp', 'sms')),
  auto_send       boolean default true,
  message_template text default 'Olá! Gostaríamos de saber como foi o atendimento de hoje com o(a) profissional {professional_name}. Por favor, avalie em uma escala de 1 a 5 estrelas clicando no link: {survey_link}'
);

-- Alert Config (per tenant, single row)
create table public.alert_config (
  id                        text primary key default 'default',
  tenant_id                 text not null references public.tenants(id) on delete cascade unique,
  max_days_without_visit    integer default 7,
  expiry_warning_days       integer default 30,
  low_stock_threshold       integer default 5,
  enable_system_notifications boolean default true
);

-- 4. INDEXES
-- ============================================================================
create index idx_patients_tenant      on public.patients(tenant_id);
create index idx_professionals_tenant on public.professionals(tenant_id);
create index idx_visits_tenant        on public.visits(tenant_id);
create index idx_visits_date          on public.visits(date);
create index idx_visits_patient       on public.visits(patient_id);
create index idx_visits_professional  on public.visits(professional_id);
create index idx_leads_tenant         on public.leads(tenant_id);
create index idx_messages_tenant      on public.messages(tenant_id);
create index idx_messages_patient     on public.messages(patient_id);
create index idx_medicines_tenant     on public.medicines(tenant_id);
create index idx_surveys_tenant       on public.surveys(tenant_id);
create index idx_user_profiles_tenant on public.user_profiles(tenant_id);

-- 5. ROW LEVEL SECURITY
-- ============================================================================

alter table public.tenants         enable row level security;
alter table public.user_profiles   enable row level security;
alter table public.patients        enable row level security;
alter table public.professionals   enable row level security;
alter table public.visits          enable row level security;
alter table public.leads           enable row level security;
alter table public.messages        enable row level security;
alter table public.medicines       enable row level security;
alter table public.surveys         enable row level security;
alter table public.survey_config   enable row level security;
alter table public.alert_config    enable row level security;

-- Tenants: users can read their own tenant
create policy "Users can read own tenant"
  on public.tenants for select
  using (id = public.get_user_tenant_id());

-- User profiles: users can read/update their own profile
create policy "Users can read own profile"
  on public.user_profiles for select
  using (id = auth.uid());

create policy "Users can update own profile"
  on public.user_profiles for update
  using (id = auth.uid());

-- Tenant isolation policies (all data tables)
create policy "Tenant isolation" on public.patients
  for all using (tenant_id = public.get_user_tenant_id());

create policy "Tenant isolation" on public.professionals
  for all using (tenant_id = public.get_user_tenant_id());

create policy "Tenant isolation" on public.visits
  for all using (tenant_id = public.get_user_tenant_id());

create policy "Tenant isolation" on public.leads
  for all using (tenant_id = public.get_user_tenant_id());

create policy "Tenant isolation" on public.messages
  for all using (tenant_id = public.get_user_tenant_id());

create policy "Tenant isolation" on public.medicines
  for all using (tenant_id = public.get_user_tenant_id());

create policy "Tenant isolation" on public.surveys
  for all using (tenant_id = public.get_user_tenant_id());

create policy "Tenant isolation" on public.survey_config
  for all using (tenant_id = public.get_user_tenant_id());

create policy "Tenant isolation" on public.alert_config
  for all using (tenant_id = public.get_user_tenant_id());

-- 6. AUTH TRIGGER: auto-create user profile on signup
-- ============================================================================

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.user_profiles (id, tenant_id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'tenant_id', 'sp'),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    coalesce(new.raw_user_meta_data ->> 'role', 'operator')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- Migration: 20260726000001_seed_data.sql
-- ============================================================================
-- HomeCare Pro - Seed Data (Development / Demo)
-- Run after: 20260726000000_initial_schema.sql
-- ============================================================================

-- Demo tenants
insert into public.tenants (id, name, logo, cnpj, plan) values
  ('sp', 'HomeCare Pro São Paulo', '🏥', '12.345.678/0001-99', 'Enterprise'),
  ('rj', 'Anjos do Lar Rio de Janeiro', '👼', '98.765.432/0001-11', 'Pro')
on conflict (id) do nothing;

-- Demo patients
insert into public.patients (id, tenant_id, name, birth_date, cpf, phone, email, status, plan_type, avatar, diagnostic, allergies, medications, address, summary_ai) values
  ('pat-1', 'sp', 'Dona Francisca Ribeiro Silva', '1948-04-12', '123.456.789-00', '(11) 98111-2233', 'francisca.silva@demo.com', 'active', 'Bradesco Saúde', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=120', 'Alzheimer Estágio Moderado, Hipertensão Arterial e Osteoporose.', '["Penicilina","Iodo"]'::jsonb, '["Aricept (Donepezila) 10mg - 1x ao dia (noite)","Losartana 50mg - 2x ao dia","Melatonina 3mg - 1x ao dia"]'::jsonb, '{"street":"Rua das Palmeiras","number":"425","city":"São Paulo","state":"SP","zipCode":"01226-010"}'::jsonb, 'Paciente de 78 anos, Alzheimer moderado com comorbidades vasculares. Risco moderado de queda. Alérgica a Penicilina.'),
  ('pat-2', 'sp', 'Seu Geraldo de Souza', '1942-09-28', '234.567.890-11', '(11) 97222-3344', 'geraldo.souza@demo.com', 'active', 'Particular', 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=120', 'Pós-Operatório de Artroplastia Total de Quadril Direito, Diabetes Mellitus Tipo 2.', '["Dipirona"]'::jsonb, '["Metformina 850mg - 2x ao dia","Clexane 40mg SC - 1x ao dia","Tramal 50mg - se dor forte"]'::jsonb, '{"street":"Avenida Brigadeiro Luís Antônio","number":"2300","city":"São Paulo","state":"SP","zipCode":"01318-002"}'::jsonb, 'Paciente idoso de 84 anos, pós-artroplastia de quadril. Alérgico a Dipirona.'),
  ('pat-3', 'sp', 'Ana Júlia de Albuquerque', '2016-06-15', '345.678.901-22', '(11) 96333-4455', 'mae.anajulia@demo.com', 'active', 'Unimed', 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=120', 'Paralisia Cerebral Espástica GMFCS V, Traqueostomizada e Gastrostomizada.', '["Látex","Sulfa"]'::jsonb, '["Baclofeno 10mg - 1/2 comprimido 3x ao dia","Fenobarbital 100mg - 1x ao dia (noite)","Gaviscon 5ml - após refeições"]'::jsonb, '{"street":"Rua Pamplona","number":"980","city":"São Paulo","state":"SP","zipCode":"01405-001"}'::jsonb, ''),
  ('pat-4', 'rj', 'Seu Moacyr Guimarães', '1939-11-05', '456.789.012-33', '(21) 98222-7788', 'moacyr.guimaraes@demo.com', 'active', 'Particular', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=120', 'DPOC Grave (Sequela de Tabagismo), Cardiopatia Isquêmica Crônica.', '["Nenhuma relatada"]'::jsonb, '["Spiriva Respimat - 2 puffs pela manhã","AAS 100mg - 1x ao dia","Carvedilol 6.25mg - 2x ao dia"]'::jsonb, '{"street":"Avenida Atlântica","number":"1200","city":"Rio de Janeiro","state":"RJ","zipCode":"22021-001"}'::jsonb, '')
on conflict (id) do nothing;

-- Demo professionals
insert into public.professionals (id, tenant_id, name, specialty, registration, status, email, phone, avatar, rating) values
  ('prof-1', 'sp', 'Dra. Mariana Costa', 'Enfermeiro', 'COREN-SP 432.109', 'active', 'mariana.costa@homecarepro.com', '(11) 98765-4321', 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=120', 4.9),
  ('prof-2', 'sp', 'Carlos Santos', 'Fisioterapeuta', 'CREFITO-SP 98.765', 'active', 'carlos.fisioterapeuta@homecarepro.com', '(11) 97654-3210', 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=120', 5.0),
  ('prof-3', 'sp', 'Thiago Silva', 'Técnico de Enfermagem', 'COREN-TE 112.334', 'busy', 'thiago.tecnico@homecarepro.com', '(11) 96543-2109', 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=120', 4.7),
  ('prof-4', 'sp', 'Dr. Roberto Almeida', 'Médico', 'CRM-SP 180.456', 'offline', 'roberto.almeida@homecarepro.com', '(11) 95432-1098', 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=120', 4.9),
  ('prof-5', 'rj', 'Dra. Eliane Pires', 'Enfermeiro', 'COREN-RJ 220.180', 'active', 'eliane.pires@homecarepro.com', '(21) 98777-6655', 'https://images.unsplash.com/photo-1594824813573-246434de83fb?auto=format&fit=crop&q=80&w=120', 4.8)
on conflict (id) do nothing;

-- Demo medicines
insert into public.medicines (id, tenant_id, name, dosage, manufacturer, expiry_date, quantity, min_quantity) values
  ('med-1', 'sp', 'Aricept (Donepezila)', '10mg', 'Pfizer', (current_date + interval '120 days')::text, 45, 10),
  ('med-2', 'sp', 'Losartana Potássica', '50mg', 'Medley', (current_date + interval '240 days')::text, 90, 20),
  ('med-3', 'sp', 'Clexane (Enoxaparina)', '40mg SC', 'Sanofi', (current_date + interval '14 days')::text, 3, 5),
  ('med-4', 'sp', 'Fenobarbital', '100mg', 'Cristália', (current_date + interval '8 days')::text, 30, 5)
on conflict (id) do nothing;

-- Default alert config per tenant
insert into public.alert_config (id, tenant_id) values
  ('default', 'sp'),
  ('default', 'rj')
on conflict (id) do nothing;

-- Default survey config per tenant
insert into public.survey_config (id, tenant_id) values
  ('default', 'sp'),
  ('default', 'rj')
on conflict (id) do nothing;


-- Migration: 20260727131000_add_saas_hierarchy.sql
-- ============================================================================
-- Migration: Add SaaS Hierarchy (Mega Admin, Super Admin, Whitelabel)
-- ============================================================================

-- 1. Alter Tenants Table
-- ============================================================================
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS parent_id text REFERENCES public.tenants(id),
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blocked')),
  ADD COLUMN IF NOT EXISTS custom_domain text,
  ADD COLUMN IF NOT EXISTS primary_color text,
  ADD COLUMN IF NOT EXISTS secondary_color text;

-- Create a "System" tenant for Mega Admins if it doesn't exist
INSERT INTO public.tenants (id, name, cnpj, plan)
VALUES ('system', 'System Administration', '00.000.000/0000-00', 'Mega')
ON CONFLICT (id) DO NOTHING;

-- 2. Alter User Profiles Table
-- ============================================================================
-- We need to drop the existing role check constraint and recreate it
DO $$
DECLARE
    constraint_name text;
BEGIN
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'public.user_profiles'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%role%';
      
    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.user_profiles DROP CONSTRAINT ' || constraint_name;
    END IF;
END $$;

ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_role_check 
  CHECK (role IN ('mega_admin', 'super_admin', 'admin', 'operator', 'professional', 'patient', 'viewer'));

-- 3. Create User Tenants Junction Table (For professionals/users in multiple clinics)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_tenants (
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id text REFERENCES public.tenants(id) ON DELETE CASCADE,
    role text DEFAULT 'operator',
    created_at timestamptz DEFAULT now(),
    PRIMARY KEY (user_id, tenant_id)
);

ALTER TABLE public.user_tenants ENABLE ROW LEVEL SECURITY;

-- 4. Centralized Access Function
-- ============================================================================
CREATE OR REPLACE FUNCTION public.has_tenant_access(target_tenant_id text)
RETURNS boolean AS $$
DECLARE
    v_user_role text;
    v_user_tenant_id text;
    v_user_id uuid;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN RETURN false; END IF;

    -- Get user primary role and tenant_id
    SELECT role, tenant_id INTO v_user_role, v_user_tenant_id
    FROM public.user_profiles
    WHERE id = v_user_id;
    
    -- Mega admin has access to everything
    IF v_user_role = 'mega_admin' THEN
        RETURN true;
    END IF;
    
    -- If it's the exact same primary tenant
    IF v_user_tenant_id = target_tenant_id THEN
        RETURN true;
    END IF;

    -- If user has secondary access via user_tenants (e.g. professional in multiple clinics)
    IF EXISTS (SELECT 1 FROM public.user_tenants WHERE user_id = v_user_id AND tenant_id = target_tenant_id) THEN
        RETURN true;
    END IF;
    
    -- If user is super_admin (reseller), check if target is a child tenant
    IF v_user_role = 'super_admin' THEN
        RETURN EXISTS (
            SELECT 1 FROM public.tenants 
            WHERE id = target_tenant_id AND parent_id = v_user_tenant_id
        );
    END IF;
    
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 5. Replace RLS Policies
-- ============================================================================
-- We drop the old "Tenant isolation" and replace with "Tenant access" using the new function.

DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT unnest(ARRAY['patients', 'professionals', 'visits', 'leads', 'messages', 'medicines', 'surveys', 'survey_config', 'alert_config'])
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Tenant isolation" ON public.%I', t);
        EXECUTE format('CREATE POLICY "Tenant access" ON public.%I FOR ALL USING (public.has_tenant_access(tenant_id))', t);
    END LOOP;
END $$;

-- Update Tenants policy to allow Super Admins to see their sub-tenants
DROP POLICY IF EXISTS "Users can read own tenant" ON public.tenants;
CREATE POLICY "Tenant access" ON public.tenants
  FOR SELECT USING (public.has_tenant_access(id) OR public.has_tenant_access(parent_id));

-- For Inserts/Updates on tenants, only Mega Admin and Super Admin can create/update child tenants
CREATE POLICY "Tenant management" ON public.tenants
  FOR ALL USING (
    (SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'mega_admin'
    OR 
    ( (SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'super_admin' AND parent_id = (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()) )
  );

-- Update user_tenants RLS
CREATE POLICY "User tenants access" ON public.user_tenants
  FOR ALL USING (user_id = auth.uid() OR public.has_tenant_access(tenant_id));

-- 6. Trigger to populate user_tenants automatically for primary tenant
-- ============================================================================
CREATE OR REPLACE FUNCTION public.sync_user_primary_tenant()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_tenants (user_id, tenant_id, role)
  VALUES (NEW.id, NEW.tenant_id, NEW.role)
  ON CONFLICT (user_id, tenant_id) DO UPDATE SET role = EXCLUDED.role;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_user_profile_created ON public.user_profiles;
CREATE TRIGGER on_user_profile_created
  AFTER INSERT OR UPDATE OF tenant_id, role ON public.user_profiles
  FOR EACH ROW EXECUTE PROCEDURE public.sync_user_primary_tenant();


-- Migration: 20260727140000_full_system_schema.sql
-- ============================================================================
-- HomeCare Pro - Master Database Schema (SaaS / Whitelabel)
-- Você pode rodar este script diretamente no SQL Editor do Supabase.
-- ATENÇÃO: As tabelas usam "IF NOT EXISTS", portanto é seguro rodar por cima.
-- ============================================================================

-- 1. EXTENSIONS
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- 2. TABLES
-- ============================================================================

-- Tenants (multi-tenant root with SaaS hierarchy)
create table if not exists public.tenants (
  id              text primary key,
  parent_id       text references public.tenants(id),
  name            text not null,
  logo            text default '',
  cnpj            text not null,
  plan            text default 'Free',
  status          text default 'active' check (status in ('active', 'inactive', 'blocked')),
  custom_domain   text,
  primary_color   text,
  secondary_color text,
  created_at      timestamptz default now()
);

-- User profiles (extends auth.users)
create table if not exists public.user_profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  tenant_id  text not null references public.tenants(id) on delete cascade,
  full_name  text not null,
  role       text default 'operator' check (role in ('mega_admin', 'super_admin', 'admin', 'operator', 'professional', 'patient', 'viewer')),
  avatar_url text default '',
  created_at timestamptz default now()
);

-- User Tenants (Junction for multi-clinic professionals)
create table if not exists public.user_tenants (
  user_id    uuid references auth.users(id) on delete cascade,
  tenant_id  text references public.tenants(id) on delete cascade,
  role       text default 'operator',
  created_at timestamptz default now(),
  primary key (user_id, tenant_id)
);

-- Health Insurances (Convênios)
create table if not exists public.health_insurances (
  id             text primary key,
  tenant_id      text not null references public.tenants(id) on delete cascade,
  name           text not null,
  phone          text default '',
  email          text default '',
  contact_person text default '',
  created_at     timestamptz default now()
);

-- Patients
create table if not exists public.patients (
  id          text primary key,
  tenant_id   text not null references public.tenants(id) on delete cascade,
  name        text not null,
  birth_date  text default '',
  cpf         text default '',
  gender      text check (gender in ('M', 'F', 'O')),
  phone       text default '',
  email       text default '',
  status      text default 'active' check (status in ('active', 'inactive')),
  plan_type   text default 'Particular',
  insurance_id text references public.health_insurances(id) on delete set null,
  monthly_package_value numeric(10,2),
  pad_scope   text,
  avatar      text default '',
  diagnostic  text default '',
  allergies   jsonb default '[]'::jsonb,
  medications jsonb default '[]'::jsonb,
  files       jsonb default '[]'::jsonb,
  timeline    jsonb default '[]'::jsonb,
  inventory   jsonb default '[]'::jsonb,
  address     jsonb default '{}'::jsonb,
  summary_ai  text default '',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- Professionals
create table if not exists public.professionals (
  id          text primary key,
  tenant_id   text not null references public.tenants(id) on delete cascade,
  name        text not null,
  cpf         text default '',
  gender      text check (gender in ('M', 'F', 'O')),
  specialty   text not null default 'Enfermeiro',
  registration text default '',
  status      text default 'active' check (status in ('active', 'busy', 'offline')),
  email       text default '',
  phone       text default '',
  avatar      text default '',
  rating      numeric(2,1) default 5.0,
  address     jsonb default '{}'::jsonb,
  documents   jsonb default '[]'::jsonb,
  stamp_signature_url text,
  created_at  timestamptz default now()
);

-- Visits
create table if not exists public.visits (
  id               text primary key,
  tenant_id        text not null references public.tenants(id) on delete cascade,
  patient_id       text not null references public.patients(id) on delete cascade,
  professional_id  text not null references public.professionals(id) on delete cascade,
  date             text not null,
  time_start       text not null,
  time_end         text not null,
  status           text default 'agendada' check (status in ('agendada', 'em_andamento', 'concluida', 'cancelada')),
  check_in_time    text,
  check_out_time   text,
  check_in_location  text,
  check_out_location text,
  check_in_coords  jsonb,
  check_out_coords jsonb,
  report           text default '',
  value            numeric(10,2) default 0,
  created_at       timestamptz default now()
);

-- CRM Leads
create table if not exists public.leads (
  id               text primary key,
  tenant_id        text not null references public.tenants(id) on delete cascade,
  name             text not null,
  phone            text default '',
  email            text default '',
  status           text default 'lead' check (status in ('lead', 'avaliacao', 'proposta', 'fechado')),
  source           text default '',
  estimated_value  numeric(10,2) default 0,
  last_interaction text default '',
  notes            text default '',
  created_at       timestamptz default now()
);

-- Messages
create table if not exists public.messages (
  id          text primary key,
  tenant_id   text not null references public.tenants(id) on delete cascade,
  patient_id  text not null references public.patients(id) on delete cascade,
  sender      text not null check (sender in ('patient', 'system', 'operator')),
  text        text not null,
  "timestamp" timestamptz default now(),
  read        boolean default false
);

-- Medicines
create table if not exists public.medicines (
  id            text primary key,
  tenant_id     text not null references public.tenants(id) on delete cascade,
  name          text not null,
  dosage        text default '',
  manufacturer  text default '',
  expiry_date   text default '',
  quantity      integer default 0,
  min_quantity  integer default 0,
  created_at    timestamptz default now()
);

-- Survey Responses
create table if not exists public.surveys (
  id              text primary key,
  tenant_id       text not null references public.tenants(id) on delete cascade,
  visit_id        text references public.visits(id) on delete set null,
  patient_id      text references public.patients(id) on delete set null,
  professional_id text references public.professionals(id) on delete set null,
  rating          integer default 0,
  comment         text default '',
  date            text default '',
  channel         text default 'whatsapp' check (channel in ('whatsapp', 'sms')),
  sent_at         timestamptz default now(),
  responded_at    timestamptz
);

-- Survey Config (per tenant, single row)
create table if not exists public.survey_config (
  id              text primary key default 'default',
  tenant_id       text not null references public.tenants(id) on delete cascade unique,
  channel         text default 'whatsapp' check (channel in ('whatsapp', 'sms')),
  auto_send       boolean default true,
  message_template text default 'Olá! Gostaríamos de saber como foi o atendimento de hoje com o(a) profissional {professional_name}. Por favor, avalie em uma escala de 1 a 5 estrelas clicando no link: {survey_link}'
);

-- Alert Config (per tenant, single row)
create table if not exists public.alert_config (
  id                        text primary key default 'default',
  tenant_id                 text not null references public.tenants(id) on delete cascade unique,
  max_days_without_visit    integer default 7,
  expiry_warning_days       integer default 30,
  low_stock_threshold       integer default 5,
  enable_system_notifications boolean default true
);

-- 3. FUNCTIONS
-- ============================================================================

-- HELPER: get current user's tenant
create or replace function public.get_user_tenant_id()
returns text as $$
  select tenant_id from public.user_profiles where id = auth.uid()
$$ language sql security definer stable;

-- CENTRALIZED ACCESS FUNCTION (SaaS / Whitelabel)
create or replace function public.has_tenant_access(target_tenant_id text)
returns boolean as $$
declare
    v_user_role text;
    v_user_tenant_id text;
    v_user_id uuid;
begin
    v_user_id := auth.uid();
    if v_user_id is null then return false; end if;

    -- Get user primary role and tenant_id
    select role, tenant_id into v_user_role, v_user_tenant_id
    from public.user_profiles
    where id = v_user_id;
    
    -- Mega admin has access to everything
    if v_user_role = 'mega_admin' then
        return true;
    end if;
    
    -- If it's the exact same primary tenant
    if v_user_tenant_id = target_tenant_id then
        return true;
    end if;

    -- If user has secondary access via user_tenants (e.g. professional in multiple clinics)
    if exists (select 1 from public.user_tenants where user_id = v_user_id and tenant_id = target_tenant_id) then
        return true;
    end if;
    
    -- If user is super_admin (reseller), check if target is a child tenant
    if v_user_role = 'super_admin' then
        return exists (
            select 1 from public.tenants 
            where id = target_tenant_id and parent_id = v_user_tenant_id
        );
    end if;
    
    return false;
end;
$$ language plpgsql security definer stable;

-- 4. INDEXES
-- ============================================================================
create index if not exists idx_patients_tenant      on public.patients(tenant_id);
create index if not exists idx_professionals_tenant on public.professionals(tenant_id);
create index if not exists idx_visits_tenant        on public.visits(tenant_id);
create index if not exists idx_visits_date          on public.visits(date);
create index if not exists idx_visits_patient       on public.visits(patient_id);
create index if not exists idx_visits_professional  on public.visits(professional_id);
create index if not exists idx_leads_tenant         on public.leads(tenant_id);
create index if not exists idx_messages_tenant      on public.messages(tenant_id);
create index if not exists idx_medicines_tenant     on public.medicines(tenant_id);
create index if not exists idx_surveys_tenant       on public.surveys(tenant_id);
create index if not exists idx_user_profiles_tenant on public.user_profiles(tenant_id);
create index if not exists idx_health_insurances_tenant on public.health_insurances(tenant_id);
create index if not exists idx_user_tenants_tenant  on public.user_tenants(tenant_id);
create index if not exists idx_user_tenants_user    on public.user_tenants(user_id);

-- 5. ROW LEVEL SECURITY (RLS)
-- ============================================================================
alter table public.tenants           enable row level security;
alter table public.user_profiles     enable row level security;
alter table public.user_tenants      enable row level security;
alter table public.health_insurances enable row level security;
alter table public.patients          enable row level security;
alter table public.professionals     enable row level security;
alter table public.visits            enable row level security;
alter table public.leads             enable row level security;
alter table public.messages          enable row level security;
alter table public.medicines         enable row level security;
alter table public.surveys           enable row level security;
alter table public.survey_config     enable row level security;
alter table public.alert_config      enable row level security;

-- Drop all existing policies to avoid duplicates during update
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON public.' || quote_ident(r.tablename);
    END LOOP;
END $$;

-- Tenants RLS
create policy "Tenant access" on public.tenants
  for select using (public.has_tenant_access(id) or public.has_tenant_access(parent_id));

create policy "Tenant management" on public.tenants
  for all using (
    (select role from public.user_profiles where id = auth.uid()) = 'mega_admin'
    or 
    ( (select role from public.user_profiles where id = auth.uid()) = 'super_admin' and parent_id = (select tenant_id from public.user_profiles where id = auth.uid()) )
  );

-- User profiles RLS
create policy "Users can read own profile"
  on public.user_profiles for select
  using (id = auth.uid());

create policy "Users can update own profile"
  on public.user_profiles for update
  using (id = auth.uid());

-- User tenants RLS
create policy "User tenants access" on public.user_tenants
  for all using (user_id = auth.uid() or public.has_tenant_access(tenant_id));

-- Generic Tenant Isolation Policies
create policy "Tenant access" on public.health_insurances for all using (public.has_tenant_access(tenant_id));
create policy "Tenant access" on public.patients for all using (public.has_tenant_access(tenant_id));
create policy "Tenant access" on public.professionals for all using (public.has_tenant_access(tenant_id));
create policy "Tenant access" on public.visits for all using (public.has_tenant_access(tenant_id));
create policy "Tenant access" on public.leads for all using (public.has_tenant_access(tenant_id));
create policy "Tenant access" on public.messages for all using (public.has_tenant_access(tenant_id));
create policy "Tenant access" on public.medicines for all using (public.has_tenant_access(tenant_id));
create policy "Tenant access" on public.surveys for all using (public.has_tenant_access(tenant_id));
create policy "Tenant access" on public.survey_config for all using (public.has_tenant_access(tenant_id));
create policy "Tenant access" on public.alert_config for all using (public.has_tenant_access(tenant_id));

-- 6. TRIGGERS
-- ============================================================================

-- Auto-create user profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.user_profiles (id, tenant_id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'tenant_id', 'sp'),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    coalesce(new.raw_user_meta_data ->> 'role', 'operator')
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users cascade;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Sync user_tenants when primary tenant changes
create or replace function public.sync_user_primary_tenant()
returns trigger as $$
begin
  insert into public.user_tenants (user_id, tenant_id, role)
  values (new.id, new.tenant_id, new.role)
  on conflict (user_id, tenant_id) do update set role = excluded.role;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_user_profile_created on public.user_profiles cascade;
create trigger on_user_profile_created
  after insert or update of tenant_id, role on public.user_profiles
  for each row execute procedure public.sync_user_primary_tenant();

-- 8. UPDATED_AT TRIGGER (maintains updated_at on row modification)
-- ============================================================================
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql security definer;

-- 7. SEED DATA (System Setup & Demo)
-- ============================================================================
-- System Tenant
insert into public.tenants (id, name, cnpj, plan) values
  ('system', 'System Administration', '00.000.000/0000-00', 'Mega')
on conflict (id) do nothing;

-- Reseller and Clinics
insert into public.tenants (id, parent_id, name, logo, cnpj, plan) values
  ('sp', null, 'HomeCare Pro São Paulo', '🏥', '12.345.678/0001-99', 'Enterprise'),
  ('rj', null, 'Anjos do Lar Rio de Janeiro', '👼', '98.765.432/0001-11', 'Pro'),
  ('clinic1', 'sp', 'Clínica Bem Estar SP', '⚕️', '11.222.333/0001-44', 'Basic')
on conflict (id) do nothing;

-- Health Insurances
insert into public.health_insurances (id, tenant_id, name, phone, email) values
  ('hi-1', 'sp', 'Bradesco Saúde', '0800 701 2700', 'autorizacao@bradescosaude.com.br'),
  ('hi-2', 'sp', 'SulAmérica', '0800 722 0504', 'autorizacao@sulamerica.com.br'),
  ('hi-3', 'rj', 'Amil', '0800 021 2583', 'autorizacao@amil.com.br')
on conflict (id) do nothing;

-- Default Configs
insert into public.alert_config (id, tenant_id) values
  ('default', 'sp'), ('default', 'rj'), ('default', 'clinic1')
on conflict (id) do nothing;

insert into public.survey_config (id, tenant_id) values
  ('default', 'sp'), ('default', 'rj'), ('default', 'clinic1')
on conflict (id) do nothing;


-- Migration: 20260729111700_add_billing_schema.sql
-- ============================================================================
-- Migration: Add Billing and Asaas Integration Schema
-- ============================================================================

-- 1. Add Asaas Customer ID to Tenants
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS asaas_customer_id text;

-- 2. Subscriptions Table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id text NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  asaas_subscription_id text UNIQUE,
  plan text NOT NULL,
  status text DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'OVERDUE', 'CANCELED')),
  value numeric(10,2) NOT NULL,
  billing_type text DEFAULT 'CREDIT_CARD',
  next_due_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. Invoices (Charges) Table
CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id text NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  asaas_payment_id text UNIQUE NOT NULL,
  value numeric(10,2) NOT NULL,
  net_value numeric(10,2),
  status text NOT NULL CHECK (status IN ('PENDING', 'RECEIVED', 'CONFIRMED', 'OVERDUE', 'REFUNDED', 'RECEIVED_IN_CASH', 'REFUND_REQUESTED', 'CHARGEBACK_REQUESTED', 'CHARGEBACK_DISPUTE', 'AWAITING_CHARGEBACK_REVERSAL', 'DUNNING_REQUESTED', 'DUNNING_RECEIVED', 'AWAITING_RISK_ANALYSIS')),
  due_date date NOT NULL,
  payment_date date,
  invoice_url text,
  bank_slip_url text,
  pix_qr_code_payload text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4. RLS for Billing
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Tenants can see their own subscriptions
CREATE POLICY "Tenant can view own subscriptions" ON public.subscriptions
  FOR SELECT USING (public.has_tenant_access(tenant_id));

-- Tenants can see their own invoices
CREATE POLICY "Tenant can view own invoices" ON public.invoices
  FOR SELECT USING (public.has_tenant_access(tenant_id));

-- Only Mega Admins can manage subscriptions manually if needed
CREATE POLICY "Mega Admins manage subscriptions" ON public.subscriptions
  FOR ALL USING ((SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'mega_admin');

CREATE POLICY "Mega Admins manage invoices" ON public.invoices
  FOR ALL USING ((SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'mega_admin');


-- Migration: 20260803000000_add_plans_and_support.sql
-- ============================================================================
-- Migration: Add SaaS Plans and Support Tickets
-- ============================================================================

-- 1. SaaS Plans Table
CREATE TABLE IF NOT EXISTS public.saas_plans (
  id text PRIMARY KEY, -- e.g., 'free', 'pro', 'enterprise', 'mega'
  name text NOT NULL,
  price numeric(10,2) DEFAULT 0,
  max_patients integer DEFAULT 10,
  max_users integer DEFAULT 3,
  features jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.saas_plans ENABLE ROW LEVEL SECURITY;

-- Mega Admin can do anything with plans. Super Admin and others can only read.
CREATE POLICY "Mega admin full access plans" ON public.saas_plans
  FOR ALL USING ((SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'mega_admin');

CREATE POLICY "Everyone can read plans" ON public.saas_plans
  FOR SELECT USING (true);


-- 2. Support Tickets Table
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id text NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject text NOT NULL,
  status text DEFAULT 'open' CHECK (status IN ('open', 'pending', 'closed')),
  priority text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mega admin full access tickets" ON public.support_tickets
  FOR ALL USING ((SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'mega_admin');

-- Super Admin and Admins can manage tickets for their tenant and child tenants
CREATE POLICY "Tenant admins manage tickets" ON public.support_tickets
  FOR ALL USING (public.has_tenant_access(tenant_id));


-- 3. Support Ticket Messages Table
CREATE TABLE IF NOT EXISTS public.ticket_messages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mega admin full access ticket messages" ON public.ticket_messages
  FOR ALL USING ((SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'mega_admin');

-- Tenant users can read/write messages to tickets they have access to
CREATE POLICY "Tenant users manage ticket messages" ON public.ticket_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets t 
      WHERE t.id = ticket_id AND public.has_tenant_access(t.tenant_id)
    )
  );

-- 4. Insert Default Plans
INSERT INTO public.saas_plans (id, name, price, max_patients, max_users, features)
VALUES 
  ('free', 'Free', 0, 10, 3, '["Básico", "Suporte Email"]'::jsonb),
  ('pro', 'Pro', 299.90, 100, 10, '["Intermediário", "Suporte Whatsapp"]'::jsonb),
  ('enterprise', 'Enterprise', 999.90, 9999, 999, '["Avançado", "Gerente de Conta"]'::jsonb),
  ('mega', 'Mega (System)', 0, 9999, 999, '["Tudo"]'::jsonb)
ON CONFLICT (id) DO NOTHING;


-- Migration: 20260804000000_expand_mega_admin.sql
-- ============================================================================
-- Migration: Expand Mega Admin Roles and Policies
-- ============================================================================

-- 1. Update user_profiles role check constraint
-- ============================================================================
DO $$
DECLARE
    constraint_name text;
BEGIN
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'public.user_profiles'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%role%';
      
    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.user_profiles DROP CONSTRAINT ' || constraint_name;
    END IF;
END $$;

ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_role_check 
  CHECK (role IN ('mega_admin', 'super_admin', 'admin', 'operator', 'professional', 'patient', 'viewer', 'system_support'));

-- 2. Expand RLS for Mega Admin
-- ============================================================================

-- Allow Mega Admin to read/update all user profiles globally
DROP POLICY IF EXISTS "Mega Admin global user_profiles access" ON public.user_profiles;
CREATE POLICY "Mega Admin global user_profiles access" ON public.user_profiles
  FOR ALL USING (
    (SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'mega_admin'
  );

-- Ensure Mega Admin has full access to all Tenants (already somewhat there, but making sure)
DROP POLICY IF EXISTS "Mega Admin global tenants access" ON public.tenants;
CREATE POLICY "Mega Admin global tenants access" ON public.tenants
  FOR ALL USING (
    (SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'mega_admin'
  );


-- Migration: 20260804000001_fix_rls_recursion.sql
-- ============================================================================
-- Fix infinite recursion in RLS for Mega Admin
-- ============================================================================

-- Create security definer function to bypass RLS for role checks
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text AS $$
  SELECT role FROM public.user_profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Drop the recursive policy
DROP POLICY IF EXISTS "Mega Admin global user_profiles access" ON public.user_profiles;

-- Create the new non-recursive policy using the security definer function
CREATE POLICY "Mega Admin global user_profiles access" ON public.user_profiles
  FOR ALL USING (
    public.get_user_role() = 'mega_admin'
  );

-- Update the tenants policy as well to use the safer function
DROP POLICY IF EXISTS "Mega Admin global tenants access" ON public.tenants;
CREATE POLICY "Mega Admin global tenants access" ON public.tenants
  FOR ALL USING (
    public.get_user_role() = 'mega_admin'
  );


-- Migration: 20260804000002_harden_rls_functions.sql
-- ============================================================================
-- Harden SECURITY DEFINER functions used by RLS
-- Sets an explicit search_path so schema resolution cannot be hijacked.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text AS $$
  SELECT role FROM public.user_profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE
  SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS text AS $$
  SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE
  SET search_path = public;

CREATE OR REPLACE FUNCTION public.has_tenant_access(target_tenant_id text)
RETURNS boolean AS $$
DECLARE
    v_user_role text;
    v_user_tenant_id text;
    v_user_id uuid;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN RETURN false; END IF;

    -- Get user primary role and tenant_id
    SELECT role, tenant_id INTO v_user_role, v_user_tenant_id
    FROM public.user_profiles
    WHERE id = v_user_id;

    -- Mega admin has access to everything
    IF v_user_role = 'mega_admin' THEN
        RETURN true;
    END IF;

    -- If it's the exact same primary tenant
    IF v_user_tenant_id = target_tenant_id THEN
        RETURN true;
    END IF;

    -- If user has secondary access via user_tenants (e.g. professional in multiple clinics)
    IF EXISTS (SELECT 1 FROM public.user_tenants WHERE user_id = v_user_id AND tenant_id = target_tenant_id) THEN
        RETURN true;
    END IF;

    -- If user is super_admin (reseller), check if target is a child tenant
    IF v_user_role = 'super_admin' THEN
        RETURN EXISTS (
            SELECT 1 FROM public.tenants
            WHERE id = target_tenant_id AND parent_id = v_user_tenant_id
        );
    END IF;

    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
  SET search_path = public;


-- Migration: 20260807000000_add_tenant_invitations.sql
-- ============================================================================
-- Migration: Tenant Invitations (Reseller & Clinic onboarding via invite link)
-- ============================================================================

-- 1. Invitations table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.tenant_invitations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id text NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    email text NOT NULL,
    role text NOT NULL DEFAULT 'super_admin' CHECK (role IN ('super_admin', 'admin')),
    token text NOT NULL UNIQUE,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
    expires_at timestamptz NOT NULL,
    accepted_at timestamptz,
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tenant_invitations_token ON public.tenant_invitations(token);
CREATE INDEX IF NOT EXISTS idx_tenant_invitations_tenant ON public.tenant_invitations(tenant_id);

ALTER TABLE public.tenant_invitations ENABLE ROW LEVEL SECURITY;

-- 2. Policies
-- ============================================================================
-- Mega admin can manage invitations globally (invite/revoke resellers)
DROP POLICY IF EXISTS "Mega Admin invitations" ON public.tenant_invitations;
CREATE POLICY "Mega Admin invitations" ON public.tenant_invitations
  FOR ALL USING (
    (SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'mega_admin'
  );

-- Super admin (reseller) can read invitations for its own tenant and child clinics
DROP POLICY IF EXISTS "Super Admin invitations read" ON public.tenant_invitations;
CREATE POLICY "Super Admin invitations read" ON public.tenant_invitations
  FOR SELECT USING (
    (SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'super_admin'
    AND public.has_tenant_access(tenant_id)
  );

-- 3. Helper: create invitation token
-- ============================================================================
CREATE OR REPLACE FUNCTION public.generate_invite_token()
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT encode(gen_random_bytes(32), 'hex');
$$;


-- Migration: 20260807150000_homecare_360_features.sql
-- Migration: HomeCare 360 Features
-- Adds Cooperativas, Check-in/out Photos, Controlled Medications, and Financial/Contract features

-- 1. Updates to Tenants (Cooperativas)
alter table public.tenants
  add column if not exists tenant_type text default 'homecare' check (tenant_type in ('homecare', 'cooperativa'));

-- 2. Updates to Visits (Check-in/out Photos)
alter table public.visits
  add column if not exists check_in_photo text,
  add column if not exists check_out_photo text;

-- 3. Updates to Medicines (Controlled Medications)
alter table public.medicines
  add column if not exists is_controlled boolean default false,
  add column if not exists control_class text; -- e.g., 'Tarja Preta', 'Tarja Vermelha'

create table if not exists public.medication_administrations (
  id              text primary key,
  tenant_id       text not null references public.tenants(id) on delete cascade,
  patient_id      text not null references public.patients(id) on delete cascade,
  medicine_id     text not null references public.medicines(id) on delete cascade,
  visit_id        text references public.visits(id) on delete set null,
  professional_id text not null references public.professionals(id) on delete cascade,
  quantity        integer not null,
  administered_at timestamptz default now(),
  notes           text default '',
  verified_by_pin boolean default false,
  created_at      timestamptz default now()
);

-- 4. CRM & Financial (Proposals, Contracts, Invoices)
create table if not exists public.proposals (
  id              text primary key,
  tenant_id       text not null references public.tenants(id) on delete cascade,
  lead_id         text not null references public.leads(id) on delete cascade,
  title           text not null,
  value           numeric(10,2) not null,
  status          text default 'draft' check (status in ('draft', 'sent', 'accepted', 'rejected')),
  pdf_url         text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create table if not exists public.contracts (
  id              text primary key,
  tenant_id       text not null references public.tenants(id) on delete cascade,
  patient_id      text not null references public.patients(id) on delete cascade,
  title           text not null,
  status          text default 'draft' check (status in ('draft', 'pending_signature', 'active', 'terminated')),
  pdf_url         text,
  signature_id    text, -- External signature ID (e.g., WooSign)
  start_date      text,
  end_date        text,
  value           numeric(10,2),
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create table if not exists public.invoices (
  id              text primary key,
  tenant_id       text not null references public.tenants(id) on delete cascade,
  patient_id      text not null references public.patients(id) on delete cascade,
  visit_id        text references public.visits(id) on delete set null,
  issue_date      text not null,
  due_date        text not null,
  value           numeric(10,2) not null,
  status          text default 'pending' check (status in ('pending', 'paid', 'canceled', 'failed')),
  nfe_url         text,
  nfe_id          text, -- External ID from invoicing provider (e.g., Asaas)
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- 5. Indexes
create index if not exists idx_med_admin_tenant on public.medication_administrations(tenant_id);
create index if not exists idx_proposals_tenant on public.proposals(tenant_id);
create index if not exists idx_contracts_tenant on public.contracts(tenant_id);
create index if not exists idx_invoices_tenant  on public.invoices(tenant_id);

-- 6. Row Level Security (RLS)
alter table public.medication_administrations enable row level security;
alter table public.proposals                  enable row level security;
alter table public.contracts                  enable row level security;
alter table public.invoices                   enable row level security;

create policy "Tenant access" on public.medication_administrations for all using (public.has_tenant_access(tenant_id));
create policy "Tenant access" on public.proposals                  for all using (public.has_tenant_access(tenant_id));
create policy "Tenant access" on public.contracts                  for all using (public.has_tenant_access(tenant_id));
create policy "Tenant access" on public.invoices                   for all using (public.has_tenant_access(tenant_id));

-- 7. Supabase Storage Bucket for Check-in Photos
-- Use anonymous block to conditionally insert bucket if storage schema exists
DO $$
BEGIN
    IF EXISTS (SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'storage') THEN
        INSERT INTO storage.buckets (id, name, public) 
        VALUES ('visit-photos', 'visit-photos', true) 
        ON CONFLICT (id) DO NOTHING;
    END IF;
END $$;


-- Migration: 20260807160000_assemblies_persistence.sql
-- Migration: Assemblies & Assembly Votes persistence
-- Persists cooperative assemblies and digital votes with tenant isolation.

-- 1. Assemblies
create table if not exists public.assemblies (
  id           text primary key,
  tenant_id    text not null references public.tenants(id) on delete cascade,
  title        text not null,
  description  text default '',
  status       text default 'draft' check (status in ('draft', 'active', 'completed')),
  date         text default '',
  document_url text,
  created_at   timestamptz default now()
);

-- 2. Assembly Votes (unique per assembly + professional to prevent double voting)
create table if not exists public.assembly_votes (
  id              text primary key,
  tenant_id       text not null references public.tenants(id) on delete cascade,
  assembly_id     text not null references public.assemblies(id) on delete cascade,
  professional_id text not null references public.professionals(id) on delete cascade,
  vote            text not null check (vote in ('approve', 'reject', 'abstain')),
  timestamp       text default '',
  created_at      timestamptz default now(),
  unique (assembly_id, professional_id)
);

-- 3. Indexes
create index if not exists idx_assemblies_tenant       on public.assemblies(tenant_id);
create index if not exists idx_assembly_votes_tenant   on public.assembly_votes(tenant_id);
create index if not exists idx_assembly_votes_assembly on public.assembly_votes(assembly_id);

-- 4. Row Level Security (RLS)
alter table public.assemblies     enable row level security;
alter table public.assembly_votes enable row level security;

create policy "Tenant access" on public.assemblies
  for all using (public.has_tenant_access(tenant_id));

create policy "Tenant access" on public.assembly_votes
  for all using (public.has_tenant_access(tenant_id));


-- Migration: 20260809120000_fix_invoices_schema.sql
-- Reconcile the `invoices` table between the Asaas billing schema and the
-- HomeCare 360 per-patient invoices.
--
-- The 20260729111700 billing migration created `invoices` (id uuid, asaas_payment_id).
-- The 20260807150000 360 migration tried to CREATE TABLE invoices again, but the
-- table already existed, so its per-patient columns were silently dropped.
-- This migration adds those columns to the existing table.

alter table public.invoices
  add column if not exists patient_id text references public.patients(id) on delete cascade,
  add column if not exists visit_id   text references public.visits(id) on delete set null,
  add column if not exists issue_date date,
  add column if not exists nfe_id     text,
  add column if not exists nfe_url    text,
  add column if not exists description text;

-- Manual (clinic-issued) invoices do not come from Asaas.
alter table public.invoices
  alter column asaas_payment_id drop not null;

-- Extend the status enum to support service invoices issued by the clinic.
alter table public.invoices drop constraint if exists invoices_status_check;
alter table public.invoices add constraint invoices_status_check check (
  status in (
    'PENDING','RECEIVED','CONFIRMED','OVERDUE','REFUNDED','RECEIVED_IN_CASH',
    'REFUND_REQUESTED','CHARGEBACK_REQUESTED','CHARGEBACK_DISPUTE',
    'AWAITING_CHARGEBACK_REVERSAL','DUNNING_REQUESTED','DUNNING_RECEIVED',
    'AWAITING_RISK_ANALYSIS','PAID','CANCELED','FAILED'
  )
);

create index if not exists idx_invoices_patient on public.invoices(patient_id);
create index if not exists idx_invoices_status on public.invoices(status);
