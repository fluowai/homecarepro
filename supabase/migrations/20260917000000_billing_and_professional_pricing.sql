ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS billing_settings jsonb NOT NULL DEFAULT '{"collectionMode":"manual","dueDay":5,"autoGenerate":false}'::jsonb;

ALTER TABLE public.professionals
  ADD COLUMN IF NOT EXISTS pricing_rules jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.tenants.billing_settings IS
  'Configuração de faturamento do tenant: cobrança manual ou automática e dia de vencimento.';

COMMENT ON COLUMN public.professionals.pricing_rules IS
  'Tabela de valores por paciente/serviço e duração do plantão.';
