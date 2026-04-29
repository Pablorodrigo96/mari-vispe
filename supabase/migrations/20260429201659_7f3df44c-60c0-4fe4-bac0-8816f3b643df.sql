
-- Phase: Promotion of qualified leads (dual-role: target / buyer / dual)

-- ============== Promotion tracking columns ==============
ALTER TABLE equity_brain.companies
  ADD COLUMN IF NOT EXISTS promoted_from text,
  ADD COLUMN IF NOT EXISTS promoted_at timestamptz,
  ADD COLUMN IF NOT EXISTS linked_buyer_id uuid;

ALTER TABLE equity_brain.buyers
  ADD COLUMN IF NOT EXISTS promoted_from text,
  ADD COLUMN IF NOT EXISTS promoted_at timestamptz,
  ADD COLUMN IF NOT EXISTS linked_company_cnpj varchar;

CREATE INDEX IF NOT EXISTS idx_companies_linked_buyer ON equity_brain.companies(linked_buyer_id);
CREATE INDEX IF NOT EXISTS idx_buyers_linked_company ON equity_brain.buyers(linked_company_cnpj);

-- Avoid duplicate promotions: a buyer promoted from a given company should appear only once
CREATE UNIQUE INDEX IF NOT EXISTS uniq_buyers_promoted_from_company
  ON equity_brain.buyers(linked_company_cnpj)
  WHERE promoted_from = 'company' AND linked_company_cnpj IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_companies_promoted_from_buyer
  ON equity_brain.companies(linked_buyer_id)
  WHERE promoted_from = 'buyer' AND linked_buyer_id IS NOT NULL;

-- ============== Match queue (async re-matching) ==============
CREATE TABLE IF NOT EXISTS equity_brain.match_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('company','buyer')),
  entity_id text NOT NULL,
  reason text NOT NULL,
  enqueued_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_match_queue_pending ON equity_brain.match_queue(enqueued_at) WHERE processed_at IS NULL;

ALTER TABLE equity_brain.match_queue ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins manage match_queue" ON equity_brain.match_queue;
CREATE POLICY "Admins manage match_queue" ON equity_brain.match_queue
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::app_role));

