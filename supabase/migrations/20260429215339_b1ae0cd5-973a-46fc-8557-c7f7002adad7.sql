-- Recria view pública apontando para equity_brain.matches_enriched
DROP VIEW IF EXISTS public.eb_matches_enriched CASCADE;

CREATE VIEW public.eb_matches_enriched
WITH (security_invoker=on) AS
SELECT * FROM equity_brain.matches_enriched;

GRANT SELECT ON public.eb_matches_enriched TO authenticated;

-- Garantir eb_matches também (caso esteja faltando colunas novas)
DROP VIEW IF EXISTS public.eb_matches CASCADE;

CREATE VIEW public.eb_matches
WITH (security_invoker=on) AS
SELECT 
  id, cnpj, buyer_id, thesis_key, match_score,
  setor_fit, geografia_fit, porte_fit, tese_fit,
  ma_score_emp, reasons, ai_thesis_summary, ai_pitch, ai_confidence,
  status, prioridade, assigned_bdr, computed_at, is_current,
  p_close_12m, ev_p50, multiple_p50, buyer_archetype,
  feature_contributions, engine_version
FROM equity_brain.matches;

GRANT SELECT ON public.eb_matches TO authenticated;