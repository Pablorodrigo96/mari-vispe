-- Add Monday-style fields to eb_mandates
ALTER TABLE equity_brain.mandates
  ADD COLUMN IF NOT EXISTS comprador_cnpj varchar(14),
  ADD COLUMN IF NOT EXISTS comprador_nome text,
  ADD COLUMN IF NOT EXISTS match_buyer_id uuid,
  ADD COLUMN IF NOT EXISTS drive_url text,
  ADD COLUMN IF NOT EXISTS contract_url text,
  ADD COLUMN IF NOT EXISTS data_assinatura_contrato date;

-- Update upsert RPC to accept the new fields
CREATE OR REPLACE FUNCTION public.eb_upsert_mandate(p jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'equity_brain'
AS $function$
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
      responsavel_id, observacoes,
      comprador_cnpj, comprador_nome, match_buyer_id, drive_url, contract_url, data_assinatura_contrato
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
      NULLIF(p->>'observacoes',''),
      NULLIF(p->>'comprador_cnpj',''),
      NULLIF(p->>'comprador_nome',''),
      NULLIF(p->>'match_buyer_id','')::uuid,
      NULLIF(p->>'drive_url',''),
      NULLIF(p->>'contract_url',''),
      NULLIF(p->>'data_assinatura_contrato','')::date
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
      comprador_cnpj  = COALESCE(NULLIF(p->>'comprador_cnpj',''), comprador_cnpj),
      comprador_nome  = COALESCE(NULLIF(p->>'comprador_nome',''), comprador_nome),
      match_buyer_id  = COALESCE(NULLIF(p->>'match_buyer_id','')::uuid, match_buyer_id),
      drive_url       = COALESCE(NULLIF(p->>'drive_url',''), drive_url),
      contract_url    = COALESCE(NULLIF(p->>'contract_url',''), contract_url),
      data_assinatura_contrato = COALESCE(NULLIF(p->>'data_assinatura_contrato','')::date, data_assinatura_contrato),
      updated_at      = now()
    WHERE id = v_id;
  END IF;

  RETURN v_id;
END $function$;