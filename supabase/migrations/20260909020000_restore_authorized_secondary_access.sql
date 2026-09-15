-- Reaplica o escopo autorizado que existia antes do hardening de policies:
-- acesso secundário via user_tenants e árvore do super_admin, nunca acesso
-- global para super_admin.

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

  DROP POLICY IF EXISTS "Tenant access" ON public.tenants;
  CREATE POLICY "Tenant access" ON public.tenants FOR SELECT USING (
    public.has_tenant_access(id) OR
    public.has_tenant_access(parent_id) OR
    public.has_tenant_tree_access(id) OR
    public.has_tenant_tree_access(parent_id)
  );
END $$;
