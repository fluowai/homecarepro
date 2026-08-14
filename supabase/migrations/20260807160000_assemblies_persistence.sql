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
