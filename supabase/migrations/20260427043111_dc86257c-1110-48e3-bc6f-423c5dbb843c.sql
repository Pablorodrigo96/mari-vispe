-- Public read-through views for the Equity Brain cockpit.
-- security_invoker=on: cada query roda com a permissão do usuário, respeitando o RLS interno.

CREATE OR REPLACE VIEW public.eb_opportunities_ready
WITH (security_invoker=on) AS
SELECT
  o.cnpj, o.razao_social, o.nome_fantasia, o.uf, o.municipio,
  o.setor_ma, o.subsetor_ma,
  o.ma_score, o.vispe_score, o.sucessao_score,
  o.best_thesis_key, o.best_thesis_name,
  o.top_buyers, o.buyers_count,
  o.ai_pitch, o.default_pitch,
  o.bubble_size, o.bubble_color,
  o.status, o.assigned_bdr,
  o.refreshed_at, o.source_match_count,
  c.cnae_principal, c.cnae_descricao,
  c.data_abertura, c.situacao_cadastral,
  c.has_listing, c.listing_id,
  c.latitude, c.longitude
FROM equity_brain.opportunities_ready o
LEFT JOIN equity_brain.companies c ON c.cnpj = o.cnpj;

CREATE OR REPLACE VIEW public.eb_companies
WITH (security_invoker=on) AS
SELECT
  cnpj, razao_social, nome_fantasia,
  cnae_principal, cnae_descricao, natureza_juridica, natureza_descricao, porte,
  uf, municipio, bairro, latitude, longitude,
  data_abertura, situacao_cadastral,
  capital_social, qtd_socios, socios_pf, socios_pj,
  faturamento_estimado, funcionarios_estimado, ebitda_estimado,
  has_listing, listing_id,
  setor_ma, subsetor_ma,
  source, created_at, updated_at, last_enriched_at
FROM equity_brain.companies;

CREATE OR REPLACE VIEW public.eb_companies_scored   WITH (security_invoker=on) AS SELECT * FROM equity_brain.companies_scored;
CREATE OR REPLACE VIEW public.eb_companies_enriched WITH (security_invoker=on) AS SELECT * FROM equity_brain.companies_enriched;

CREATE OR REPLACE VIEW public.eb_company_signals
WITH (security_invoker=on) AS
SELECT id, cnpj, signal_key, signal_value, signal_text, weight, source, confidence, created_at, updated_at, expires_at
FROM equity_brain.company_signals;

CREATE OR REPLACE VIEW public.eb_company_scores
WITH (security_invoker=on) AS
SELECT id, cnpj, ma_score, vispe_score, sucessao_score, buyer_fit_score,
       ma_breakdown, vispe_breakdown, sucessao_breakdown,
       formula_version, score_engine_version, is_current, computed_at
FROM equity_brain.company_scores;

CREATE OR REPLACE VIEW public.eb_signal_catalog
WITH (security_invoker=on) AS
SELECT * FROM equity_brain.signal_catalog;

CREATE OR REPLACE VIEW public.eb_matches_enriched
WITH (security_invoker=on) AS
SELECT * FROM equity_brain.matches_enriched;

CREATE OR REPLACE VIEW public.eb_matches
WITH (security_invoker=on) AS
SELECT id, cnpj, buyer_id, thesis_key, match_score,
       setor_fit, geografia_fit, porte_fit, tese_fit, ma_score_emp,
       reasons, ai_thesis_summary, ai_pitch, ai_confidence,
       status, prioridade, assigned_bdr, computed_at, is_current
FROM equity_brain.matches;

CREATE OR REPLACE VIEW public.eb_buyers
WITH (security_invoker=on) AS
SELECT id, nome, tipo, cnpj, website, status,
       vertical_principal, ticket_min, ticket_max, porte_alvo,
       setores_interesse, subsetores_interesse,
       ufs_interesse, municipios_interesse, sinergias_chave,
       observacoes, deals_realizados, responsavel_id,
       prioridade_global, cautela_flag, cautela_motivo,
       source, created_at, updated_at, ultimo_contato_em
