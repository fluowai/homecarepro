-- Migration: Add Anamnesis to patients table
ALTER TABLE public.patients ADD COLUMN IF NOT EXISTS anamnesis jsonb DEFAULT '{}'::jsonb;
