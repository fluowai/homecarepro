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
