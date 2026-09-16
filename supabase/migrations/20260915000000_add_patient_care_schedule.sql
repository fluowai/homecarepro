ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS care_schedule jsonb;

COMMENT ON COLUMN public.patients.care_schedule IS
  'Configuração opcional usada para criar a escala inicial do paciente no cadastro.';
