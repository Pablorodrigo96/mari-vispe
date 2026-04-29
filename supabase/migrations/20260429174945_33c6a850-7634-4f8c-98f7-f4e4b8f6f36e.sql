-- Helper: upsert mandate + company in one call
CREATE OR REPLACE FUNCTION public.eb_upsert_mandate(p jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, equity_brain
AS $$
DECLARE
  v_id uuid;
  v_cnpj text := NULLIF(p->>'company_cnpj','');
  v_user uuid := auth.uid();
BEGIN
  IF NOT public.has_role(v_user, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF v_cnpj IS NULL THEN
    RAISE EXCEPTION 'cnpj_required';
  END IF;

  -- ensure company exists (minimum payload)
  INSERT INTO equity_brain.companies (cnpj, razao_social, nome_fantasia, uf, setor_ma)
  VALUES (
    v_cnpj,
    COALESCE(NULLIF(p->>'razao_social',''), v_cnpj),
    NULLIF(p->>'nome_fantasia',''),
    NULLIF(p->>'uf',''),
    NULLIF(p->>'setor','')
  )
  ON CONFLICT (cnpj) DO UPDATE SET
    razao_social = COALESCE(EXCLUDED.razao_social, equity_brain.companies.razao_social),
    nome_fantasia = COALESCE(EXCLUDED.nome_fantasia, equity_brain.companies.nome_fantasia),
    uf = COALESCE(EXCLUDED.uf, equity_brain.companies.uf),
    setor_ma = COALESCE(EXCLUDED.setor_ma, equity_brain.companies.setor_ma);

  v_id := NULLIF(p->>'id','')::uuid;

  IF v_id IS NULL THEN
    INSERT INTO equity_brain.mandates (
      company_cnpj, status, exclusividade, valor_pedido, valor_pretendido, ticket_alvo,
      commission_pct, data_inicio, data_assinatura, data_vencimento, data_fechamento,
      regiao, uf, setor, deal_type, pipeline_stage, outcome,
      valor_operacao, faturamento_vispe, contato_nome, contato_telefone, contato_email,
      responsavel_id, observacoes
    )
    VALUES (
      v_cnpj,
      COALESCE((p->>'status')::equity_brain.mandate_status, 'vigente'),
      COALESCE((p->>'exclusividade')::boolean, false),
      NULLIF(p->>'valor_pedido','')::numeric,
      NULLIF(p->>'valor_pretendido','')::numeric,
      NULLIF(p->>'ticket_alvo','')::numeric,
      NULLIF(p->>'commission_pct','')::numeric,
      NULLIF(p->>'data_inicio','')::date,
      NULLIF(p->>'data_assinatura','')::date,
      NULLIF(p->>'data_vencimento','')::date,
      NULLIF(p->>'data_fechamento','')::date,
      NULLIF(p->>'regiao',''),
      NULLIF(p->>'uf',''),
      NULLIF(p->>'setor',''),
      COALESCE((p->>'deal_type')::equity_brain.deal_type, 'sellside'),
      COALESCE((p->>'pipeline_stage')::equity_brain.pipeline_stage, 'match'),
      COALESCE((p->>'outcome')::equity_brain.deal_outcome, 'em_andamento'),
      NULLIF(p->>'valor_operacao','')::numeric,
      NULLIF(p->>'faturamento_vispe','')::numeric,
      NULLIF(p->>'contato_nome',''),
      NULLIF(p->>'contato_telefone',''),
      NULLIF(p->>'contato_email',''),
      NULLIF(p->>'responsavel_id','')::uuid,
      NULLIF(p->>'observacoes','')
    )
    RETURNING id INTO v_id;
  ELSE
    UPDATE equity_brain.mandates SET
      company_cnpj    = v_cnpj,
      status          = COALESCE((p->>'status')::equity_brain.mandate_status, status),
      exclusividade   = COALESCE((p->>'exclusividade')::boolean, exclusividade),
      valor_pedido    = COALESCE(NULLIF(p->>'valor_pedido','')::numeric, valor_pedido),
      valor_pretendido= COALESCE(NULLIF(p->>'valor_pretendido','')::numeric, valor_pretendido),
      ticket_alvo     = COALESCE(NULLIF(p->>'ticket_alvo','')::numeric, ticket_alvo),
      commission_pct  = COALESCE(NULLIF(p->>'commission_pct','')::numeric, commission_pct),
      data_inicio     = COALESCE(NULLIF(p->>'data_inicio','')::date, data_inicio),
      data_assinatura = COALESCE(NULLIF(p->>'data_assinatura','')::date, data_assinatura),
      data_vencimento = COALESCE(NULLIF(p->>'data_vencimento','')::date, data_vencimento),
      data_fechamento = COALESCE(NULLIF(p->>'data_fechamento','')::date, data_fechamento),
      regiao          = COALESCE(NULLIF(p->>'regiao',''), regiao),
      uf              = COALESCE(NULLIF(p->>'uf',''), uf),
      setor           = COALESCE(NULLIF(p->>'setor',''), setor),
      deal_type       = COALESCE((p->>'deal_type')::equity_brain.deal_type, deal_type),
      pipeline_stage  = COALESCE((p->>'pipeline_stage')::equity_brain.pipeline_stage, pipeline_stage),
      outcome         = COALESCE((p->>'outcome')::equity_brain.deal_outcome, outcome),
      valor_operacao  = COALESCE(NULLIF(p->>'valor_operacao','')::numeric, valor_operacao),
      faturamento_vispe = COALESCE(NULLIF(p->>'faturamento_vispe','')::numeric, faturamento_vispe),
      contato_nome    = COALESCE(NULLIF(p->>'contato_nome',''), contato_nome),
      contato_telefone= COALESCE(NULLIF(p->>'contato_telefone',''), contato_telefone),
      contato_email   = COALESCE(NULLIF(p->>'contato_email',''), contato_email),
      responsavel_id  = COALESCE(NULLIF(p->>'responsavel_id','')::uuid, responsavel_id),
      observacoes     = COALESCE(NULLIF(p->>'observacoes',''), observacoes),
      updated_at      = now()
    WHERE id = v_id;
  END IF;

  RETURN v_id;
END $$;

GRANT EXECUTE ON FUNCTION public.eb_upsert_mandate(jsonb) TO authenticated;