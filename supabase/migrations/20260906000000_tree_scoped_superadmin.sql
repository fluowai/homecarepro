-- ============================================================================
-- Migration: Tree-scoped Super Admin visibility + Reseller email branding
-- Corrige o vazamento introduzido por 20260905000000_superadmin_and_email.sql:
--   antes, TODO super_admin via RLS global via get_user_role() IN ('super_admin','mega_admin'),
--   enxergando dados de saúde e e-mails de TODAS as revendas do sistema.
--   Agora cada revenda só enxerga a própria árvore (revenda + clínicas + equipes).
-- ============================================================================

-- 1. Colunas de remetente/e-mail por marca da revenda
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS email_from_name text,
  ADD COLUMN IF NOT EXISTS email_from_address text,
  ADD COLUMN IF NOT EXISTS support_email text;

-- 2. Índices para as consultas recursivas de árvore e diretório de usuários
CREATE INDEX IF NOT EXISTS idx_tenants_parent_id ON public.tenants(parent_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_tenant_id ON public.user_profiles(tenant_id);

-- 3. Função auxiliar: ids da árvore (revenda + descendentes)
CREATE OR REPLACE FUNCTION public.get_tenant_tree_ids(root_tenant_id text)
RETURNS TABLE(tenant_id text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH RECURSIVE tree AS (
    SELECT id AS tenant_id FROM public.tenants WHERE id = root_tenant_id
    UNION ALL
    SELECT t.id AS tenant_id
    FROM public.tenants t
    JOIN tree tr ON t.parent_id = tr.tenant_id
  )
  SELECT tenant_id FROM tree;
$$;

-- 4. Função principal: acesso por árvore
--    mega_admin  -> acesso a qualquer tenant
--    super_admin -> acesso apenas à própria revenda e descendentes
--    demais      -> sem acesso via esta função (acesso próprio via get_user_tenant_id)
CREATE OR REPLACE FUNCTION public.has_tenant_tree_access(target_tenant_id text)
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id uuid;
  v_role text;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL OR target_tenant_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT role INTO v_role FROM public.user_profiles WHERE id = v_user_id;

  IF v_role = 'mega_admin' THEN
    RETURN true;
  END IF;

  IF v_role = 'super_admin' THEN
    RETURN EXISTS (
      SELECT 1
      FROM public.get_tenant_tree_ids(
        (SELECT tenant_id FROM public.user_profiles WHERE id = v_user_id)
      ) tr
      WHERE tr.tenant_id = target_tenant_id
    );
  END IF;

  RETURN false;
END;
$$;

-- 5. Substitui o RLS global (20260905) pelo escopo por árvore nas tabelas de negócio
DO $$
DECLARE
    t_name text;
BEGIN
    FOREACH t_name IN ARRAY
        ARRAY['patients', 'professionals', 'visits', 'leads', 'messages',
              'medicines', 'surveys', 'survey_config', 'alert_config']
    LOOP
        -- A migration 20260727140000 deixou policies "Tenant access" que
        -- continuam sendo combinadas com OR pelo Postgres. Removê-las evita
        -- que uma regra histórica enfraqueça o escopo definido abaixo.
        EXECUTE format('DROP POLICY IF EXISTS "Tenant access" ON public.%I', t_name);
        EXECUTE format('DROP POLICY IF EXISTS "Tenant isolation" ON public.%I', t_name);
        EXECUTE format('
            CREATE POLICY "Tenant isolation" ON public.%I
            FOR ALL USING (
                tenant_id = public.get_user_tenant_id() OR
                public.has_tenant_tree_access(tenant_id)
            )', t_name);
    END LOOP;
END $$;

-- 6. Tenants: leitura da própria árvore (e da própria entrada)
DROP POLICY IF EXISTS "Users can read own tenant" ON public.tenants;
CREATE POLICY "Users can read own tenant" ON public.tenants
  FOR SELECT USING (
      id = public.get_user_tenant_id() OR
      public.has_tenant_tree_access(id) OR
      public.has_tenant_tree_access(parent_id)
  );

-- 7. User profiles: leitura própria + árvore (para exibir e-mails por nível)
DROP POLICY IF EXISTS "Users can read own profile" ON public.user_profiles;
CREATE POLICY "Users can read own profile" ON public.user_profiles
  FOR SELECT USING (
      id = auth.uid() OR
      tenant_id = public.get_user_tenant_id() OR
      public.has_tenant_tree_access(tenant_id)
  );
