-- Smoke tests diários (Fase 4)
CREATE OR REPLACE FUNCTION mari_ops.daily_smoke_tests()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = mari_ops, equity_brain, public
AS $$
DECLARE
  total_mandates int;
  views_fresh boolean;
BEGIN
  -- Test 1: total mandates esperado (>= 200)
  SELECT COUNT(*) INTO total_mandates FROM equity_brain.mandates;
  IF total_mandates < 200 THEN
    INSERT INTO mari_ops.health_check (function_name, status, error_message)
    VALUES ('smoke_test_total_mandates', 'error',
            'Total mandates muito baixo: ' || total_mandates);
  END IF;

  -- Test 2: materialized views frescas (refresh nas últimas 2h)
  SELECT (now() - max(ts)) < interval '2 hours' INTO views_fresh
  FROM mari_ops.health_check WHERE function_name = 'refresh_dashboard_views';
  IF views_fresh IS NOT TRUE THEN
    INSERT INTO mari_ops.health_check (function_name, status, error_message)
    VALUES ('smoke_test_views_freshness', 'error',
            'Views nao atualizadas em 2h');
  END IF;

  -- Test 3: mandates orfaos ha > 7 dias
  IF EXISTS (
    SELECT 1 FROM equity_brain.mandates
    WHERE responsavel_id IS NULL
      AND COALESCE(imported_at, created_at) < now() - interval '7 days'
  ) THEN
    INSERT INTO mari_ops.health_check (function_name, status, error_message)
    VALUES ('smoke_test_orphan_mandates', 'warning',
            'Mandatos sem responsavel ha >7 dias');
  END IF;

  -- Test 4: marker de sucesso
  INSERT INTO mari_ops.health_check (function_name, status, payload_summary)
  VALUES ('smoke_test_daily', 'success',
          jsonb_build_object('mandates', total_mandates));
END;
$$;