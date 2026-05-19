
INSERT INTO public.doc_templates (
  code, label, category, description, applies_to_stages,
  requires_signature, is_active, ai_instructions,
  customizable_fields, static_clauses, parts, template_body, preferred_model
) VALUES
('legal_ts_v1','Term Sheet — Estrutura da Operação','term_sheet',
 'Sumário executivo dos principais termos comerciais da operação M&A, base para o SPA.',
 ARRAY['round2','spa']::text[], true, true,
 'Você é um advogado sênior brasileiro especialista em M&A. Gere um Term Sheet em português jurídico claro e objetivo, sumarizando estrutura da operação. Use tabelas Markdown quando útil. Valores em R$ formatados. Não invente cláusulas.',
 '[
   {"key":"comprador_nome","label":"Comprador","type":"text","required":true},
   {"key":"vendedor_nome","label":"Vendedor","type":"text","required":true},
   {"key":"empresa_alvo","label":"Empresa-alvo","type":"text","required":true},
   {"key":"estrutura","label":"Estrutura (ex.: Compra de 100% das quotas)","type":"text","required":true},
   {"key":"enterprise_value","label":"Enterprise Value (R$)","type":"currency","required":true},
   {"key":"equity_value","label":"Equity Value (R$)","type":"currency","required":true},
   {"key":"forma_pagamento","label":"Forma de pagamento (cash/earn-out/escrow)","type":"textarea","required":true},
   {"key":"earnout","label":"Earn-out (gatilhos e prazos)","type":"textarea","required":false},
   {"key":"escrow_pct","label":"Escrow (% do valor)","type":"number","required":false,"default":10},
   {"key":"escrow_prazo_meses","label":"Escrow — prazo (meses)","type":"number","required":false,"default":24},
   {"key":"non_compete_anos","label":"Non-compete (anos)","type":"number","required":false,"default":3},
   {"key":"condicoes_suspensivas","label":"Condições precedentes","type":"textarea","required":true},
   {"key":"prazo_fechamento_dias","label":"Prazo de fechamento (dias)","type":"number","required":true,"default":90},
   {"key":"foro","label":"Foro / Câmara arbitral","type":"text","required":true,"default":"CAM-CCBC"}
 ]'::jsonb,
 '[
   {"id":"reps_warranties","title":"Representações e Garantias","mandatory":true},
   {"id":"indenizacao","title":"Indenização","mandatory":true},
   {"id":"non_compete","title":"Non-compete","mandatory":true},
   {"id":"arbitragem","title":"Arbitragem","mandatory":true}
 ]'::jsonb,
 '[]'::jsonb,
 E'# TERM SHEET — {{empresa_alvo}}\n\n**[PLACEHOLDER OFICIAL VISPE — substituir pelo texto enviado pelo cliente]**\n\n## 1. PARTES\n\n- **Comprador:** {{comprador_nome}}\n- **Vendedor:** {{vendedor_nome}}\n- **Empresa-alvo:** {{empresa_alvo}}\n\n## 2. ESTRUTURA\n\n{{estrutura}}\n\n## 3. VALORAÇÃO\n\n| Métrica | Valor |\n|---|---|\n| Enterprise Value | {{enterprise_value}} |\n| Equity Value | {{equity_value}} |\n\n## 4. PAGAMENTO\n\n{{forma_pagamento}}\n\n**Earn-out:** {{earnout}}\n\n**Escrow:** {{escrow_pct}}% por {{escrow_prazo_meses}} meses.\n\n## 5. CONDIÇÕES PRECEDENTES\n\n{{condicoes_suspensivas}}\n\n## 6. NON-COMPETE\n\nPrazo: {{non_compete_anos}} anos.\n\n## 7. CRONOGRAMA\n\nFechamento previsto em {{prazo_fechamento_dias}} dias após assinatura.\n\n## 8. SOLUÇÃO DE CONTROVÉRSIAS\n\nForo / Câmara: {{foro}}\n\n## 9. REPS, WARRANTIES, INDENIZAÇÃO E NON-COMPETE\n\n[CLÁUSULAS FIXAS — TEXTO OFICIAL VISPE]',
 'claude-sonnet-4-5'),

