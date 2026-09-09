-- Professional accounts authenticate with phone + password.
-- Keep the link explicit so a phone cannot accidentally resolve to the wrong professional.
ALTER TABLE public.professionals
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_professionals_user_id
  ON public.professionals(user_id)
  WHERE user_id IS NOT NULL;
