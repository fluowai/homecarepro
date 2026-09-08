-- 1. Cria função para identificar se o usuário é Super Admin
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS text AS $$
  SELECT role FROM public.user_profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- 2. Adiciona o E-MAIL direto no Perfil do Usuário para ficar visível!
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS email text;
UPDATE public.user_profiles up SET email = au.email FROM auth.users au WHERE up.id = au.id;

-- 3. Atualiza a Trigger para salvar o email automaticamente em novos cadastros
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (id, tenant_id, full_name, role, email)
  VALUES (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'tenant_id', 'sp'),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    coalesce(new.raw_user_meta_data ->> 'role', 'operator'),
    new.email
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Substitui o RLS de todas as tabelas para liberar visão Global ao Super Admin
DO $$
DECLARE
    t_name text;
    tables text[] := ARRAY['patients', 'professionals', 'visits', 'leads', 'messages', 'medicines', 'surveys', 'survey_config', 'alert_config'];
BEGIN
    FOREACH t_name IN ARRAY tables
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Tenant isolation" ON public.%I', t_name);
        EXECUTE format('
            CREATE POLICY "Tenant isolation" ON public.%I
            FOR ALL USING (
                tenant_id = public.get_user_tenant_id() OR 
                public.get_user_role() IN (''super_admin'', ''mega_admin'')
            )', t_name);
    END LOOP;
END $$;

-- 5. Atualiza a visualização dos Tenants (Revendas) e Perfis
DROP POLICY IF EXISTS "Users can read own tenant" ON public.tenants;
CREATE POLICY "Users can read own tenant" ON public.tenants
  FOR SELECT USING (
      id = public.get_user_tenant_id() OR 
      public.get_user_role() IN ('super_admin', 'mega_admin')
  );

DROP POLICY IF EXISTS "Users can read own profile" ON public.user_profiles;
CREATE POLICY "Users can read own profile" ON public.user_profiles
  FOR SELECT USING (
      id = auth.uid() OR 
      tenant_id = public.get_user_tenant_id() OR 
      public.get_user_role() IN ('super_admin', 'mega_admin')
  );
