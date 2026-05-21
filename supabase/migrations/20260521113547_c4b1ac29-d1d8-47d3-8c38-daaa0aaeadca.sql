
-- ============================================================
-- Bloco 3 — Pareamento (deal_pairs)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.deal_pairs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sell_mandate_id uuid NOT NULL,           -- equity_brain.mandates.id (sell-side)
  buy_mandate_id uuid,                      -- equity_brain.mandates.id (buy-side, opcional)
  buyer_profile_id uuid,                    -- public.buyer_profiles.id (alternativa)
  source_match_id uuid,                     -- equity_brain.matches.id (origem)
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','active','nbo','signed','closed','lost')),
  responsavel_advisor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  comissao_sell_pct numeric(5,2) DEFAULT 0 CHECK (comissao_sell_pct >= 0 AND comissao_sell_pct <= 100),
  comissao_buy_pct numeric(5,2) DEFAULT 0 CHECK (comissao_buy_pct >= 0 AND comissao_buy_pct <= 100),
  data_pareamento date NOT NULL DEFAULT CURRENT_DATE,
  lost_reason text,
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT deal_pairs_buy_side_chk CHECK (
    buy_mandate_id IS NOT NULL OR buyer_profile_id IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_deal_pairs_responsavel ON public.deal_pairs(responsavel_advisor_id);
CREATE INDEX IF NOT EXISTS idx_deal_pairs_status ON public.deal_pairs(status);
CREATE INDEX IF NOT EXISTS idx_deal_pairs_sell ON public.deal_pairs(sell_mandate_id);
CREATE INDEX IF NOT EXISTS idx_deal_pairs_buy ON public.deal_pairs(buy_mandate_id) WHERE buy_mandate_id IS NOT NULL;

-- Par único ativo por combinação (não bloqueia recriar após lost/closed)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_deal_pairs_active
  ON public.deal_pairs(sell_mandate_id, COALESCE(buy_mandate_id::text, buyer_profile_id::text))
  WHERE status NOT IN ('lost','closed');

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.tg_deal_pairs_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS deal_pairs_updated_at ON public.deal_pairs;
CREATE TRIGGER deal_pairs_updated_at
  BEFORE UPDATE ON public.deal_pairs
  FOR EACH ROW EXECUTE FUNCTION public.tg_deal_pairs_updated_at();

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE public.deal_pairs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS deal_pairs_select ON public.deal_pairs;
CREATE POLICY deal_pairs_select ON public.deal_pairs
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'legal'::app_role)
    OR has_role(auth.uid(), 'observer'::app_role)
    OR responsavel_advisor_id = auth.uid()
    OR created_by = auth.uid()
  );

DROP POLICY IF EXISTS deal_pairs_insert ON public.deal_pairs;
CREATE POLICY deal_pairs_insert ON public.deal_pairs
  FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'advisor'::app_role)
  );

DROP POLICY IF EXISTS deal_pairs_update ON public.deal_pairs;
CREATE POLICY deal_pairs_update ON public.deal_pairs
  FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR responsavel_advisor_id = auth.uid()
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR responsavel_advisor_id = auth.uid()
  );

