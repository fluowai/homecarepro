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
