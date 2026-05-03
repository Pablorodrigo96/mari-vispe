-- Backfill em massa do Score de Vendabilidade (sem HTTP)
CREATE OR REPLACE FUNCTION equity_brain.backfill_sv_all(p_force boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = equity_brain, public
AS $$
DECLARE
  rec RECORD;
  r RECORD;
  v_processed int := 0;
  v_success int := 0;
  v_errors int := 0;
  v_cutoff timestamptz := now() - interval '7 days';
BEGIN
  FOR rec IN
    SELECT cnpj FROM equity_brain.companies
    WHERE qualification_status = 'qualified'
      AND (p_force OR sv_calculated_at IS NULL OR sv_calculated_at < v_cutoff)
  LOOP
    v_processed := v_processed + 1;
    BEGIN
      SELECT * INTO r FROM equity_brain.calculate_sv(rec.cnpj) LIMIT 1;
      UPDATE equity_brain.companies SET
        score_vendabilidade = r.score,
        nivel_maturidade = r.nivel,
        sv_breakdown = r.breakdown,
        sv_data_completeness = r.data_completeness,
        sv_calculated_at = now()
      WHERE cnpj = rec.cnpj;
      v_success := v_success + 1;
    EXCEPTION WHEN OTHERS THEN
      v_errors := v_errors + 1;
    END;
  END LOOP;
  RETURN jsonb_build_object('processed', v_processed, 'success', v_success, 'errors', v_errors, 'at', now());
END $$;

-- RPC pública para advisor/admin recalcular SV de uma empresa
CREATE OR REPLACE FUNCTION public.recalculate_sv(p_cnpj text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, equity_brain
AS $$
DECLARE
  r RECORD;
  v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;
  IF NOT (public.has_role(v_user, 'admin'::app_role) OR public.has_role(v_user, 'advisor'::app_role)) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  SELECT * INTO r FROM equity_brain.calculate_sv(p_cnpj) LIMIT 1;
  UPDATE equity_brain.companies SET
    score_vendabilidade = r.score,
    nivel_maturidade = r.nivel,
    sv_breakdown = r.breakdown,
    sv_data_completeness = r.data_completeness,
    sv_calculated_at = now()
  WHERE cnpj = p_cnpj;
  RETURN jsonb_build_object('ok', true, 'score', r.score, 'nivel', r.nivel);
END $$;

GRANT EXECUTE ON FUNCTION public.recalculate_sv(text) TO authenticated;

-- Rodar backfill imediato agora
SELECT equity_brain.backfill_sv_all(true);