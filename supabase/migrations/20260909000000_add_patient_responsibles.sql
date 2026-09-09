-- Add repeatable responsible contacts to patient records.
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS responsibles jsonb NOT NULL DEFAULT '[]'::jsonb;
