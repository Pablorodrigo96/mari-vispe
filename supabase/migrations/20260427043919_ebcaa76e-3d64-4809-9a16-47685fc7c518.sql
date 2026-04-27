-- 1) Tabela de interesses
CREATE TABLE IF NOT EXISTS public.partner_opportunity_interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  interested_user_id UUID NOT NULL,
  originator_user_id UUID NOT NULL,
  buyer_description TEXT,
  commission_split TEXT NOT NULL DEFAULT '50_50',
  status TEXT NOT NULL DEFAULT 'expressed' CHECK (status IN ('expressed','accepted','rejected','closed')),
  originator_response_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (listing_id, interested_user_id)
);

CREATE INDEX IF NOT EXISTS idx_poi_listing      ON public.partner_opportunity_interests(listing_id);
CREATE INDEX IF NOT EXISTS idx_poi_interested   ON public.partner_opportunity_interests(interested_user_id);
CREATE INDEX IF NOT EXISTS idx_poi_originator   ON public.partner_opportunity_interests(originator_user_id);
CREATE INDEX IF NOT EXISTS idx_poi_status       ON public.partner_opportunity_interests(status);

DROP TRIGGER IF EXISTS trg_poi_updated_at ON public.partner_opportunity_interests;
CREATE TRIGGER trg_poi_updated_at
BEFORE UPDATE ON public.partner_opportunity_interests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.partner_opportunity_interests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "interests_view_own" ON public.partner_opportunity_interests;
CREATE POLICY "interests_view_own"
ON public.partner_opportunity_interests FOR SELECT TO authenticated
USING (interested_user_id = auth.uid());

DROP POLICY IF EXISTS "interests_view_originator" ON public.partner_opportunity_interests;
CREATE POLICY "interests_view_originator"
ON public.partner_opportunity_interests FOR SELECT TO authenticated
USING (originator_user_id = auth.uid());

DROP POLICY IF EXISTS "interests_view_admin" ON public.partner_opportunity_interests;
CREATE POLICY "interests_view_admin"
ON public.partner_opportunity_interests FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "interests_insert_self" ON public.partner_opportunity_interests;
CREATE POLICY "interests_insert_self"
ON public.partner_opportunity_interests FOR INSERT TO authenticated
WITH CHECK (
  interested_user_id = auth.uid()
  AND originator_user_id <> auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.listings l
    WHERE l.id = listing_id
      AND l.user_id = originator_user_id
      AND l.status = 'active'
  )
);

DROP POLICY IF EXISTS "interests_update_originator" ON public.partner_opportunity_interests;
CREATE POLICY "interests_update_originator"
ON public.partner_opportunity_interests FOR UPDATE TO authenticated
USING (
  originator_user_id = auth.uid()
  OR interested_user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin'::app_role)
);

-- 2) View do pool (agora a tabela existe)
CREATE OR REPLACE VIEW public.partner_opportunity_pool
WITH (security_invoker=on) AS
SELECT
  l.id, l.title, l.category, l.description,
  l.city, l.state, l.neighborhood,
  l.asking_price, l.hide_price,
  l.annual_revenue, l.annual_profit,
  l.equity_score, l.vdr_readiness,
  l.foundation_year, l.images, l.plan, l.ticker,
  l.created_at,
  CASE
    WHEN COALESCE(p.is_partner_accountant, false) THEN 'partner_accountant'
    WHEN EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = l.user_id AND ur.role = 'franchisee') THEN 'franchisee'
    WHEN EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = l.user_id AND ur.role = 'advisor')   THEN 'advisor'
    WHEN EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = l.user_id AND ur.role = 'admin')     THEN 'bdr_internal'
    ELSE 'direct_seller'
  END AS originator_type,
  p.state AS originator_state,
  COALESCE(plr.status, 'available') AS reservation_status,
  plr.expires_at AS reservation_expires_at,
  (SELECT COUNT(*) FROM public.partner_opportunity_interests poi WHERE poi.listing_id = l.id) AS interest_count,
  (l.user_id = auth.uid()) AS is_my_lead
FROM public.listings l
LEFT JOIN public.profiles p ON p.user_id = l.user_id
LEFT JOIN LATERAL (
  SELECT status, expires_at
  FROM public.partner_lead_reservations
  WHERE listing_id = l.id
  ORDER BY reserved_at DESC
  LIMIT 1
) plr ON true
WHERE l.status = 'active';

GRANT SELECT ON public.partner_opportunity_pool TO authenticated;

-- 3) Notificações
CREATE OR REPLACE FUNCTION public.notify_partner_interest()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE listing_title TEXT;
BEGIN
  SELECT title INTO listing_title FROM public.listings WHERE id = NEW.listing_id;
  INSERT INTO public.notifications (user_id, type, title, content, listing_id)
  VALUES (
    NEW.originator_user_id, 'system',
    'Outro parceiro tem comprador para seu lead',
    'Um parceiro da rede PME.B3 demonstrou interesse em fazer match no anúncio "' || COALESCE(listing_title, 'sem título') || '". Comissão sugerida: 50/50. Acesse o painel para aceitar ou recusar.',
    NEW.listing_id
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_partner_interest ON public.partner_opportunity_interests;
CREATE TRIGGER trg_notify_partner_interest
AFTER INSERT ON public.partner_opportunity_interests
FOR EACH ROW EXECUTE FUNCTION public.notify_partner_interest();

CREATE OR REPLACE FUNCTION public.notify_partner_interest_response()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE listing_title TEXT;
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;
  SELECT title INTO listing_title FROM public.listings WHERE id = NEW.listing_id;
  IF NEW.status = 'accepted' THEN
    INSERT INTO public.notifications (user_id, type, title, content, listing_id)
    VALUES (
      NEW.interested_user_id, 'system',
      'Match aceito! Você pode apresentar seu comprador',
      'O originador do lead "' || COALESCE(listing_title, '') || '" aceitou seu interesse. Vocês dividem a comissão 50/50.',
      NEW.listing_id
    );
    NEW.originator_response_at := now();
  ELSIF NEW.status = 'rejected' THEN
    INSERT INTO public.notifications (user_id, type, title, content, listing_id)
    VALUES (
      NEW.interested_user_id, 'system',
      'Match não aceito',
      'O originador do lead "' || COALESCE(listing_title, '') || '" optou por não compartilhar este lead no momento.',
      NEW.listing_id
    );
    NEW.originator_response_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_partner_interest_response ON public.partner_opportunity_interests;
CREATE TRIGGER trg_notify_partner_interest_response
BEFORE UPDATE ON public.partner_opportunity_interests
FOR EACH ROW EXECUTE FUNCTION public.notify_partner_interest_response();