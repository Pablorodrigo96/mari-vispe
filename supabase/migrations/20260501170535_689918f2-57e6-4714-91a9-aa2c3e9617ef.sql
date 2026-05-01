-- View que junta os 317 mandatos + companies para alimentar os 4 dashboards M&A
CREATE OR REPLACE VIEW public.eb_v_mandates_full
WITH (security_invoker = on) AS
SELECT
  m.id,
  m.company_cnpj,
  c.razao_social,
  c.nome_fantasia,
  c.codename,
  -- status / fases
  m.status::text                      AS status,
  m.exclusividade,
  m.deal_type::text                   AS deal_type,
  m.deal_kind::text                   AS deal_kind,
  m.deal_phase::text                  AS deal_phase,
  m.pipeline_stage::text              AS pipeline_stage,
  m.outcome::text                     AS outcome,
  -- localização (fallback: pega da company se mandato vazio)
  COALESCE(NULLIF(m.uf,''), c.uf)     AS uf,
  COALESCE(
    NULLIF(m.regiao,''),
    CASE COALESCE(NULLIF(m.uf,''), c.uf)
      WHEN 'AC' THEN 'Norte' WHEN 'AP' THEN 'Norte' WHEN 'AM' THEN 'Norte'
      WHEN 'PA' THEN 'Norte' WHEN 'RO' THEN 'Norte' WHEN 'RR' THEN 'Norte' WHEN 'TO' THEN 'Norte'
      WHEN 'AL' THEN 'Nordeste' WHEN 'BA' THEN 'Nordeste' WHEN 'CE' THEN 'Nordeste'
      WHEN 'MA' THEN 'Nordeste' WHEN 'PB' THEN 'Nordeste' WHEN 'PE' THEN 'Nordeste'
      WHEN 'PI' THEN 'Nordeste' WHEN 'RN' THEN 'Nordeste' WHEN 'SE' THEN 'Nordeste'
      WHEN 'DF' THEN 'Centro-Oeste' WHEN 'GO' THEN 'Centro-Oeste'
      WHEN 'MT' THEN 'Centro-Oeste' WHEN 'MS' THEN 'Centro-Oeste'
      WHEN 'ES' THEN 'Sudeste' WHEN 'MG' THEN 'Sudeste' WHEN 'RJ' THEN 'Sudeste' WHEN 'SP' THEN 'Sudeste'
      WHEN 'PR' THEN 'Sul' WHEN 'RS' THEN 'Sul' WHEN 'SC' THEN 'Sul'
      ELSE NULL
    END
  ) AS regiao,
  COALESCE(NULLIF(m.setor,''), c.setor_ma) AS setor,
  -- valores
  m.valor_pedido,
  m.valor_operacao,
  m.faturamento_vispe,
  m.commission_pct,
  m.comissao_pct,
  -- datas
  m.data_inicio,
  m.data_assinatura,
  m.data_vencimento,
  m.data_fechamento,
  m.stage_changed_at,
  m.created_at,
  m.updated_at,
  -- pessoas
  m.responsavel_id,
  m.bdr_id,
  m.closer_id,
  m.contato_nome,
  m.contato_email,
  m.contato_telefone,
  -- comprador
  m.comprador_cnpj,
  m.comprador_nome,
  m.match_buyer_id
FROM equity_brain.mandates m
LEFT JOIN equity_brain.companies c ON c.cnpj = m.company_cnpj;

GRANT SELECT ON public.eb_v_mandates_full TO authenticated;