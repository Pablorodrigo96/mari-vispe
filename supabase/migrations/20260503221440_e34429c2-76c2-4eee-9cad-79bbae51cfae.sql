DROP VIEW IF EXISTS equity_brain.matches_enriched CASCADE;
CREATE VIEW equity_brain.matches_enriched AS
SELECT
  m.id, m.match_score, m.status, m.prioridade, m.assigned_bdr,
  m.computed_at, m.reasons, m.ai_thesis_summary, m.ai_pitch,
  m.thesis_key, m.setor_fit, m.geografia_fit, m.porte_fit, m.tese_fit, m.ma_score_emp,
  c.cnpj, c.razao_social, c.nome_fantasia, c.uf, c.municipio,
  c.setor_ma, c.subsetor_ma, c.cnae_principal, c.cnae_descricao,
  c.data_abertura, c.capital_social, c.porte, c.qtd_socios, c.has_listing,
  cs.ma_score, cs.vispe_score, cs.sucessao_score,
  b.id AS buyer_id, b.nome AS buyer_nome, b.tipo AS buyer_tipo,
  b.ticket_min, b.ticket_max, b.setores_interesse,
  COALESCE(t.display_name, m.thesis_key)::varchar(80) AS thesis_name,
  t.category AS thesis_category,
  t.description AS thesis_description
FROM equity_brain.matches m
JOIN equity_brain.companies c ON c.cnpj::text = m.cnpj::text
JOIN equity_brain.buyers b ON b.id = m.buyer_id
LEFT JOIN equity_brain.investment_theses t ON t.thesis_key::text = m.thesis_key::text
LEFT JOIN equity_brain.company_scores cs ON cs.cnpj::text = m.cnpj::text AND cs.is_current = true
WHERE m.is_current = true;