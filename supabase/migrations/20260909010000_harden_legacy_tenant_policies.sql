-- ============================================================================
-- Remove legacy tenant policies that were left active alongside the tree scope.
-- PostgreSQL combines permissive policies with OR, so keeping the old
-- "Tenant access" policy made the effective authorization depend on two
-- different rules.
-- ============================================================================

DO $$
DECLARE
  t_name text;
  tables_with_tenant_id text[] := ARRAY[
    'patients', 'professionals', 'visits', 'leads', 'messages', 'medicines',
    'surveys', 'survey_config', 'alert_config', 'health_insurances',
    'medication_administrations', 'proposals', 'contracts', 'invoices',
    'assemblies', 'assembly_votes'
  ];
BEGIN
  FOREACH t_name IN ARRAY tables_with_tenant_id LOOP
    IF to_regclass(format('public.%I', t_name)) IS NOT NULL THEN
      EXECUTE format('DROP POLICY IF EXISTS "Tenant access" ON public.%I', t_name);
      EXECUTE format('DROP POLICY IF EXISTS "Tenant isolation" ON public.%I', t_name);
      EXECUTE format(
        'CREATE POLICY "Tenant isolation" ON public.%I FOR ALL USING (
           public.has_tenant_access(tenant_id) OR
           public.has_tenant_tree_access(tenant_id)
         )',
        t_name
      );
    END IF;
  END LOOP;

  -- Mantém a leitura de clínicas filhas para a listagem autorizada da rede,
  -- mas sem o antigo acesso global do super_admin.
  CREATE POLICY "Tenant access" ON public.tenants FOR SELECT USING (
    public.has_tenant_access(id) OR
    public.has_tenant_access(parent_id) OR
    public.has_tenant_tree_access(id) OR
    public.has_tenant_tree_access(parent_id)
  );
END $$;
