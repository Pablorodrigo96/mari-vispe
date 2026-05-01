-- =====================================================================
-- CRM Fase 0+1: classificação operacional, normalização e KPIs corretos
-- =====================================================================

ALTER TABLE equity_brain.mandates
  ADD COLUMN IF NOT EXISTS deal_origin text,
  ADD COLUMN IF NOT EXISTS deal_kind text,
  ADD COLUMN IF NOT EXISTS deal_confidence text DEFAULT 'real',
  ADD COLUMN IF NOT EXISTS needs_enrichment boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_mandates_deal_kind ON equity_brain.mandates(deal_kind);
CREATE INDEX IF NOT EXISTS idx_mandates_deal_origin ON equity_brain.mandates(deal_origin);
CREATE INDEX IF NOT EXISTS idx_mandates_needs_enrich ON equity_brain.mandates(needs_enrichment) WHERE needs_enrichment = true;

UPDATE equity_brain.mandates SET
  deal_origin = CASE
    WHEN source = 'backfill_marketplace' THEN 'marketplace'
    WHEN source = 'import' THEN 'import'
    WHEN source = 'match_inbox' THEN 'match_inbox'
    WHEN source = 'manual' OR source IS NULL THEN 'manual'
    ELSE source
  END
WHERE deal_origin IS NULL;

UPDATE equity_brain.mandates SET
  deal_kind = CASE
    WHEN source = 'backfill_marketplace' THEN 'marketplace_listing'
    WHEN data_assinatura IS NOT NULL THEN 'mandato_assinado'
    WHEN comprador_cnpj IS NOT NULL OR comprador_nome IS NOT NULL THEN 'buyer_mandate'
    WHEN source = 'import' THEN 'vendedor_sem_mandato'
    ELSE 'prospeccao'
  END
WHERE deal_kind IS NULL;

UPDATE equity_brain.mandates SET
  deal_confidence = CASE
    WHEN company_cnpj LIKE '99999%' OR company_cnpj LIKE 'CR%' OR company_cnpj LIKE 'VL%' THEN 'precisa_enriquecer'
    WHEN responsavel_id IS NULL AND contato_nome IS NULL AND contato_telefone IS NULL THEN 'incompleto'
    ELSE 'real'
  END;

UPDATE equity_brain.mandates SET needs_enrichment = true
WHERE company_cnpj LIKE '99999%' OR company_cnpj LIKE 'CR%' OR company_cnpj LIKE 'VL%';

UPDATE equity_brain.mandates SET outcome = 'em_andamento'
WHERE outcome = 'vigente' OR outcome IS NULL;

UPDATE equity_brain.mandates
SET stage_changed_at = COALESCE(stage_changed_at, updated_at, created_at, now())
WHERE stage_changed_at IS NULL;

DROP VIEW IF EXISTS public.eb_crm_kpis CASCADE;
CREATE VIEW public.eb_crm_kpis WITH (security_invoker=on) AS
SELECT
  (SELECT count(*) FROM equity_brain.mandates) AS total_mandates,
  (SELECT count(*) FROM equity_brain.mandates WHERE deal_kind = 'mandato_assinado') AS total_mandates_real,
  (SELECT count(*) FROM equity_brain.mandates WHERE deal_kind = 'marketplace_listing') AS total_marketplace,
  (SELECT count(*) FROM equity_brain.mandates WHERE deal_kind = 'vendedor_sem_mandato') AS total_vendedores_sem_mandato,
  (SELECT count(*) FROM equity_brain.buyers WHERE status = 'ativo') AS total_buyers_active,
  (SELECT count(*) FROM equity_brain.mandates WHERE status = 'vigente') AS mandates_vigente,
  (SELECT count(*) FROM equity_brain.mandates WHERE outcome = 'em_andamento'
     AND status NOT IN ('vendemos','cancelado','vencido','vendeu_sozinho')) AS mandates_em_negociacao,
  (SELECT count(*) FROM equity_brain.mandates WHERE status = 'vendemos' OR outcome = 'concluido') AS mandates_vendemos,
  (SELECT count(*) FROM equity_brain.mandates WHERE status = 'cancelado' OR outcome = 'cancelado') AS mandates_cancelado,
  (SELECT count(*) FROM equity_brain.mandates WHERE status = 'vencido' OR outcome = 'vencido') AS mandates_vencido,
  (SELECT count(*) FROM equity_brain.mandates WHERE responsavel_id IS NULL) AS mandates_sem_responsavel,
  (SELECT count(*) FROM equity_brain.mandates WHERE needs_enrichment) AS mandates_precisa_enriquecer,
  (SELECT count(*) FROM equity_brain.mandates
     WHERE pipeline_stage = 'match' AND stage_changed_at < now() - interval '30 days') AS mandates_presos_match,
  (SELECT coalesce(sum(valor_pedido),0) FROM equity_brain.mandates
     WHERE status IN ('vigente','em_negociacao','vendemos')) AS valor_total_carteira,
  (SELECT coalesce(sum(valor_pedido*comissao_pct/100),0) FROM equity_brain.mandates
     WHERE status = 'vendemos') AS comissao_realizada,
  (SELECT coalesce(avg(valor_pedido),0) FROM equity_brain.mandates
     WHERE valor_pedido IS NOT NULL) AS ticket_medio;

