-- ============================================================================
-- Migration: Expand Mega Admin Roles and Policies
-- ============================================================================

-- 1. Update user_profiles role check constraint
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
  CHECK (role IN ('mega_admin', 'super_admin', 'admin', 'operator', 'professional', 'patient', 'viewer', 'system_support'));

-- 2. Expand RLS for Mega Admin
-- ============================================================================

-- Allow Mega Admin to read/update all user profiles globally
DROP POLICY IF EXISTS "Mega Admin global user_profiles access" ON public.user_profiles;
CREATE POLICY "Mega Admin global user_profiles access" ON public.user_profiles
  FOR ALL USING (
    (SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'mega_admin'
  );

-- Ensure Mega Admin has full access to all Tenants (already somewhat there, but making sure)
DROP POLICY IF EXISTS "Mega Admin global tenants access" ON public.tenants;
CREATE POLICY "Mega Admin global tenants access" ON public.tenants
  FOR ALL USING (
    (SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'mega_admin'
  );
