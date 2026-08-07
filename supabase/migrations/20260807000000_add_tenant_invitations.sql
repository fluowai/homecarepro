-- ============================================================================
-- Migration: Tenant Invitations (Reseller & Clinic onboarding via invite link)
-- ============================================================================

-- 1. Invitations table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.tenant_invitations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id text NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    email text NOT NULL,
    role text NOT NULL DEFAULT 'super_admin' CHECK (role IN ('super_admin', 'admin')),
    token text NOT NULL UNIQUE,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
    expires_at timestamptz NOT NULL,
    accepted_at timestamptz,
    created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tenant_invitations_token ON public.tenant_invitations(token);
CREATE INDEX IF NOT EXISTS idx_tenant_invitations_tenant ON public.tenant_invitations(tenant_id);

ALTER TABLE public.tenant_invitations ENABLE ROW LEVEL SECURITY;

-- 2. Policies
-- ============================================================================
-- Mega admin can manage invitations globally (invite/revoke resellers)
DROP POLICY IF EXISTS "Mega Admin invitations" ON public.tenant_invitations;
CREATE POLICY "Mega Admin invitations" ON public.tenant_invitations
  FOR ALL USING (
    (SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'mega_admin'
  );

-- Super admin (reseller) can read invitations for its own tenant and child clinics
DROP POLICY IF EXISTS "Super Admin invitations read" ON public.tenant_invitations;
CREATE POLICY "Super Admin invitations read" ON public.tenant_invitations
  FOR SELECT USING (
    (SELECT role FROM public.user_profiles WHERE id = auth.uid()) = 'super_admin'
    AND public.has_tenant_access(tenant_id)
  );

-- 3. Helper: create invitation token
-- ============================================================================
CREATE OR REPLACE FUNCTION public.generate_invite_token()
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT encode(gen_random_bytes(32), 'hex');
$$;