-- ============== Extended qualify_lead with optional promotion ==============
CREATE OR REPLACE FUNCTION public.qualify_lead(
  p_entity_type text,
  p_entity_id text,
  p_source text DEFAULT 'cold_outreach',
  p_notes text DEFAULT NULL,
  p_promote_to_buyer boolean DEFAULT false,
  p_promote_to_company boolean DEFAULT false,
  p_buyer_profile jsonb DEFAULT NULL,
  p_company_profile jsonb DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, equity_brain
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_company_row equity_brain.companies%ROWTYPE;
  v_buyer_row equity_brain.buyers%ROWTYPE;
  v_new_buyer_id uuid;
  v_new_company_cnpj varchar;
  v_result jsonb := jsonb_build_object('ok', true);
BEGIN
  IF NOT (public.has_role(v_user, 'admin'::app_role) OR public.has_role(v_user, 'advisor'::app_role)) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF p_entity_type = 'company' THEN
    UPDATE equity_brain.companies
       SET qualification_status = 'qualified',
           qualified_at = now(),
           qualified_by = v_user,
           qualification_source = COALESCE(p_source, 'cold_outreach')
     WHERE cnpj = p_entity_id
     RETURNING * INTO v_company_row;

    IF v_company_row.cnpj IS NULL THEN
      RAISE EXCEPTION 'company not found: %', p_entity_id;
    END IF;

    INSERT INTO equity_brain.match_queue(entity_type, entity_id, reason)
      VALUES ('company', v_company_row.cnpj, 'qualified');

    -- Optional: also create buyer counterpart
    IF p_promote_to_buyer THEN
      -- Skip if already promoted
      SELECT id INTO v_new_buyer_id FROM equity_brain.buyers
        WHERE linked_company_cnpj = v_company_row.cnpj AND promoted_from = 'company' LIMIT 1;

      IF v_new_buyer_id IS NULL THEN
        INSERT INTO equity_brain.buyers (
          nome, tipo, cnpj, status, source,
          ticket_min, ticket_max,
          setores_interesse, ufs_interesse, observacoes,
          qualification_status, qualified_at, qualified_by, qualification_source,
          promoted_from, promoted_at, linked_company_cnpj
        ) VALUES (
          COALESCE(NULLIF(v_company_row.razao_social,''), v_company_row.nome_fantasia, 'Promovido de '||v_company_row.cnpj),
          COALESCE(p_buyer_profile->>'tipo', 'estrategico'),
          v_company_row.cnpj,
          'ativo',
          'promoted_from_company',
          NULLIF((p_buyer_profile->>'ticket_min'),'')::numeric,
          NULLIF((p_buyer_profile->>'ticket_max'),'')::numeric,
          CASE WHEN p_buyer_profile ? 'setores_interesse'
               THEN ARRAY(SELECT jsonb_array_elements_text(p_buyer_profile->'setores_interesse'))
               ELSE ARRAY[v_company_row.setor_ma]::text[] END,
          CASE WHEN p_buyer_profile ? 'ufs_interesse'
               THEN ARRAY(SELECT jsonb_array_elements_text(p_buyer_profile->'ufs_interesse'))
               ELSE ARRAY[v_company_row.uf]::text[] END,
          COALESCE(p_buyer_profile->>'observacoes', p_notes),
          'qualified', now(), v_user, COALESCE(p_source,'cold_outreach'),
          'company', now(), v_company_row.cnpj
        ) RETURNING id INTO v_new_buyer_id;

        UPDATE equity_brain.companies
           SET linked_buyer_id = v_new_buyer_id
         WHERE cnpj = v_company_row.cnpj;

        INSERT INTO equity_brain.match_queue(entity_type, entity_id, reason)
          VALUES ('buyer', v_new_buyer_id::text, 'promoted_from_company');

        INSERT INTO equity_brain.deal_events (event_type, cnpj, buyer_id, notes, bdr_user_id, metadata)
          VALUES ('lead_promoted', v_company_row.cnpj, v_new_buyer_id, 'Company qualified and promoted to buyer', v_user,
                  jsonb_build_object('source', p_source, 'direction','company_to_buyer'));
      END IF;
      v_result := v_result || jsonb_build_object('promoted_buyer_id', v_new_buyer_id);
    END IF;

    v_result := v_result || jsonb_build_object('entity_type','company','entity_id', v_company_row.cnpj);

  ELSIF p_entity_type = 'buyer' THEN
    UPDATE equity_brain.buyers
       SET qualification_status = 'qualified',
           qualified_at = now(),
           qualified_by = v_user,
           qualification_source = COALESCE(p_source, 'cold_outreach')
     WHERE id = p_entity_id::uuid
     RETURNING * INTO v_buyer_row;

    IF v_buyer_row.id IS NULL THEN
      RAISE EXCEPTION 'buyer not found: %', p_entity_id;
    END IF;

    INSERT INTO equity_brain.match_queue(entity_type, entity_id, reason)
      VALUES ('buyer', v_buyer_row.id::text, 'qualified');

    -- Optional: also create company counterpart (requires CNPJ)
    IF p_promote_to_company THEN
      v_new_company_cnpj := COALESCE(p_company_profile->>'cnpj', v_buyer_row.cnpj);
      IF v_new_company_cnpj IS NULL OR v_new_company_cnpj = '' THEN
        RAISE EXCEPTION 'cannot promote buyer to company without cnpj';
      END IF;

      -- If company already exists, just link + qualify
      IF EXISTS (SELECT 1 FROM equity_brain.companies WHERE cnpj = v_new_company_cnpj) THEN
        UPDATE equity_brain.companies
           SET qualification_status = 'qualified',
               qualified_at = COALESCE(qualified_at, now()),
               qualified_by = COALESCE(qualified_by, v_user),
               qualification_source = COALESCE(qualification_source, p_source),
               linked_buyer_id = COALESCE(linked_buyer_id, v_buyer_row.id),
               promoted_from = COALESCE(promoted_from, 'buyer'),
               promoted_at = COALESCE(promoted_at, now())
         WHERE cnpj = v_new_company_cnpj;
      ELSE
        INSERT INTO equity_brain.companies (
          cnpj, razao_social, nome_fantasia, uf, municipio,
          setor_ma, source,
          qualification_status, qualified_at, qualified_by, qualification_source,
          promoted_from, promoted_at, linked_buyer_id
        ) VALUES (
          v_new_company_cnpj,
          COALESCE(p_company_profile->>'razao_social', v_buyer_row.nome),
          p_company_profile->>'nome_fantasia',
          COALESCE(p_company_profile->>'uf', (v_buyer_row.ufs_interesse)[1]),
          p_company_profile->>'municipio',
          COALESCE(p_company_profile->>'setor_ma', (v_buyer_row.setores_interesse)[1]),
          'promoted_from_buyer',
          'qualified', now(), v_user, COALESCE(p_source,'cold_outreach'),
          'buyer', now(), v_buyer_row.id
        );
      END IF;

      UPDATE equity_brain.buyers
         SET linked_company_cnpj = v_new_company_cnpj
       WHERE id = v_buyer_row.id;

      INSERT INTO equity_brain.match_queue(entity_type, entity_id, reason)
        VALUES ('company', v_new_company_cnpj, 'promoted_from_buyer');

      INSERT INTO equity_brain.deal_events (event_type, cnpj, buyer_id, notes, bdr_user_id, metadata)
        VALUES ('lead_promoted', v_new_company_cnpj, v_buyer_row.id, 'Buyer qualified and promoted to company', v_user,
                jsonb_build_object('source', p_source, 'direction','buyer_to_company'));

      v_result := v_result || jsonb_build_object('promoted_company_cnpj', v_new_company_cnpj);
    END IF;

    v_result := v_result || jsonb_build_object('entity_type','buyer','entity_id', v_buyer_row.id);
  ELSE
    RAISE EXCEPTION 'invalid entity_type: %', p_entity_type;
  END IF;

  RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.qualify_lead(text, text, text, text, boolean, boolean, jsonb, jsonb) TO authenticated;

-- Refresh public view to expose new columns
DROP VIEW IF EXISTS public.eb_companies CASCADE;
CREATE VIEW public.eb_companies AS SELECT * FROM equity_brain.companies;
GRANT SELECT ON public.eb_companies TO anon, authenticated;
