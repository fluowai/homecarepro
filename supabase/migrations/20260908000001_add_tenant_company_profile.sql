-- Company profile data belongs to each tenant independently.
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS company_legal_name text,
  ADD COLUMN IF NOT EXISTS company_trade_name text,
  ADD COLUMN IF NOT EXISTS company_email text,
  ADD COLUMN IF NOT EXISTS company_phone text,
  ADD COLUMN IF NOT EXISTS company_website text,
  ADD COLUMN IF NOT EXISTS company_address text,
  ADD COLUMN IF NOT EXISTS company_address_number text,
  ADD COLUMN IF NOT EXISTS company_address_complement text,
  ADD COLUMN IF NOT EXISTS company_neighborhood text,
  ADD COLUMN IF NOT EXISTS company_city text,
  ADD COLUMN IF NOT EXISTS company_state text,
  ADD COLUMN IF NOT EXISTS company_zip_code text;
