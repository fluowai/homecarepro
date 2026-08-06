-- ============================================================================
-- Harden SECURITY DEFINER functions used by RLS
-- Sets an explicit search_path so schema resolution cannot be hijacked.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text AS $$
  SELECT role FROM public.user_profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE
  SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS text AS $$
  SELECT tenant_id FROM public.user_profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE
  SET search_path = public;

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
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
  SET search_path = public;
