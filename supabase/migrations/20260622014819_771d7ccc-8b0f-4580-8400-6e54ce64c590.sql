-- ===== Wave 8: Ponte EB - Equity Planner -> Mandato =====

-- 1) Adicionar colunas de promoção em equity_assessments
ALTER TABLE public.equity_assessments
  ADD COLUMN IF NOT EXISTS promoted_mandate_id UUID,
  ADD COLUMN IF NOT EXISTS promoted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS promoted_by UUID;

CREATE INDEX IF NOT EXISTS idx_equity_assessments_promoted_mandate
  ON public.equity_assessments(promoted_mandate_id) WHERE promoted_mandate_id IS NOT NULL;

-- 2) Função RPC: promove um assessment a um mandato no EB
CREATE OR REPLACE FUNCTION public.promote_assessment_to_mandate(_assessment_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, equity_brain
AS $$
DECLARE
  v_user UUID := auth.uid();
  v_assessment RECORD;
  v_company RECORD;
  v_val RECORD;
  v_cnpj VARCHAR(14);
  v_mandate_id UUID;
  v_existing_mandate UUID;
  v_buyer_count INT := 0;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'auth_required';
  END IF;

  -- Carrega assessment + autoriza
  SELECT a.* INTO v_assessment
    FROM public.equity_assessments a
   WHERE a.id = _assessment_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'assessment_not_found';
  END IF;

  IF NOT (v_assessment.user_id = v_user
          OR public.has_role(v_user,'admin')
          OR public.has_role(v_user,'advisor')) THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  IF v_assessment.status <> 'computed' THEN
    RAISE EXCEPTION 'assessment_not_computed';
  END IF;

  -- Se já foi promovido, retorna o existente (idempotente)
  IF v_assessment.promoted_mandate_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'mandate_id', v_assessment.promoted_mandate_id,
      'already_promoted', true
    );
  END IF;

  -- Carrega company
  SELECT * INTO v_company
    FROM public.equity_companies WHERE id = v_assessment.company_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'company_not_found';
  END IF;

  -- Normaliza CNPJ (apenas dígitos, 14 chars)
  v_cnpj := NULLIF(regexp_replace(COALESCE(v_company.cnpj,''), '\D', '', 'g'), '');
  IF v_cnpj IS NULL OR length(v_cnpj) <> 14 THEN
    RAISE EXCEPTION 'cnpj_invalido';
  END IF;

  -- Garante row em equity_brain.companies
  INSERT INTO equity_brain.companies (
    cnpj, razao_social, nome_fantasia, cnae_principal, porte, uf, municipio, source_priority
  ) VALUES (
    v_cnpj,
    COALESCE(v_company.razao_social, 'Empresa ' || v_cnpj),
    NULL,
    v_company.cnae,
    v_company.porte,
    v_company.uf,
    v_company.cidade,
    'equity_planner'
  )
  ON CONFLICT (cnpj) DO UPDATE
    SET razao_social = COALESCE(equity_brain.companies.razao_social, EXCLUDED.razao_social),
        uf           = COALESCE(equity_brain.companies.uf, EXCLUDED.uf),
        municipio    = COALESCE(equity_brain.companies.municipio, EXCLUDED.municipio);

  -- Valuation triangulado (usa o mais recente)
  SELECT * INTO v_val
    FROM public.equity_valuations
   WHERE assessment_id = _assessment_id
   ORDER BY created_at DESC
   LIMIT 1;

  -- Reaproveita mandato vigente se já existir
  SELECT id INTO v_existing_mandate
    FROM equity_brain.mandates
   WHERE company_cnpj = v_cnpj
     AND status = 'vigente'
   ORDER BY created_at DESC
   LIMIT 1;

  IF v_existing_mandate IS NOT NULL THEN
    v_mandate_id := v_existing_mandate;
  ELSE
    INSERT INTO equity_brain.mandates (
      company_cnpj, status, exclusividade, valor_pedido,
      responsavel_id, observacoes, source, created_by
    ) VALUES (
      v_cnpj,
      'vigente',
      false,
      COALESCE(v_val.valor_atual, NULL),
      v_user,
      format('Promovido do Equity Planner. IPE %s · Veredito %s',
             COALESCE(v_assessment.ipe_composto::text,'?'),
             COALESCE(v_assessment.veredito_liquidez,'n/d')),
      'equity_planner',
      v_user
    )
    RETURNING id INTO v_mandate_id;
  END IF;

  -- Atividade na timeline do CRM
  INSERT INTO equity_brain.crm_activities (
    entity_type, entity_id, kind, direction,
    titulo, descricao, payload, created_by
  ) VALUES (
    'mandate', v_mandate_id, 'note', 'system',
    'Mandato originado pelo Equity Planner',
    format('Assessment %s · IPE %s · Valor atual %s · Valor alvo %s',
           v_assessment.id,
           COALESCE(v_assessment.ipe_composto::text,'?'),
           COALESCE(to_char(v_val.valor_atual,'FM999G999G999G999D00'),'n/d'),
           COALESCE(to_char(v_val.valor_alvo,'FM999G999G999G999D00'),'n/d')),
    jsonb_build_object(
      'assessment_id', v_assessment.id,
      'arquetipo_id', v_assessment.arquetipo_id,
      'ipe_composto', v_assessment.ipe_composto,
      'veredito_liquidez', v_assessment.veredito_liquidez,
      'valor_atual', v_val.valor_atual,
      'valor_alvo', v_val.valor_alvo,
      'multiplo_aplicado', v_val.multiplo_aplicado
    ),
    v_user
  );

  -- Conta buyers do plano (apenas informativo no retorno)
  SELECT count(*) INTO v_buyer_count
    FROM public.equity_buyer_map WHERE assessment_id = _assessment_id;

  -- Marca assessment como promovido
  UPDATE public.equity_assessments
     SET promoted_mandate_id = v_mandate_id,
         promoted_at = now(),
         promoted_by = v_user,
         updated_at = now()
   WHERE id = _assessment_id;

  RETURN jsonb_build_object(
    'mandate_id', v_mandate_id,
    'company_cnpj', v_cnpj,
    'buyer_count', v_buyer_count,
    'reused_existing', v_existing_mandate IS NOT NULL,
    'already_promoted', false
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.promote_assessment_to_mandate(UUID) TO authenticated;