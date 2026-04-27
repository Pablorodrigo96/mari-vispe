
-- ============================================
-- FASE 10 — VERTICAL ISP / TELECOM
-- ============================================

-- 1) Novos signals no catálogo (idempotente)
INSERT INTO equity_brain.signal_catalog (signal_key, category, description, default_weight, affects_scores) VALUES
  ('concorrencia_alta',         'mercado',     'Região com alta densidade de provedores concorrentes', 10, ARRAY['ma','sucessao']),
  ('custo_fibra_pesado',        'operacional', 'Provedor com investimento pesado em fibra própria recente', 12, ARRAY['ma']),
  ('multas_anatel',             'regulatorio', 'Multas ou sanções da Anatel registradas',                  18, ARRAY['ma','sucessao']),
  ('crescimento_clientes_baixo','comercial',   'Crescimento de clientes inferior a 5%/ano',               12, ARRAY['ma']),
  ('arpu_alto_estimado',        'comercial',   'ARPU estimado acima de R$120/mês',                        10, ARRAY['ma','vispe']),
  ('baixo_churn_estimado',      'comercial',   'Churn estimado abaixo de 2%/mês',                         10, ARRAY['ma','vispe']),
  ('geografia_premium',         'mercado',     'Atende município com PIB per capita acima da média',      10, ARRAY['ma']),
  ('crescimento_estavel',       'financeiro',  'Receita estável nos últimos 3 anos',                       8, ARRAY['ma','vispe']),
  ('crescimento_estagnado',     'financeiro',  'Receita estagnada nos últimos 3 anos',                    12, ARRAY['ma','sucessao']),
  ('margem_apertada',           'financeiro',  'Margem operacional inferior a 10%',                       15, ARRAY['ma','vispe']),
  ('margem_baixa',              'financeiro',  'Margem operacional inferior a 5%',                        18, ARRAY['ma','vispe']),
  ('dividas_bancarias_altas',   'financeiro',  'Endividamento estimado acima de 3x EBITDA',               18, ARRAY['ma']),
  ('sem_sucessao',              'sucessao',    'Sem sucessor identificado nos sócios',                    22, ARRAY['sucessao','ma']),
  ('poucos_socios',             'societario',  'Quadro societário restrito (1 ou 2 sócios)',              10, ARRAY['sucessao'])
ON CONFLICT (signal_key) DO NOTHING;

-- 2) Teses verticais ISP (idempotente)
INSERT INTO equity_brain.investment_theses
  (thesis_key, category, display_name, description, required_signals, boosting_signals, default_pitch_template, active)
VALUES
  (
    'isp_consolidacao_regional', 'vertical_isp',
    'ISP — Consolidação regional',
    'ISP local com 5-30k clientes, foco em sair da fragmentação e ganhar densidade regional via M&A defensivo.',
    ARRAY['setor_consolidando']::text[],
    ARRAY['concorrencia_alta','crescimento_estagnado','custo_fibra_pesado','fundador_60_plus']::text[],
    'Sua operação está em um cluster onde {{n_consolidadores}} consolidadores compraram nos últimos 12 meses. Vamos conversar antes que sobrem só os preços baixos.',
    true
  ),
  (
    'isp_sucessao', 'vertical_isp',
    'ISP — Sucessão familiar',
    'Provedor familiar com fundador buscando saída parcial ou total. Operação sólida mas sem sucessor identificado.',
    ARRAY['sucessao_provavel']::text[],
    ARRAY['fundador_60_plus','poucos_socios','sem_sucessao','crescimento_estavel']::text[],
    '90% das vendas de ISP familiar acontecem 5 anos depois do ideal. A diferença em valuation é de 30-50%. Vamos rodar uma análise grátis.',
    true
  ),
  (
    'isp_fadiga_regulatoria', 'vertical_isp',
    'ISP — Fadiga regulatória',
    'Provedor cansado de demandas Anatel, FUST, segurança e LGPD. Quer vender e operar como funcionário do consolidador.',
    ARRAY['multas_anatel']::text[],
    ARRAY['desorganizacao_financeira_provavel','fundador_60_plus','margem_apertada']::text[],
    'O custo regulatório do seu ISP cresceu mais que sua receita. Existe um caminho: vender para quem já tem estrutura jurídica/compliance.',
    true
  ),
  (
    'isp_capex_estresse', 'vertical_isp',
    'ISP — Estresse de capex (fibra)',
    'Provedor que investiu pesado em FTTH e não consegue gerar retorno. Buyer estratégico absorve dívida em troca da carteira.',
    ARRAY['dividas_bancarias_altas']::text[],
    ARRAY['margem_baixa','crescimento_clientes_baixo','custo_fibra_pesado']::text[],
    'Sua dívida de fibra tem solução: existem buyers que assumem o passivo em troca da carteira. Posso te apresentar 3 esta semana.',
    true
  ),
  (
    'isp_carteira_premium', 'vertical_isp',
    'ISP — Aquisição de carteira premium',
    'ISP boutique, ARPU alto, churn baixo. Strategic buy para consolidador querendo entrar em região rica.',
    ARRAY['arpu_alto_estimado']::text[],
    ARRAY['baixo_churn_estimado','geografia_premium','porte_atrativo_ma']::text[],
    'Sua base premium vale múltiplos acima do mercado. Tenho 2 consolidadores buscando exatamente seu perfil — vamos conversar?',
    true
  )
ON CONFLICT (thesis_key) DO NOTHING;

-- 3) View do universo ISP/Telecom (CNAEs do setor)
CREATE OR REPLACE VIEW equity_brain.v_isp_universe AS
SELECT
  c.cnpj,
  c.razao_social,
  c.nome_fantasia,
  c.uf,
  c.municipio,
  c.cnae_principal,
  c.cnae_descricao,
  c.porte,
  c.qtd_socios,
  c.faturamento_estimado,
  c.situacao_cadastral,
  c.has_listing,
  cs.ma_score,
  cs.vispe_score,
  cs.sucessao_score,
  cs.buyer_fit_score,
  cs.computed_at AS scores_computed_at
FROM equity_brain.companies c
LEFT JOIN equity_brain.company_scores cs
  ON cs.cnpj = c.cnpj AND cs.is_current = true
WHERE c.cnae_principal IN (
  '6110801','6110802','6190601','6190602','6190699','6120501','6141800','6142600'
)
AND c.situacao_cadastral = 'Ativa';

GRANT SELECT ON equity_brain.v_isp_universe TO authenticated;
