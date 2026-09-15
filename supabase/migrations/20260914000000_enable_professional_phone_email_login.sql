-- Migration: Enable professional phone login via synthetic virtual email
-- 1. Backfill auth.users email for all accounts created with phone only
UPDATE auth.users
SET 
  email = 'tel_' || case when regexp_replace(phone, '\D', '', 'g') ~ '^55' then regexp_replace(phone, '\D', '', 'g') else '55' || regexp_replace(phone, '\D', '', 'g') end || '@homecarepro.internal',
  email_confirmed_at = COALESCE(email_confirmed_at, now())
WHERE phone IS NOT NULL AND (email IS NULL OR email = '');

-- 2. Backfill public.user_profiles email from auth.users
UPDATE public.user_profiles up
SET email = au.email
FROM auth.users au
WHERE up.id = au.id AND (up.email IS NULL OR up.email = '');

-- 3. Update handle_new_user() trigger to automatically support phone accounts
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  derived_email text;
  raw_phone text;
BEGIN
  raw_phone := coalesce(new.raw_user_meta_data ->> 'phone', new.phone);
  derived_email := coalesce(
    new.email,
    case
      when raw_phone is not null and length(regexp_replace(raw_phone, '\D', '', 'g')) >= 10 then
        'tel_' || case when regexp_replace(raw_phone, '\D', '', 'g') ~ '^55' then regexp_replace(raw_phone, '\D', '', 'g') else '55' || regexp_replace(raw_phone, '\D', '', 'g') end || '@homecarepro.internal'
      else null
    end
  );

  INSERT INTO public.user_profiles (id, tenant_id, full_name, role, email)
  VALUES (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'tenant_id', 'sp'),
    coalesce(new.raw_user_meta_data ->> 'full_name', derived_email),
    coalesce(new.raw_user_meta_data ->> 'role', 'operator'),
    derived_email
  )
  ON CONFLICT (id) DO UPDATE SET
    tenant_id = EXCLUDED.tenant_id,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    email = EXCLUDED.email;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Ensure all professionals in SC Saude and active clinics have active status
UPDATE public.professionals
SET status = 'active'
WHERE tenant_id = 'tenant-scsaude-1787061511657' AND status != 'active';
