-- ============================================================================
-- Migration: Add SaaS Hierarchy (Mega Admin, Super Admin, Whitelabel)
-- ============================================================================

-- 1. Alter Tenants Table
-- ============================================================================
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS parent_id text REFERENCES public.tenants(id),
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'blocked')),
  ADD COLUMN IF NOT EXISTS custom_domain text,
  ADD COLUMN IF NOT EXISTS primary_color text,
  ADD COLUMN IF NOT EXISTS secondary_color text;

-- Create a "System" tenant for Mega Admins if it doesn't exist
INSERT INTO public.tenants (id, name, cnpj, plan)
VALUES ('system', 'System Administration', '00.000.000/0000-00', 'Mega')
ON CONFLICT (id) DO NOTHING;

-- 2. Alter User Profiles Table
-- ============================================================================
-- We need to drop the existing role check constraint and recreate it
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
  CHECK (role IN ('mega_admin', 'super_admin', 'admin', 'operator', 'professional', 'patient', 'viewer'));

-- 3. Create User Tenants Junction Table (For professionals/users in multiple clinics)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.user_tenants (
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id text REFERENCES public.tenants(id) ON DELETE CASCADE,
    role text DEFAULT 'operator',
    created_at timestamptz DEFAULT now(),
    PRIMARY KEY (user_id, tenant_id)
);

ALTER TABLE public.user_tenants ENABLE ROW LEVEL SECURITY;

-- 4. Centralized Access Function
-- ============================================================================
CREATE OR REPLACE FUNCTION public.has_tenant_access(target_tenant_id text)
RETURNS boolean AS $$
DECLARE
    v_user_role text;
    v_user_tenant_id text;
    v_user_id uuid;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN RETURN false; END IF;

    -- Get user primary role and tenant_id
    SELECT role, tenant_id INTO v_user_role, v_user_tenant_id
    FROM public.user_profiles
    WHERE id = v_user_id;
    
    -- Mega admin has access to everything
    IF v_user_role = 'mega_admin' THEN
        RETURN true;
    END IF;
    
    -- If it's the exact same primary tenant
    IF v_user_tenant_id = target_tenant_id THEN
        RETURN true;
    END IF;

    -- If user has secondary access via user_tenants (e.g. professional in multiple clinics)
    IF EXISTS (SELECT 1 FROM public.user_tenants WHERE user_id = v_user_id AND tenant_id = target_tenant_id) THEN
        RETURN true;
    END IF;
    
    -- If user is super_admin (reseller), check if target is a child tenant
    IF v_user_role = 'super_admin' THEN
        RETURN EXISTS (
            SELECT 1 FROM public.tenants 
            WHERE id = target_tenant_id AND parent_id = v_user_tenant_id
        );
    END IF;
    
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 5. Replace RLS Policies
-- ============================================================================
-- We drop the old "Tenant isolation" and replace with "Tenant access" using the new function.

DO $$
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT unnest(ARRAY['patients', 'professionals', 'visits', 'leads', 'messages', 'medicines', 'surveys', 'survey_config', 'alert_config'])
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Tenant isolation" ON public.%I', t);
        EXECUTE format('CREATE POLICY "Tenant access" ON public.%I FOR ALL USING (public.has_tenant_access(tenant_id))', t);
    END LOOP;
END $$;

-- Update Tenants policy to allow Super Admins to see their sub-tenants
DROP POLICY IF EXISTS "Users can read own tenant" ON public.tenants;
CREATE POLICY "Tenant access" ON public.tenants
  FOR SELECT USING (public.has_tenant_access(id) OR public.has_tenant_access(parent_id));

-- For Inserts/Updates on tenants, only Mega Admin and Super Admin can create/update child tenants
CREATE POLICY "Tenant management" ON public.tenants
  FOR ALL USING (
    (SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'mega_admin'
    OR 
    ( (SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'super_admin' AND parent_id = (SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid()) )
  );

-- Update user_tenants RLS
CREATE POLICY "User tenants access" ON public.user_tenants
  FOR ALL USING (user_id = auth.uid() OR public.has_tenant_access(tenant_id));

-- 6. Trigger to populate user_tenants automatically for primary tenant
-- ============================================================================
CREATE OR REPLACE FUNCTION public.sync_user_primary_tenant()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_tenants (user_id, tenant_id, role)
  VALUES (NEW.id, NEW.tenant_id, NEW.role)
  ON CONFLICT (user_id, tenant_id) DO UPDATE SET role = EXCLUDED.role;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_user_profile_created ON public.user_profiles;
CREATE TRIGGER on_user_profile_created
  AFTER INSERT OR UPDATE OF tenant_id, role ON public.user_profiles
  FOR EACH ROW EXECUTE PROCEDURE public.sync_user_primary_tenant();
