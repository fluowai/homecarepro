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
