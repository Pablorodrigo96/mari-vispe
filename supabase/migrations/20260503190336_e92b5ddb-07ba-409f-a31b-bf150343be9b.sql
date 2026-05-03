CREATE OR REPLACE FUNCTION equity_brain.generate_mari_insights_all()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'equity_brain', 'public'
AS $function$
DECLARE v_total int := 0; r record;
BEGIN
  FOR r IN SELECT DISTINCT responsavel_id FROM equity_brain.mandates WHERE responsavel_id IS NOT NULL AND status::text='vigente' LOOP
    v_total := v_total + equity_brain.generate_mari_insights_for_advisor(r.responsavel_id);
  END LOOP;
  INSERT INTO mari_ops.health_check(function_name, status, payload_summary)
  VALUES ('generate_mari_insights_all','ok', jsonb_build_object('inserted', v_total));
  RETURN v_total;
END $function$;