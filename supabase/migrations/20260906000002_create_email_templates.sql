-- Criação da tabela email_templates

CREATE TABLE IF NOT EXISTS public.email_templates (
  id text PRIMARY KEY,
  tenant_id text,
  name text NOT NULL,
  type text NOT NULL,
  description text,
  subject text NOT NULL,
  html_content text NOT NULL,
  text_content text,
  variables jsonb DEFAULT '[]'::jsonb,
  is_active boolean DEFAULT true,
  is_default boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Ativar RLS
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
DROP POLICY IF EXISTS "Global templates are readable by all" ON public.email_templates;
CREATE POLICY "Global templates are readable by all"
ON public.email_templates FOR SELECT
USING (tenant_id IS NULL OR tenant_id = 'system');

DROP POLICY IF EXISTS "Tenant templates are readable by owner" ON public.email_templates;
CREATE POLICY "Tenant templates are readable by owner"
ON public.email_templates FOR SELECT
USING (tenant_id = public.get_user_tenant_id() OR public.get_user_role() IN ('super_admin', 'mega_admin'));

DROP POLICY IF EXISTS "Super admins and mega admins can manage all templates" ON public.email_templates;
CREATE POLICY "Super admins and mega admins can manage all templates"
ON public.email_templates FOR ALL
USING (public.get_user_role() IN ('super_admin', 'mega_admin'));