('legal_spa_v1','SPA — Contrato de Compra e Venda de Quotas','spa',
 'SPA (Share Purchase Agreement) modular gerado em 6 seções paralelas por Claude Opus.',
 ARRAY['spa','closing']::text[], true, true,
 'Você é um advogado sênior brasileiro especialista em M&A escrevendo um SPA completo em português jurídico formal. Cite Código Civil e Lei das S.A. quando aplicável. Valores em R$ formatados.',
 '[
   {"key":"comprador_nome","label":"Comprador — Razão Social","type":"text","required":true},
   {"key":"comprador_cnpj","label":"Comprador — CNPJ","type":"cnpj","required":true},
   {"key":"vendedor_nome","label":"Vendedor — Razão Social","type":"text","required":true},
   {"key":"vendedor_cnpj","label":"Vendedor — CNPJ","type":"cnpj","required":true},
   {"key":"empresa_alvo","label":"Empresa-alvo","type":"text","required":true},
   {"key":"empresa_cnpj","label":"Empresa-alvo — CNPJ","type":"cnpj","required":true},
   {"key":"percentual_quotas","label":"% de quotas adquiridas","type":"number","required":true,"default":100},
   {"key":"preco_base","label":"Preço-base (R$)","type":"currency","required":true},
   {"key":"ajuste_capital_giro","label":"Ajuste de capital de giro","type":"textarea","required":true},
   {"key":"escrow_valor","label":"Escrow (R$)","type":"currency","required":true},
   {"key":"escrow_prazo_meses","label":"Escrow — prazo (meses)","type":"number","required":true,"default":24},
   {"key":"earnout","label":"Earn-out (gatilhos)","type":"textarea","required":false},
   {"key":"condicoes_precedentes","label":"Condições precedentes ao fechamento","type":"textarea","required":true},
   {"key":"non_compete_anos","label":"Non-compete (anos)","type":"number","required":true,"default":3},
   {"key":"non_solicit_anos","label":"Non-solicit (anos)","type":"number","required":true,"default":2},
   {"key":"limite_indenizacao_pct","label":"Cap de indenização (% do preço)","type":"number","required":true,"default":30},
   {"key":"basket_pct","label":"Basket (% do preço)","type":"number","required":true,"default":1},
   {"key":"foro_arbitragem","label":"Câmara arbitral","type":"text","required":true,"default":"CAM-CCBC"}
 ]'::jsonb,
 '[
   {"id":"declaracoes_vendedor","title":"Declarações do Vendedor","mandatory":true},
   {"id":"declaracoes_comprador","title":"Declarações do Comprador","mandatory":true},
   {"id":"indenizacao","title":"Indenização e limites","mandatory":true},
   {"id":"non_compete","title":"Non-compete e non-solicit","mandatory":true},
   {"id":"arbitragem","title":"Arbitragem CAM-CCBC","mandatory":true}
 ]'::jsonb,
 '[
   {"id":"partes_objeto","title":"PARTES E OBJETO","instructions":"Cláusulas 1-2: qualificação completa das partes (comprador, vendedor, empresa-alvo) e objeto da operação (compra e venda de {{percentual_quotas}}% das quotas)."},
   {"id":"preco_pagamento","title":"PREÇO E FORMA DE PAGAMENTO","instructions":"Cláusulas 3-5: preço-base {{preco_base}}, ajustes de capital de giro ({{ajuste_capital_giro}}), escrow de {{escrow_valor}} por {{escrow_prazo_meses}} meses e earn-out ({{earnout}})."},
   {"id":"condicoes_fechamento","title":"CONDIÇÕES PRECEDENTES E FECHAMENTO","instructions":"Cláusulas 6-7: condições precedentes ({{condicoes_precedentes}}), procedimento de fechamento, documentos a serem entregues no closing."},
   {"id":"declaracoes_garantias","title":"DECLARAÇÕES E GARANTIAS","instructions":"Cláusulas 8-9: declarações e garantias completas do vendedor (societárias, contábeis, fiscais, trabalhistas, ambientais, regulatórias) e do comprador. CLÁUSULAS FIXAS — manter texto oficial Vispe."},
   {"id":"indenizacao_obrigacoes","title":"INDENIZAÇÃO, NON-COMPETE E OBRIGAÇÕES PÓS-CLOSING","instructions":"Cláusulas 10-12: indenização com cap {{limite_indenizacao_pct}}%, basket {{basket_pct}}%, non-compete {{non_compete_anos}} anos, non-solicit {{non_solicit_anos}} anos. CLÁUSULAS FIXAS — manter texto oficial Vispe."},
   {"id":"disposicoes_finais","title":"ARBITRAGEM E DISPOSIÇÕES FINAIS","instructions":"Cláusulas 13-15: foro arbitral {{foro_arbitragem}}, lei aplicável (Brasil), comunicações, sucessão e assinatura."}
 ]'::jsonb,
 E'# CONTRATO DE COMPRA E VENDA DE QUOTAS — SPA\n\n**[PLACEHOLDER OFICIAL VISPE — substituir pelo texto oficial completo enviado pelo cliente]**\n\n**COMPRADOR:** {{comprador_nome}}, CNPJ {{comprador_cnpj}}.\n\n**VENDEDOR:** {{vendedor_nome}}, CNPJ {{vendedor_cnpj}}.\n\n**EMPRESA-ALVO:** {{empresa_alvo}}, CNPJ {{empresa_cnpj}}.\n\nResolvem celebrar o presente Contrato de Compra e Venda de Quotas, mediante as cláusulas a seguir.',
 'claude-opus-4-1')
ON CONFLICT (code) DO NOTHING;
