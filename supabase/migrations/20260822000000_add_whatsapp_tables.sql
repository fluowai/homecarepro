-- WhatsApp Integration Tables

-- 1. WhatsApp Instances
CREATE TABLE IF NOT EXISTS public.whatsapp_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  instance_name text NOT NULL,
  status text NOT NULL DEFAULT 'disconnected',
  qr_code text,
  webhook_status text,
  last_heartbeat timestamptz,
  disconnect_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, instance_name)
);

ALTER TABLE public.whatsapp_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their tenant's whatsapp instances"
  ON public.whatsapp_instances FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id FROM public.user_tenants WHERE user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage their tenant's whatsapp instances"
  ON public.whatsapp_instances FOR ALL
  USING (tenant_id IN (
    SELECT tenant_id FROM public.user_tenants WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
  ));


-- 2. WhatsApp Contacts
CREATE TABLE IF NOT EXISTS public.whatsapp_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  phone text NOT NULL,
  profile_name text,
  profile_pic_url text,
  consent_state text DEFAULT 'pending',
  last_inbound_time timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, phone)
);

ALTER TABLE public.whatsapp_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their tenant's whatsapp contacts"
  ON public.whatsapp_contacts FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id FROM public.user_tenants WHERE user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage their tenant's whatsapp contacts"
  ON public.whatsapp_contacts FOR ALL
  USING (tenant_id IN (
    SELECT tenant_id FROM public.user_tenants WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
  ));


-- 3. WhatsApp Messages
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  instance_id uuid NOT NULL REFERENCES public.whatsapp_instances(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.whatsapp_contacts(id) ON DELETE CASCADE,
  message_id text, -- ID returned by the provider
  direction text NOT NULL CHECK (direction IN ('INBOUND', 'OUTBOUND')),
  message_type text NOT NULL DEFAULT 'text', -- text, image, audio, video, document, etc
  content text, -- Text message or caption
  media_url text, -- MinIO public URL if media is attached
  media_mimetype text,
  status text NOT NULL DEFAULT 'PENDING', -- PENDING, SENT, DELIVERED, READ, FAILED
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their tenant's whatsapp messages"
  ON public.whatsapp_messages FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id FROM public.user_tenants WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can create their tenant's whatsapp messages"
  ON public.whatsapp_messages FOR INSERT
  WITH CHECK (tenant_id IN (
    SELECT tenant_id FROM public.user_tenants WHERE user_id = auth.uid()
  ));
  
CREATE POLICY "Admins can update their tenant's whatsapp messages"
  ON public.whatsapp_messages FOR UPDATE
  USING (tenant_id IN (
    SELECT tenant_id FROM public.user_tenants WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
  ));

-- 4. WhatsApp Threads (For Chat UI aggregation)
CREATE TABLE IF NOT EXISTS public.whatsapp_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.whatsapp_contacts(id) ON DELETE CASCADE,
  last_message_id uuid REFERENCES public.whatsapp_messages(id) ON DELETE SET NULL,
  unread_count integer DEFAULT 0,
  last_message_time timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(tenant_id, contact_id)
);

ALTER TABLE public.whatsapp_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their tenant's whatsapp threads"
  ON public.whatsapp_threads FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id FROM public.user_tenants WHERE user_id = auth.uid()
  ));

CREATE POLICY "Admins can manage their tenant's whatsapp threads"
  ON public.whatsapp_threads FOR ALL
  USING (tenant_id IN (
    SELECT tenant_id FROM public.user_tenants WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
  ));

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_timestamp_whatsapp_instances
BEFORE UPDATE ON public.whatsapp_instances
FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TRIGGER set_timestamp_whatsapp_contacts
BEFORE UPDATE ON public.whatsapp_contacts
FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TRIGGER set_timestamp_whatsapp_messages
BEFORE UPDATE ON public.whatsapp_messages
FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();

CREATE TRIGGER set_timestamp_whatsapp_threads
BEFORE UPDATE ON public.whatsapp_threads
FOR EACH ROW EXECUTE PROCEDURE trigger_set_timestamp();
