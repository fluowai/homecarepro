-- Contract services and fixed professional rates.
-- Expand-only migration: existing contracts and visits remain valid.

ALTER TABLE public.contracts
  ADD COLUMN IF NOT EXISTS schedule_description text,
  ADD COLUMN IF NOT EXISTS services jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.visits
  ADD COLUMN IF NOT EXISTS base_value numeric(10,2),
  ADD COLUMN IF NOT EXISTS contract_id text REFERENCES public.contracts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS contract_service_id text,
  ADD COLUMN IF NOT EXISTS billing_value numeric(10,2),
  ADD COLUMN IF NOT EXISTS generated_from_contract boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_visits_contract_service_date
  ON public.visits(contract_service_id, date);

COMMENT ON COLUMN public.contracts.services IS
  'JSON configuration of contracted services, recurrence rules and fixed professional rates.';
COMMENT ON COLUMN public.visits.value IS
  'Frozen professional payout for this visit; historical visits must not be recalculated.';
COMMENT ON COLUMN public.visits.billing_value IS
  'Frozen amount charged by the clinic for the contracted service.';
