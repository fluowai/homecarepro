-- ============================================================================
-- Migration: Add SaaS Plans and Support Tickets
-- ============================================================================

-- 1. SaaS Plans Table
CREATE TABLE IF NOT EXISTS public.saas_plans (
  id text PRIMARY KEY, -- e.g., 'free', 'pro', 'enterprise', 'mega'
  name text NOT NULL,
  price numeric(10,2) DEFAULT 0,
  max_patients integer DEFAULT 10,
  max_users integer DEFAULT 3,
  features jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.saas_plans ENABLE ROW LEVEL SECURITY;

-- Mega Admin can do anything with plans. Super Admin and others can only read.
CREATE POLICY "Mega admin full access plans" ON public.saas_plans
  FOR ALL USING ((SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'mega_admin');

CREATE POLICY "Everyone can read plans" ON public.saas_plans
  FOR SELECT USING (true);


-- 2. Support Tickets Table
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id text NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject text NOT NULL,
  status text DEFAULT 'open' CHECK (status IN ('open', 'pending', 'closed')),
  priority text DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mega admin full access tickets" ON public.support_tickets
  FOR ALL USING ((SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'mega_admin');

-- Super Admin and Admins can manage tickets for their tenant and child tenants
CREATE POLICY "Tenant admins manage tickets" ON public.support_tickets
  FOR ALL USING (public.has_tenant_access(tenant_id));


-- 3. Support Ticket Messages Table
CREATE TABLE IF NOT EXISTS public.ticket_messages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Mega admin full access ticket messages" ON public.ticket_messages
  FOR ALL USING ((SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'mega_admin');

-- Tenant users can read/write messages to tickets they have access to
CREATE POLICY "Tenant users manage ticket messages" ON public.ticket_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.support_tickets t 
      WHERE t.id = ticket_id AND public.has_tenant_access(t.tenant_id)
    )
  );

-- 4. Insert Default Plans
INSERT INTO public.saas_plans (id, name, price, max_patients, max_users, features)
VALUES 
  ('free', 'Free', 0, 10, 3, '["Básico", "Suporte Email"]'::jsonb),
  ('pro', 'Pro', 299.90, 100, 10, '["Intermediário", "Suporte Whatsapp"]'::jsonb),
  ('enterprise', 'Enterprise', 999.90, 9999, 999, '["Avançado", "Gerente de Conta"]'::jsonb),
  ('mega', 'Mega (System)', 0, 9999, 999, '["Tudo"]'::jsonb)
ON CONFLICT (id) DO NOTHING;
