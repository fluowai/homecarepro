-- Adiciona os novos campos de PAD estruturado e Pacote Diário na tabela patients
ALTER TABLE public.patients
ADD COLUMN IF NOT EXISTS pad_items JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS daily_package_value NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS daily_package_shifts INTEGER;

-- Adiciona os campos de pacientes vinculados no credenciamento do profissional
ALTER TABLE public.professionals
ADD COLUMN IF NOT EXISTS attended_patients JSONB DEFAULT '[]'::jsonb;