FROM equity_brain.buyers;

CREATE OR REPLACE VIEW public.eb_buyer_theses
WITH (security_invoker=on) AS
SELECT id, buyer_id, thesis_key, prioridade, custom_notes, custom_pitch, active, created_at
FROM equity_brain.buyer_theses;

CREATE OR REPLACE VIEW public.eb_investment_theses
WITH (security_invoker=on) AS
SELECT thesis_key, category, display_name, description,
       required_signals, boosting_signals, default_pitch_template, active
FROM equity_brain.investment_theses;

CREATE OR REPLACE VIEW public.eb_call_feedback
WITH (security_invoker=on) AS
SELECT id, cnpj, bdr_user_id, call_at, duration_seconds,
       outcome, interest_level, timing_estimado, dor_principal,
       faturamento_revelado, ebitda_revelado, num_socios_real,
       raw_notes, ai_extracted, signals_added, followup_at, followup_action,
       created_at, updated_at
FROM equity_brain.call_feedback;

CREATE OR REPLACE VIEW public.eb_v_bdr_history
WITH (security_invoker=on) AS
SELECT * FROM equity_brain.v_bdr_history;

CREATE OR REPLACE VIEW public.eb_events
WITH (security_invoker=on) AS
SELECT id, event_type, entity_type, entity_id,
       payload, triggered_by, retry_count,
       processed_at, processed_status, error_message, created_at
FROM equity_brain.events;

CREATE OR REPLACE VIEW public.eb_score_engine_versions
WITH (security_invoker=on) AS
SELECT * FROM equity_brain.score_engine_versions;

CREATE OR REPLACE VIEW public.eb_v_opportunities_by_uf
WITH (security_invoker=on) AS
SELECT * FROM equity_brain.v_opportunities_by_uf;

CREATE OR REPLACE VIEW public.eb_v_opportunities_by_municipio
WITH (security_invoker=on) AS
SELECT * FROM equity_brain.v_opportunities_by_municipio;

CREATE OR REPLACE VIEW public.eb_v_isp_universe
WITH (security_invoker=on) AS
SELECT * FROM equity_brain.v_isp_universe;

GRANT SELECT ON public.eb_opportunities_ready          TO authenticated;
GRANT SELECT ON public.eb_companies                    TO authenticated;
GRANT SELECT ON public.eb_companies_scored             TO authenticated;
GRANT SELECT ON public.eb_companies_enriched           TO authenticated;
GRANT SELECT ON public.eb_company_signals              TO authenticated;
GRANT SELECT ON public.eb_company_scores               TO authenticated;
GRANT SELECT ON public.eb_signal_catalog               TO authenticated;
GRANT SELECT ON public.eb_matches_enriched             TO authenticated;
GRANT SELECT ON public.eb_matches                      TO authenticated;
GRANT SELECT ON public.eb_buyers                       TO authenticated;
GRANT SELECT ON public.eb_buyer_theses                 TO authenticated;
GRANT SELECT ON public.eb_investment_theses            TO authenticated;
GRANT SELECT ON public.eb_call_feedback                TO authenticated;
GRANT SELECT ON public.eb_v_bdr_history                TO authenticated;
GRANT SELECT ON public.eb_events                       TO authenticated;
GRANT SELECT ON public.eb_score_engine_versions        TO authenticated;
GRANT SELECT ON public.eb_v_opportunities_by_uf        TO authenticated;
GRANT SELECT ON public.eb_v_opportunities_by_municipio TO authenticated;
GRANT SELECT ON public.eb_v_isp_universe               TO authenticated;

DROP TRIGGER IF EXISTS trg_bootstrap_listing_eb ON public.listings;
CREATE TRIGGER trg_bootstrap_listing_eb
AFTER INSERT OR UPDATE ON public.listings
FOR EACH ROW
EXECUTE FUNCTION public.sync_listing_bootstrap_eb();