GRANT SELECT ON public.eb_crm_kpis TO authenticated;

DROP VIEW IF EXISTS public.eb_mandates_enriched CASCADE;
CREATE VIEW public.eb_mandates_enriched WITH (security_invoker=on) AS
SELECT
  m.id,
  m.company_cnpj,
  m.status,
  m.exclusividade,
  m.data_assinatura,
  m.data_assinatura_contrato,
  m.data_vencimento,
  m.data_inicio,
  m.data_fechamento,
  m.expected_close_at,
  m.comissao_pct,
  m.commission_pct,
  m.valor_pedido,
  m.valor_operacao,
  m.faturamento_vispe,
  m.responsavel_id,
  m.observacoes,
  m.source,
  m.deal_origin,
  m.deal_kind,
  m.deal_confidence,
  m.needs_enrichment,
  m.deal_type,
  m.pipeline_stage,
  m.outcome,
  m.regiao,
  m.uf AS uf_mandate,
  m.setor AS setor_mandate,
  m.contato_nome,
  m.contato_telefone,
  m.contato_email,
  m.comprador_cnpj,
  m.comprador_nome,
  m.match_buyer_id,
  m.drive_url,
  m.contract_url,
  m.temperature,
  m.temperature_reason,
  m.temperature_updated_at,
  m.probability,
  m.stage_changed_at,
  m.created_at,
  m.updated_at,
  c.razao_social,
  c.nome_fantasia,
  c.codename,
  COALESCE(c.razao_social, c.nome_fantasia, c.codename, m.company_cnpj) AS display_name,
  COALESCE(m.uf, c.uf) AS uf,
  c.municipio,
  COALESCE(m.setor, c.setor_ma) AS setor_ma,
  c.subsetor_ma,
  c.faturamento_estimado,
  c.has_listing,
  c.listing_id,
  CASE COALESCE(m.uf, c.uf)
    WHEN 'SP' THEN 'sudeste' WHEN 'RJ' THEN 'sudeste' WHEN 'MG' THEN 'sudeste' WHEN 'ES' THEN 'sudeste'
    WHEN 'PR' THEN 'sul' WHEN 'SC' THEN 'sul' WHEN 'RS' THEN 'sul'
    WHEN 'GO' THEN 'centro-oeste' WHEN 'MT' THEN 'centro-oeste' WHEN 'MS' THEN 'centro-oeste' WHEN 'DF' THEN 'centro-oeste'
    WHEN 'BA' THEN 'nordeste' WHEN 'PE' THEN 'nordeste' WHEN 'CE' THEN 'nordeste' WHEN 'MA' THEN 'nordeste'
    WHEN 'PB' THEN 'nordeste' WHEN 'RN' THEN 'nordeste' WHEN 'AL' THEN 'nordeste' WHEN 'SE' THEN 'nordeste' WHEN 'PI' THEN 'nordeste'
    WHEN 'AM' THEN 'norte' WHEN 'PA' THEN 'norte' WHEN 'AC' THEN 'norte' WHEN 'RO' THEN 'norte'
    WHEN 'RR' THEN 'norte' WHEN 'AP' THEN 'norte' WHEN 'TO' THEN 'norte'
    ELSE 'outros'
  END AS regiao_calc,
  (SELECT row_to_json(ct.*) FROM equity_brain.contacts ct
     WHERE ct.entity_type='mandate' AND ct.entity_id=m.id AND ct.is_primary=true
     ORDER BY ct.created_at LIMIT 1) AS primary_contact
