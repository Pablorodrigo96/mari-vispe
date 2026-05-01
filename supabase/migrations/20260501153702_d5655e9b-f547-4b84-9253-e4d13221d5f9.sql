-- ============ deals (match composto = ficha do par) ============
CREATE TABLE IF NOT EXISTS equity_brain.deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL,
  mandate_id uuid,
  buyer_id uuid NOT NULL,
  cnpj text NOT NULL,
  stage text NOT NULL DEFAULT 'discovery',
  outcome text NOT NULL DEFAULT 'open',
  owner_user_id uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_moved_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT deals_match_unique UNIQUE (match_id)
);

CREATE INDEX IF NOT EXISTS deals_buyer_idx   ON equity_brain.deals (buyer_id);
CREATE INDEX IF NOT EXISTS deals_mandate_idx ON equity_brain.deals (mandate_id);
CREATE INDEX IF NOT EXISTS deals_cnpj_idx    ON equity_brain.deals (cnpj);
CREATE INDEX IF NOT EXISTS deals_stage_idx   ON equity_brain.deals (stage);
CREATE INDEX IF NOT EXISTS deals_outcome_idx ON equity_brain.deals (outcome);

ALTER TABLE equity_brain.deals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS deals_authenticated_select ON equity_brain.deals;
CREATE POLICY deals_authenticated_select ON equity_brain.deals
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS deals_authenticated_insert ON equity_brain.deals;
CREATE POLICY deals_authenticated_insert ON equity_brain.deals
  FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS deals_authenticated_update ON equity_brain.deals;
CREATE POLICY deals_authenticated_update ON equity_brain.deals
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS deals_admin_delete ON equity_brain.deals;
CREATE POLICY deals_admin_delete ON equity_brain.deals
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- expor via PostgREST
GRANT USAGE ON SCHEMA equity_brain TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON equity_brain.deals TO authenticated;

-- updated_at trigger
CREATE OR REPLACE FUNCTION equity_brain.touch_deals_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  IF NEW.stage IS DISTINCT FROM OLD.stage OR NEW.outcome IS DISTINCT FROM OLD.outcome THEN
    NEW.last_moved_at = now();
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_deals_touch ON equity_brain.deals;
CREATE TRIGGER trg_deals_touch BEFORE UPDATE ON equity_brain.deals
  FOR EACH ROW EXECUTE FUNCTION equity_brain.touch_deals_updated_at();

-- transitions ganha deal_id (nullable, retrocompat)
ALTER TABLE public.eb_pipeline_transitions
  ADD COLUMN IF NOT EXISTS deal_id uuid;

CREATE INDEX IF NOT EXISTS eb_pipeline_transitions_deal_id_idx
  ON public.eb_pipeline_transitions (deal_id);

-- promote_match_to_deal: cria/recupera deal a partir de um match
CREATE OR REPLACE FUNCTION equity_brain.promote_match_to_deal(_match_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, equity_brain
AS $$
DECLARE
  v_deal_id   uuid;
  v_cnpj      text;
  v_buyer_id  uuid;
  v_mandate   uuid;
BEGIN
  IF _match_id IS NULL THEN RAISE EXCEPTION 'match_id obrigatório'; END IF;

  SELECT id INTO v_deal_id FROM equity_brain.deals WHERE match_id = _match_id;
  IF v_deal_id IS NOT NULL THEN RETURN v_deal_id; END IF;

  SELECT m.cnpj, m.buyer_id INTO v_cnpj, v_buyer_id
  FROM equity_brain.matches m WHERE m.id = _match_id;

  IF v_cnpj IS NULL THEN RAISE EXCEPTION 'match % não encontrado', _match_id; END IF;

  -- mandato vigente do CNPJ (se houver)
  SELECT id INTO v_mandate FROM equity_brain.mandates
  WHERE company_cnpj = v_cnpj AND COALESCE(outcome,'') <> 'cancelado'
  ORDER BY created_at DESC LIMIT 1;

  INSERT INTO equity_brain.deals (match_id, mandate_id, buyer_id, cnpj, stage, outcome, owner_user_id)
  VALUES (_match_id, v_mandate, v_buyer_id, v_cnpj, 'discovery', 'open', auth.uid())
  RETURNING id INTO v_deal_id;

  RETURN v_deal_id;
END $$;

GRANT EXECUTE ON FUNCTION equity_brain.promote_match_to_deal(uuid) TO authenticated;