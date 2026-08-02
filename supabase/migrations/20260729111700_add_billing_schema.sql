-- ============================================================================
-- Migration: Add Billing and Asaas Integration Schema
-- ============================================================================

-- 1. Add Asaas Customer ID to Tenants
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS asaas_customer_id text;

-- 2. Subscriptions Table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id text NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  asaas_subscription_id text UNIQUE,
  plan text NOT NULL,
  status text DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'OVERDUE', 'CANCELED')),
  value numeric(10,2) NOT NULL,
  billing_type text DEFAULT 'CREDIT_CARD',
  next_due_date date,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. Invoices (Charges) Table
CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id text NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  asaas_payment_id text UNIQUE NOT NULL,
  value numeric(10,2) NOT NULL,
  net_value numeric(10,2),
  status text NOT NULL CHECK (status IN ('PENDING', 'RECEIVED', 'CONFIRMED', 'OVERDUE', 'REFUNDED', 'RECEIVED_IN_CASH', 'REFUND_REQUESTED', 'CHARGEBACK_REQUESTED', 'CHARGEBACK_DISPUTE', 'AWAITING_CHARGEBACK_REVERSAL', 'DUNNING_REQUESTED', 'DUNNING_RECEIVED', 'AWAITING_RISK_ANALYSIS')),
  due_date date NOT NULL,
  payment_date date,
  invoice_url text,
  bank_slip_url text,
  pix_qr_code_payload text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4. RLS for Billing
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- Tenants can see their own subscriptions
CREATE POLICY "Tenant can view own subscriptions" ON public.subscriptions
  FOR SELECT USING (public.has_tenant_access(tenant_id));

-- Tenants can see their own invoices
CREATE POLICY "Tenant can view own invoices" ON public.invoices
  FOR SELECT USING (public.has_tenant_access(tenant_id));

-- Only Mega Admins can manage subscriptions manually if needed
CREATE POLICY "Mega Admins manage subscriptions" ON public.subscriptions
  FOR ALL USING ((SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'mega_admin');

CREATE POLICY "Mega Admins manage invoices" ON public.invoices
  FOR ALL USING ((SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'mega_admin');