FROM equity_brain.mandates m
LEFT JOIN equity_brain.companies c ON c.cnpj = m.company_cnpj;

GRANT SELECT ON public.eb_mandates_enriched TO authenticated;

CREATE OR REPLACE VIEW public.eb_crm_audit
WITH (security_invoker=on) AS
SELECT
  m.id,
  m.company_cnpj,
  COALESCE(c.razao_social, c.nome_fantasia, c.codename, m.company_cnpj) AS display_name,
  m.deal_kind,
  m.deal_origin,
  m.deal_confidence,
  m.pipeline_stage,
  m.outcome,
  m.status,
  m.responsavel_id,
  m.stage_changed_at,
  m.needs_enrichment,
  (m.responsavel_id IS NULL) AS issue_no_owner,
  (m.contato_nome IS NULL AND m.contato_telefone IS NULL AND m.contato_email IS NULL
    AND NOT EXISTS (SELECT 1 FROM equity_brain.contacts ct
                    WHERE ct.entity_type='mandate' AND ct.entity_id=m.id))
    AS issue_no_contact,
  (m.valor_pedido IS NULL AND m.valor_operacao IS NULL) AS issue_no_value,
  (m.company_cnpj LIKE '99999%' OR m.company_cnpj LIKE 'CR%' OR m.company_cnpj LIKE 'VL%') AS issue_fake_cnpj,
  (m.pipeline_stage = 'match' AND m.stage_changed_at < now() - interval '30 days'
    AND m.status NOT IN ('cancelado','vencido','vendeu_sozinho','vendemos')) AS issue_stuck_match,
  m.created_at,
  m.updated_at
FROM equity_brain.mandates m
LEFT JOIN equity_brain.companies c ON c.cnpj = m.company_cnpj;

GRANT SELECT ON public.eb_crm_audit TO authenticated;

CREATE OR REPLACE FUNCTION equity_brain.rebuild_mandate_classification()
RETURNS TABLE(updated bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public, equity_brain AS $$
DECLARE v_count bigint;
BEGIN
  WITH upd AS (
    UPDATE equity_brain.mandates m SET
      deal_kind = CASE
        WHEN m.source = 'backfill_marketplace' THEN 'marketplace_listing'
        WHEN m.data_assinatura IS NOT NULL THEN 'mandato_assinado'
        WHEN m.comprador_cnpj IS NOT NULL OR m.comprador_nome IS NOT NULL THEN 'buyer_mandate'
        WHEN m.source = 'import' THEN 'vendedor_sem_mandato'
        ELSE COALESCE(m.deal_kind, 'prospeccao')
      END,
      deal_origin = COALESCE(m.deal_origin, CASE
        WHEN m.source = 'backfill_marketplace' THEN 'marketplace'
        WHEN m.source = 'import' THEN 'import'
        WHEN m.source = 'match_inbox' THEN 'match_inbox'
        ELSE 'manual'
      END),
      deal_confidence = CASE
        WHEN m.company_cnpj LIKE '99999%' OR m.company_cnpj LIKE 'CR%' OR m.company_cnpj LIKE 'VL%' THEN 'precisa_enriquecer'
        WHEN m.responsavel_id IS NULL AND m.contato_nome IS NULL AND m.contato_telefone IS NULL THEN 'incompleto'
        ELSE 'real'
      END,
      needs_enrichment = (m.company_cnpj LIKE '99999%' OR m.company_cnpj LIKE 'CR%' OR m.company_cnpj LIKE 'VL%'),
      stage_changed_at = COALESCE(m.stage_changed_at, m.updated_at, m.created_at, now())
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM upd;
  RETURN QUERY SELECT v_count;
END $$;

GRANT EXECUTE ON FUNCTION equity_brain.rebuild_mandate_classification() TO authenticated;