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

-- 7. UPDATED_AT TRIGGER (maintains updated_at on row modification)
-- ============================================================================
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql security definer;

-- Apply updated_at trigger to tables that have the column
DO $$
declare
  t text;
begin
  for t in
    select tablename
    from pg_tables
    where schemaname = 'public'
      and tablename in ('patients', 'professionals', 'visits', 'leads', 'messages', 'medicines', 'surveys', 'subscriptions', 'invoices', 'saas_plans', 'support_tickets', 'tenant_invitations', 'contracts', 'proposals', 'health_insurances')
      and exists (
        select 1 from information_schema.columns
        where table_schema = 'public' and table_name = pg_tables.tablename and column_name = 'updated_at'
      )
  loop
    execute format('create trigger set_updated_at_%I before update on public.%I for each row execute function public.set_updated_at()', t, t);
  end loop;
end $$;

