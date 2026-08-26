-- ============================================================================
-- Migration: Add Subdomain Support for Multi-Tenant URL Routing
-- Permite que cada tenant acesse pelo seu subdomínio: <subdomain>.homecarepro.com.br
-- ============================================================================

-- 1. Add subdomain column to tenants table
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS subdomain text;

-- 2. Unique index on subdomain (nulls not indexed, so multiple NULLs allowed)
CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_subdomain
  ON public.tenants(subdomain)
  WHERE subdomain IS NOT NULL;

-- 3. Constraint: subdomain must be lowercase alphanumeric + hyphens, 1-63 chars
ALTER TABLE public.tenants
  DROP CONSTRAINT IF EXISTS tenant_subdomain_valid;

ALTER TABLE public.tenants
  ADD CONSTRAINT tenant_subdomain_valid
  CHECK (
    subdomain IS NULL OR
    (
      LENGTH(subdomain) BETWEEN 1 AND 63
      AND subdomain ~ '^[a-z0-9][a-z0-9-]*[a-z0-9]$'
      AND subdomain NOT IN ('admin', 'api', 'app', 'system', 'www', 'mail', 'ftp', 'ns', 'dashboard', 'login', 'cdn', 'status', 'blog')
    )
  );

-- 4. Ensure pgcrypto extension exists (needed by gen_random_uuid in billing/invites)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 5. Auto-generate subdomain from tenant name when not provided
-- This function can be used by the server to generate a slug
CREATE OR REPLACE FUNCTION public.generate_subdomain(name text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT LOWER(REGEXP_REPLACE(REGEXP_REPLACE(name, '[^a-zA-Z0-9]+', '-', 'g'), '^-+|-+$', ''));
$$;

-- 6. Backfill existing tenants with subdomains (for demo/seed tenants)
-- Only backfills if a tenant doesn't already have a subdomain
DO $$
DECLARE
  r RECORD;
  base_subdomain text;
  final_subdomain text;
  suffix int := 0;
BEGIN
  FOR r IN
    SELECT id, name FROM public.tenants
    WHERE subdomain IS NULL
    ORDER BY id
  LOOP
    base_subdomain := public.generate_subdomain(r.name);
    final_subdomain := base_subdomain;
    suffix := 0;
    
    LOOP
      -- Check if this subdomain is already taken
      IF NOT EXISTS (SELECT 1 FROM public.tenants WHERE subdomain = final_subdomain) THEN
        EXIT;
      END IF;
      suffix := suffix + 1;
      final_subdomain := base_subdomain || '-' || suffix;
      
      -- Safety: prevent infinite loop
      IF suffix > 100 THEN
        EXIT;
      END IF;
    END LOOP;
    
    IF LENGTH(final_subdomain) <= 63 THEN
      UPDATE public.tenants SET subdomain = final_subdomain WHERE id = r.id;
    END IF;
  END LOOP;
END $$;

-- 7. Index for faster subdomain lookups (used by caddy-ask and resolve endpoints)
CREATE INDEX IF NOT EXISTS idx_tenants_subdomain_lookup ON public.tenants(subdomain) WHERE status = 'active';
