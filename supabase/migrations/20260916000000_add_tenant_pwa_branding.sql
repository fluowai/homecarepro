-- Per-tenant PWA and browser branding.
ALTER TABLE public.tenants
  ADD COLUMN IF NOT EXISTS favicon_url text,
  ADD COLUMN IF NOT EXISTS pwa_icon_192_url text,
  ADD COLUMN IF NOT EXISTS pwa_icon_512_url text,
  ADD COLUMN IF NOT EXISTS pwa_short_name text,
  ADD COLUMN IF NOT EXISTS pwa_theme_color text,
  ADD COLUMN IF NOT EXISTS pwa_background_color text;

ALTER TABLE public.tenants
  DROP CONSTRAINT IF EXISTS tenants_pwa_theme_color_check,
  DROP CONSTRAINT IF EXISTS tenants_pwa_background_color_check;

ALTER TABLE public.tenants
  ADD CONSTRAINT tenants_pwa_theme_color_check CHECK (pwa_theme_color IS NULL OR pwa_theme_color ~ '^#[0-9a-fA-F]{6}$'),
  ADD CONSTRAINT tenants_pwa_background_color_check CHECK (pwa_background_color IS NULL OR pwa_background_color ~ '^#[0-9a-fA-F]{6}$');
