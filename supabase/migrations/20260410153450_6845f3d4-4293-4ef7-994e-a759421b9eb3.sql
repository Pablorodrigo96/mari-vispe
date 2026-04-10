
-- ============================================================
-- 1. PRIVILEGE ESCALATION FIX: Drop dangerous self-insert policy
-- ============================================================
DROP POLICY IF EXISTS "Users can insert own roles" ON public.user_roles;

-- Update handle_new_user trigger to insert roles from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  role_item TEXT;
  valid_roles TEXT[] := ARRAY['seller', 'buyer', 'advisor', 'franchisee'];
  meta_roles JSONB;
BEGIN
  -- Create profile
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  
  -- Create free subscription
  INSERT INTO public.subscriptions (user_id, plan, status, multiples_limit, multiples_used, dcf_limit, dcf_used)
  VALUES (NEW.id, 'free', 'active', 1, 0, 0, 0);
  
  -- Insert roles from metadata (excluding 'admin')
  meta_roles := NEW.raw_user_meta_data->'roles';
  IF meta_roles IS NOT NULL AND jsonb_typeof(meta_roles) = 'array' THEN
    FOR role_item IN SELECT jsonb_array_elements_text(meta_roles)
    LOOP
      IF role_item = ANY(valid_roles) THEN
        INSERT INTO public.user_roles (user_id, role)
        VALUES (NEW.id, role_item::app_role)
        ON CONFLICT (user_id, role) DO NOTHING;
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- ============================================================
-- 2. CAPITAL PROVIDERS: Hide sensitive fields from public
-- ============================================================
DROP POLICY IF EXISTS "Anyone can view active providers" ON public.capital_providers;

CREATE OR REPLACE VIEW public.public_capital_providers
WITH (security_invoker = on)
AS
SELECT
  id, name, type, active,
  ticket_min, ticket_max,
  sectors, regions, instruments,
  created_at
FROM public.capital_providers
WHERE active = true;

GRANT SELECT ON public.public_capital_providers TO anon, authenticated;

-- ============================================================
-- 3. BUYER PROFILES: Hide email and WhatsApp from general users
-- ============================================================
DROP POLICY IF EXISTS "Authenticated can view active buyers" ON public.buyer_profiles;

-- Owners can see their own profiles (all fields)
CREATE POLICY "Owners can view own buyer profiles"
ON public.buyer_profiles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Admins can see all profiles (all fields)
CREATE POLICY "Admins can view all buyer profiles"
ON public.buyer_profiles
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

-- Public view without contact info
CREATE OR REPLACE VIEW public.public_buyer_profiles
WITH (security_invoker = on)
AS
SELECT
  id, buyer_name, company_name, categories,
  min_budget, max_budget, city, state,
  description, status, created_at, user_id
FROM public.buyer_profiles
WHERE status = 'active';

GRANT SELECT ON public.public_buyer_profiles TO authenticated;