DROP POLICY IF EXISTS deal_pairs_delete ON public.deal_pairs;
CREATE POLICY deal_pairs_delete ON public.deal_pairs
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- ============================================================
-- RPC: create_deal_pair_from_match
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_deal_pair_from_match(
  _sell_mandate_id uuid,
  _buy_mandate_id uuid DEFAULT NULL,
  _buyer_profile_id uuid DEFAULT NULL,
  _source_match_id uuid DEFAULT NULL,
  _comissao_sell numeric DEFAULT 5,
  _comissao_buy numeric DEFAULT 0,
  _notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _pair_id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  IF NOT (has_role(_uid, 'admin'::app_role) OR has_role(_uid, 'advisor'::app_role)) THEN
    RAISE EXCEPTION 'forbidden: admin/advisor only';
  END IF;
  IF _buy_mandate_id IS NULL AND _buyer_profile_id IS NULL THEN
    RAISE EXCEPTION 'buy side required (buy_mandate_id or buyer_profile_id)';
  END IF;

  INSERT INTO public.deal_pairs (
    sell_mandate_id, buy_mandate_id, buyer_profile_id, source_match_id,
    responsavel_advisor_id, comissao_sell_pct, comissao_buy_pct, notes,
    created_by, status
  )
  VALUES (
    _sell_mandate_id, _buy_mandate_id, _buyer_profile_id, _source_match_id,
    _uid, COALESCE(_comissao_sell,5), COALESCE(_comissao_buy,0), _notes,
    _uid, 'draft'
  )
  RETURNING id INTO _pair_id;

  PERFORM public.log_audit_event(
    NULL, 'deal_pair', _pair_id, 'deal_pair_created',
    jsonb_build_object(
      'sell_mandate_id', _sell_mandate_id,
      'buy_mandate_id', _buy_mandate_id,
      'buyer_profile_id', _buyer_profile_id,
      'source_match_id', _source_match_id,
      'comissao_sell_pct', _comissao_sell,
      'comissao_buy_pct', _comissao_buy
    )
  );

  RETURN _pair_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_deal_pair_from_match(uuid,uuid,uuid,uuid,numeric,numeric,text) FROM public;
GRANT EXECUTE ON FUNCTION public.create_deal_pair_from_match(uuid,uuid,uuid,uuid,numeric,numeric,text) TO authenticated;

-- ============================================================
-- RPC: transition_deal_pair
-- ============================================================
CREATE OR REPLACE FUNCTION public.transition_deal_pair(
  _pair_id uuid,
  _new_status text,
  _reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _old_status text;
  _resp uuid;
  _allowed text[];
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;

  SELECT status, responsavel_advisor_id INTO _old_status, _resp
  FROM public.deal_pairs WHERE id = _pair_id FOR UPDATE;

  IF _old_status IS NULL THEN RAISE EXCEPTION 'pair not found'; END IF;
  IF NOT (has_role(_uid, 'admin'::app_role) OR _resp = _uid) THEN
    RAISE EXCEPTION 'forbidden: only admin or responsible advisor';
  END IF;

  -- transições válidas
  _allowed := CASE _old_status
    WHEN 'draft'  THEN ARRAY['active','lost']
    WHEN 'active' THEN ARRAY['nbo','lost']
    WHEN 'nbo'    THEN ARRAY['signed','lost']
    WHEN 'signed' THEN ARRAY['closed','lost']
    ELSE ARRAY[]::text[]
  END;

  IF NOT (_new_status = ANY(_allowed)) THEN
    RAISE EXCEPTION 'invalid transition % -> %', _old_status, _new_status;
  END IF;

  UPDATE public.deal_pairs
    SET status = _new_status,
        lost_reason = CASE WHEN _new_status='lost' THEN _reason ELSE lost_reason END
    WHERE id = _pair_id;

  PERFORM public.log_audit_event(
    NULL, 'deal_pair', _pair_id, 'deal_pair_transition',
    jsonb_build_object('from', _old_status, 'to', _new_status, 'reason', _reason)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.transition_deal_pair(uuid,text,text) FROM public;
GRANT EXECUTE ON FUNCTION public.transition_deal_pair(uuid,text,text) TO authenticated;

-- ============================================================
-- View enriquecida (nomes via mandates)
-- ============================================================
CREATE OR REPLACE VIEW public.deal_pairs_enriched
WITH (security_invoker = true)
AS
SELECT
  dp.*,
  sm.company_cnpj  AS sell_cnpj,
  sm.setor         AS sell_setor,
  sm.uf            AS sell_uf,
  sm.pipeline_stage AS sell_stage,
  bm.company_cnpj  AS buy_cnpj,
  bm.setor         AS buy_setor,
  bm.uf            AS buy_uf,
  bp.buyer_name    AS buyer_profile_name,
  bp.company_name  AS buyer_profile_company,
  p.full_name      AS responsavel_name
FROM public.deal_pairs dp
LEFT JOIN public.eb_mandates sm ON sm.id = dp.sell_mandate_id
LEFT JOIN public.eb_mandates bm ON bm.id = dp.buy_mandate_id
LEFT JOIN public.buyer_profiles bp ON bp.id = dp.buyer_profile_id
LEFT JOIN public.profiles p ON p.user_id = dp.responsavel_advisor_id;

GRANT SELECT ON public.deal_pairs_enriched TO authenticated;
