-- ============================================================================
-- Migration: Nível Família — Role explícito + relacionamento paciente/familiar
-- ============================================================================

-- 1. Adicionar 'family' ao CHECK constraint de user_profiles.role
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
  CHECK (role IN ('mega_admin', 'super_admin', 'admin', 'operator', 'professional', 'patient', 'viewer', 'system_support', 'family'));

-- 2. Tabela de convites para familiares (reaproveita o fluxo de tenant_invitations)
-- ============================================================================
-- A tabela tenant_invitations já existe e aceita role IN ('super_admin', 'admin').
-- Ampliamos o CHECK para incluir 'family' e adicionamos coluna patient_id.
ALTER TABLE public.tenant_invitations
  ADD COLUMN IF NOT EXISTS patient_id text REFERENCES public.patients(id) ON DELETE SET NULL;

DO $$
DECLARE
    constraint_name text;
BEGIN
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'public.tenant_invitations'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%role%';

    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.tenant_invitations DROP CONSTRAINT ' || constraint_name;
    END IF;
END $$;

ALTER TABLE public.tenant_invitations
  ADD CONSTRAINT tenant_invitations_role_check
  CHECK (role IN ('super_admin', 'admin', 'family'));

-- 3. Tabela patient_family_links (N:N entre usuários family e pacientes)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.patient_family_links (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       text NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    patient_id      text NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    family_user_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    relationship    text NOT NULL DEFAULT 'responsável legal',
    is_primary      boolean DEFAULT false,
    created_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at      timestamptz DEFAULT now(),
    UNIQUE (patient_id, family_user_id)
);

CREATE INDEX IF NOT EXISTS idx_patient_family_links_tenant ON public.patient_family_links(tenant_id);
CREATE INDEX IF NOT EXISTS idx_patient_family_links_user   ON public.patient_family_links(family_user_id);
CREATE INDEX IF NOT EXISTS idx_patient_family_links_patient ON public.patient_family_links(patient_id);

ALTER TABLE public.patient_family_links ENABLE ROW LEVEL SECURITY;

-- Família: lê apenas seus próprios vínculos
DROP POLICY IF EXISTS "Family reads own links" ON public.patient_family_links;
CREATE POLICY "Family reads own links" ON public.patient_family_links
  FOR SELECT USING (
    family_user_id = auth.uid()
    OR public.has_tenant_access(tenant_id)
  );

-- Admin/professional/operator do tenant podem gerenciar vínculos
DROP POLICY IF EXISTS "Tenant staff manage family links" ON public.patient_family_links;
CREATE POLICY "Tenant staff manage family links" ON public.patient_family_links
  FOR ALL USING (
    public.has_tenant_access(tenant_id)
    AND EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'operator', 'professional')
    )
  );

-- 4. Tabela push_subscriptions (para web push)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id       text NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    endpoint        text NOT NULL,
    p256dh_key      text NOT NULL,
    auth_key        text NOT NULL,
    created_at      timestamptz DEFAULT now(),
    last_seen       timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user   ON public.push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_tenant ON public.push_subscriptions(tenant_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Usuário lê/escrive sua própria subscription
DROP POLICY IF EXISTS "Users manage own push subscription" ON public.push_subscriptions;
CREATE POLICY "Users manage own push subscription" ON public.push_subscriptions
  FOR ALL USING (user_id = auth.uid());

-- 5. Tabela notifications (histórico de notificações enviadas)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       text NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    patient_id      text REFERENCES public.patients(id) ON DELETE SET NULL,
    title           text NOT NULL,
    body            text NOT NULL,
    type            text NOT NULL CHECK (type IN ('visit', 'alert', 'message', 'clinical', 'system')),
    severity        text NOT NULL DEFAULT 'info' CHECK (severity IN ('critical', 'warning', 'info')),
    is_read         boolean DEFAULT false,
    is_delivered    boolean DEFAULT false,
    created_at      timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user   ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_tenant  ON public.notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread  ON public.notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created ON public.notifications(created_at DESC);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Usuário lê notificações próprias; staff do tenant pode ler do tenant
DROP POLICY IF EXISTS "Users read own notifications" ON public.notifications;
CREATE POLICY "Users read own notifications" ON public.notifications
  FOR SELECT USING (
    user_id = auth.uid()
    OR public.has_tenant_access(tenant_id)
  );

-- Inserção de notificações: apenas via server (service role) ou staff do tenant
DROP POLICY IF EXISTS "Tenant staff create notifications" ON public.notifications;
CREATE POLICY "Tenant staff create notifications" ON public.notifications
  FOR INSERT WITH CHECK (public.has_tenant_access(tenant_id));
