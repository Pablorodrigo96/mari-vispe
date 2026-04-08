
-- ============================================================
-- FASE 4: Matching Real-Time — Trigger notify_matching_buyers
-- ============================================================

CREATE OR REPLACE FUNCTION public.notify_matching_buyers()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  matching_count INTEGER;
BEGIN
  -- Count matching active buyer_profiles
  SELECT COUNT(*) INTO matching_count
  FROM public.buyer_profiles bp
  WHERE bp.status = 'active'
    AND NEW.category = ANY(bp.categories)
    AND (
      bp.state IS NULL
      OR bp.state = NEW.state
    )
    AND (
      bp.max_budget IS NULL
      OR NEW.asking_price IS NULL
      OR bp.max_budget >= NEW.asking_price
    );

  -- If there are matches, notify the seller
  IF matching_count > 0 THEN
    INSERT INTO public.notifications (user_id, type, title, content, listing_id)
    VALUES (
      NEW.user_id,
      'system',
      'Compradores compatíveis encontrados!',
      'Existem ' || matching_count || ' compradores ativos buscando empresas como a sua. Veja os detalhes!',
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_new_listing_match
AFTER INSERT ON public.listings
FOR EACH ROW
EXECUTE FUNCTION public.notify_matching_buyers();

-- ============================================================
-- FASE 5: Geofencing — franchisee_regions + profile prefs
-- ============================================================

CREATE TABLE public.franchisee_regions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  states TEXT[] DEFAULT '{}',
  cities TEXT[] DEFAULT '{}',
  categories TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.franchisee_regions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Franchisees can view own regions"
ON public.franchisee_regions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Franchisees can insert own regions"
ON public.franchisee_regions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Franchisees can update own regions"
ON public.franchisee_regions FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Franchisees can delete own regions"
ON public.franchisee_regions FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all regions"
ON public.franchisee_regions FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all regions"
ON public.franchisee_regions FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Add notification preference to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS notification_preference TEXT DEFAULT 'realtime';

-- Add is_digest flag to notifications
ALTER TABLE public.notifications
ADD COLUMN IF NOT EXISTS is_digest BOOLEAN DEFAULT false;

-- Update create_interest_notification to filter by franchisee region
CREATE OR REPLACE FUNCTION public.create_interest_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  listing_owner_id UUID;
  listing_ticker TEXT;
  listing_state TEXT;
  listing_category TEXT;
  admin_record RECORD;
  franchisee_record RECORD;
  inv_name TEXT;
BEGIN
  -- Get listing owner, ticker, state, category
  SELECT user_id, ticker, state, category
  INTO listing_owner_id, listing_ticker, listing_state, listing_category
  FROM public.listings
  WHERE id = NEW.listing_id;

  inv_name := COALESCE(NEW.investor_name, 'Um investidor');

  -- Notify listing owner
  IF listing_owner_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, content, listing_id)
    VALUES (
      listing_owner_id,
      'system',
      'Novo interesse registrado!',
      inv_name || ' demonstrou interesse no seu ativo ' || COALESCE(listing_ticker, ''),
      NEW.listing_id
    );
  END IF;

  -- Notify admins
  FOR admin_record IN
    SELECT ur.user_id, p.notification_preference
    FROM public.user_roles ur
    LEFT JOIN public.profiles p ON p.user_id = ur.user_id
    WHERE ur.role = 'admin'
  LOOP
    INSERT INTO public.notifications (user_id, type, title, content, listing_id, is_digest)
    VALUES (
      admin_record.user_id,
      'system',
      'Novo interesse registrado!',
      COALESCE(NEW.investor_name, 'Investidor') || ' - ' || COALESCE(NEW.investor_email, 'sem email') || ' interessado em ' || COALESCE(listing_ticker, ''),
      NEW.listing_id,
      COALESCE(admin_record.notification_preference, 'realtime') = 'daily_digest'
    );
  END LOOP;

  -- Notify franchisees only if their region matches
  FOR franchisee_record IN
    SELECT ur.user_id
    FROM public.user_roles ur
    WHERE ur.role = 'franchisee'
      AND (
        NOT EXISTS (SELECT 1 FROM public.franchisee_regions fr WHERE fr.user_id = ur.user_id)
        OR EXISTS (
          SELECT 1 FROM public.franchisee_regions fr
          WHERE fr.user_id = ur.user_id
            AND (fr.states = '{}' OR listing_state = ANY(fr.states))
            AND (fr.categories = '{}' OR listing_category = ANY(fr.categories))
        )
      )
  LOOP
    INSERT INTO public.notifications (user_id, type, title, content, listing_id)
    VALUES (
      franchisee_record.user_id,
      'system',
      'Novo interesse na sua região!',
      inv_name || ' interessado em ' || COALESCE(listing_ticker, '') || ' (' || COALESCE(listing_state, '') || ')',
      NEW.listing_id
    );
  END LOOP;

  RETURN NEW;
END;
$$;

-- ============================================================
-- FASE 6: Partner Activities
-- ============================================================

CREATE TABLE public.partner_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_user_id UUID NOT NULL,
  activity_type TEXT NOT NULL,
  notes TEXT,
  scheduled_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.partner_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can do everything on partner_activities"
ON public.partner_activities FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Partners can view own activities"
ON public.partner_activities FOR SELECT
TO authenticated
USING (auth.uid() = partner_user_id);
