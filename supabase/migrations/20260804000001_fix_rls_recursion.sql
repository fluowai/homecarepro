-- ============================================================================
-- Fix infinite recursion in RLS for Mega Admin
-- ============================================================================

-- Create security definer function to bypass RLS for role checks
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text AS $$
  SELECT role FROM public.user_profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Drop the recursive policy
DROP POLICY IF EXISTS "Mega Admin global user_profiles access" ON public.user_profiles;

-- Create the new non-recursive policy using the security definer function
CREATE POLICY "Mega Admin global user_profiles access" ON public.user_profiles
  FOR ALL USING (
    public.get_user_role() = 'mega_admin'
  );

-- Update the tenants policy as well to use the safer function
DROP POLICY IF EXISTS "Mega Admin global tenants access" ON public.tenants;
CREATE POLICY "Mega Admin global tenants access" ON public.tenants
  FOR ALL USING (
    public.get_user_role() = 'mega_admin'
  );
