-- ============================================================================
-- Migration: Add HR, Doctor, Nurse, Caregiver roles & check-in features
-- ============================================================================

-- 1. Update user roles
-- ============================================================================
DO $$
DECLARE
    constraint_name text;
BEGIN
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'public.user_profiles'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%role%';

    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.user_profiles DROP CONSTRAINT ' || constraint_name;
    END IF;
END $$;

ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_role_check
  CHECK (role IN ('mega_admin', 'super_admin', 'tenant_owner', 'admin', 'hr', 'operator', 'doctor', 'nurse', 'caregiver', 'professional', 'patient', 'viewer', 'system_support', 'family'));

-- 2. Patient-Professional Links
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.patient_professional_links (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       text NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    patient_id      text NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    professional_id text NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
    is_primary      boolean DEFAULT false,
    created_at      timestamptz DEFAULT now(),
    UNIQUE (patient_id, professional_id)
);

ALTER TABLE public.patient_professional_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant access to patient_professional_links" ON public.patient_professional_links
  FOR ALL USING (public.has_tenant_access(tenant_id));

-- 3. Professional Balances (Financeiro / Hotmart Style)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.professional_balances (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       text NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    professional_id text NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
    available_amount numeric(10,2) DEFAULT 0,
    pending_amount   numeric(10,2) DEFAULT 0,
    created_at      timestamptz DEFAULT now(),
    updated_at      timestamptz DEFAULT now(),
    UNIQUE (professional_id)
);

ALTER TABLE public.professional_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Professionals can view own balances" ON public.professional_balances
  FOR SELECT USING (
    professional_id IN (
      SELECT id FROM public.professionals WHERE email = (SELECT email FROM auth.users WHERE auth.users.id = auth.uid())
    )
    OR public.has_tenant_access(tenant_id)
  );

CREATE POLICY "Tenant admins can manage balances" ON public.professional_balances
  FOR ALL USING (public.has_tenant_access(tenant_id));

-- 4. Balance Withdrawals (Saques)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.withdrawals (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       text NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    professional_id text NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
    amount          numeric(10,2) NOT NULL,
    status          text DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    pix_key         text NOT NULL,
    created_at      timestamptz DEFAULT now(),
    processed_at    timestamptz
);

ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant access to withdrawals" ON public.withdrawals
  FOR ALL USING (public.has_tenant_access(tenant_id));


-- 5. Add check-in photos and AI status to Visits
-- ============================================================================
ALTER TABLE public.visits
  ADD COLUMN IF NOT EXISTS check_in_photo text,
  ADD COLUMN IF NOT EXISTS check_out_photo text,
  ADD COLUMN IF NOT EXISTS ai_verified boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS ai_confidence numeric(5,2),
  ADD COLUMN IF NOT EXISTS check_in_status text DEFAULT 'pending' CHECK (check_in_status IN ('pending', 'waiting_approval', 'approved', 'rejected'));
