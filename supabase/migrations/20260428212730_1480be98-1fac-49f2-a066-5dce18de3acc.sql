ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS partner_status text NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS partner_disqualified_reason text,
  ADD COLUMN IF NOT EXISTS partner_disqualified_at timestamptz;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_partner_status_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_partner_status_check
  CHECK (partner_status IN ('pending','active','suspended','disqualified'));