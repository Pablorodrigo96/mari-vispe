
-- =========================================================
-- FASE A — Limpeza & correções críticas
-- A.1 dedupe robusto (índices UNIQUE parciais + savepoint por par)
-- A.2 buyers sintéticos invisíveis
-- A.4a função+cron de refresh defensivo de matviews
-- A.5 RLS em equity_brain.drain_jobs
-- =========================================================

-- ---------------------------------------------------------
-- A.1.1 _merge_fillup: ignora também colunas de UNIQUE INDEX parciais
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION equity_brain._merge_fillup(p_schema text, p_table text, p_keep uuid, p_drop uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'equity_brain'
AS $function$
DECLARE
  cols text;
BEGIN
  SELECT string_agg(format('%I = COALESCE(k.%I, d.%I)', column_name, column_name, column_name), ', ')
    INTO cols
  FROM information_schema.columns c
  WHERE c.table_schema = p_schema
    AND c.table_name = p_table
    AND c.column_name NOT IN ('id','created_at','updated_at')
    -- exclui colunas de PRIMARY KEY ou UNIQUE constraint
    AND c.column_name NOT IN (
      SELECT a.attname
      FROM pg_constraint pc
      JOIN pg_attribute a
        ON a.attrelid = pc.conrelid AND a.attnum = ANY (pc.conkey)
      WHERE pc.conrelid = format('%I.%I', p_schema, p_table)::regclass
        AND pc.contype IN ('p','u')
    )
    -- NOVO: exclui também colunas de qualquer UNIQUE INDEX (parcial inclusive)
    AND c.column_name NOT IN (
      SELECT a.attname
      FROM pg_index idx
      JOIN pg_attribute a
        ON a.attrelid = idx.indrelid AND a.attnum = ANY (idx.indkey)
      WHERE idx.indrelid = format('%I.%I', p_schema, p_table)::regclass
        AND idx.indisunique = true
    );

  IF cols IS NULL THEN RETURN; END IF;

  EXECUTE format(
    'UPDATE %I.%I AS t SET %s FROM (SELECT * FROM %I.%I WHERE id = $1) k, (SELECT * FROM %I.%I WHERE id = $2) d WHERE t.id = $1',
    p_schema, p_table, cols, p_schema, p_table, p_schema, p_table
  ) USING p_keep, p_drop;
END;
$function$;

-- ---------------------------------------------------------
-- A.1.2 run_safe_dedupe com SAVEPOINT por par + retorno detalhado
-- (mantém assinatura: p_entity text, retorna jsonb com {entity, merged, failed, errors[]})
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION equity_brain.run_safe_dedupe(p_entity text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'equity_brain'
AS $function$
DECLARE
  rec record;
  v_keep uuid;
  v_drop uuid;
  v_merged int := 0;
  v_failed int := 0;
  v_errors jsonb := '[]'::jsonb;
  v_err text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'permission denied: admin only';
  END IF;

  IF p_entity = 'mandates' THEN
    FOR rec IN
      SELECT company_cnpj, COALESCE(deal_type::text,'') dt, COALESCE(deal_kind::text,'') dk
      FROM equity_brain.mandates
      WHERE company_cnpj IS NOT NULL AND status::text NOT IN ('cancelado','concluido')
      GROUP BY 1,2,3 HAVING COUNT(*) > 1
    LOOP
      SELECT id INTO v_keep FROM equity_brain.mandates m
      WHERE company_cnpj = rec.company_cnpj
        AND COALESCE(deal_type::text,'') = rec.dt
        AND COALESCE(deal_kind::text,'') = rec.dk
        AND status::text NOT IN ('cancelado','concluido')
      ORDER BY (responsavel_id IS NOT NULL) DESC,
               (valor_operacao IS NOT NULL) DESC,
               (SELECT count(*) FROM jsonb_each(to_jsonb(m)) e WHERE e.value IS NOT NULL AND e.value::text NOT IN ('null','""')) DESC,
               created_at ASC
      LIMIT 1;

      FOR v_drop IN
        SELECT id FROM equity_brain.mandates
        WHERE company_cnpj = rec.company_cnpj
          AND COALESCE(deal_type::text,'') = rec.dt
          AND COALESCE(deal_kind::text,'') = rec.dk
          AND status::text NOT IN ('cancelado','concluido')
          AND id <> v_keep
      LOOP
        BEGIN
          PERFORM equity_brain.merge_mandates(v_keep, v_drop, 'batch:mandates');
          v_merged := v_merged + 1;
        EXCEPTION WHEN OTHERS THEN
          v_err := SQLERRM;
          v_failed := v_failed + 1;
          v_errors := v_errors || jsonb_build_object('keep_id', v_keep, 'drop_id', v_drop, 'error', v_err);
        END;
      END LOOP;
    END LOOP;

  ELSIF p_entity = 'buyers' THEN
    FOR rec IN
      SELECT lower(trim(nome)) k FROM equity_brain.buyers
      WHERE nome IS NOT NULL GROUP BY 1 HAVING COUNT(*) > 1
    LOOP
      SELECT id INTO v_keep FROM equity_brain.buyers b
      WHERE lower(trim(nome)) = rec.k
      ORDER BY (cnpj IS NOT NULL) DESC,
               (responsavel_id IS NOT NULL) DESC,
               (SELECT count(*) FROM jsonb_each(to_jsonb(b)) e WHERE e.value IS NOT NULL AND e.value::text NOT IN ('null','""')) DESC,
               created_at ASC
      LIMIT 1;

      FOR v_drop IN
        SELECT id FROM equity_brain.buyers
        WHERE lower(trim(nome)) = rec.k AND id <> v_keep
      LOOP
        BEGIN
          PERFORM equity_brain.merge_buyers(v_keep, v_drop, 'batch:buyers');
          v_merged := v_merged + 1;
        EXCEPTION WHEN OTHERS THEN
          v_err := SQLERRM;
          v_failed := v_failed + 1;
          v_errors := v_errors || jsonb_build_object('keep_id', v_keep, 'drop_id', v_drop, 'error', v_err);
        END;
      END LOOP;
    END LOOP;

  ELSIF p_entity = 'contacts' THEN
    -- email
    FOR rec IN
      SELECT entity_type, entity_id, lower(email) k
      FROM equity_brain.contacts
      WHERE email IS NOT NULL AND email <> ''
      GROUP BY 1,2,3 HAVING COUNT(*) > 1
    LOOP
      SELECT id INTO v_keep FROM equity_brain.contacts c
      WHERE entity_type = rec.entity_type AND entity_id = rec.entity_id AND lower(email) = rec.k
      ORDER BY is_primary DESC NULLS LAST,
               (telefone_e164 IS NOT NULL) DESC,
               (SELECT count(*) FROM jsonb_each(to_jsonb(c)) e WHERE e.value IS NOT NULL AND e.value::text NOT IN ('null','""')) DESC,
               created_at ASC
      LIMIT 1;
      FOR v_drop IN
        SELECT id FROM equity_brain.contacts
        WHERE entity_type = rec.entity_type AND entity_id = rec.entity_id AND lower(email) = rec.k AND id <> v_keep
      LOOP
        BEGIN
          PERFORM equity_brain.merge_contacts(v_keep, v_drop, 'batch:contacts:email');
          v_merged := v_merged + 1;
        EXCEPTION WHEN OTHERS THEN
          v_err := SQLERRM;
          v_failed := v_failed + 1;
          v_errors := v_errors || jsonb_build_object('keep_id', v_keep, 'drop_id', v_drop, 'error', v_err);
        END;
      END LOOP;
    END LOOP;

    -- telefone
    FOR rec IN
      SELECT entity_type, entity_id, regexp_replace(telefone_e164,'\D','','g') k
      FROM equity_brain.contacts
      WHERE telefone_e164 IS NOT NULL AND length(regexp_replace(telefone_e164,'\D','','g'))>=10
      GROUP BY 1,2,3 HAVING COUNT(*) > 1
    LOOP
      SELECT id INTO v_keep FROM equity_brain.contacts c
      WHERE entity_type = rec.entity_type AND entity_id = rec.entity_id
        AND regexp_replace(telefone_e164,'\D','','g') = rec.k
      ORDER BY is_primary DESC NULLS LAST,
               (email IS NOT NULL AND email<>'') DESC,
               (SELECT count(*) FROM jsonb_each(to_jsonb(c)) e WHERE e.value IS NOT NULL AND e.value::text NOT IN ('null','""')) DESC,
               created_at ASC
      LIMIT 1;
      FOR v_drop IN
        SELECT id FROM equity_brain.contacts
        WHERE entity_type = rec.entity_type AND entity_id = rec.entity_id
          AND regexp_replace(telefone_e164,'\D','','g') = regexp_replace((SELECT telefone_e164 FROM equity_brain.contacts WHERE id = v_keep),'\D','','g')
          AND id <> v_keep
      LOOP
        BEGIN
          PERFORM equity_brain.merge_contacts(v_keep, v_drop, 'batch:contacts:phone');
          v_merged := v_merged + 1;
        EXCEPTION WHEN OTHERS THEN
          v_err := SQLERRM;
          v_failed := v_failed + 1;
          v_errors := v_errors || jsonb_build_object('keep_id', v_keep, 'drop_id', v_drop, 'error', v_err);
        END;
      END LOOP;
    END LOOP;

  ELSIF p_entity = 'buyer_profiles' THEN
    -- nada a fazer aqui por enquanto; manter sem op para preservar UI
    NULL;
  ELSE
    RAISE EXCEPTION 'unknown entity: %', p_entity;
  END IF;

  RETURN jsonb_build_object(
    'entity', p_entity,
    'merged', v_merged,
    'failed', v_failed,
    'errors', v_errors
  );
END;
$function$;

-- ---------------------------------------------------------
-- A.2 Buyers sintéticos: garantir flag e esconder em buyers_blind
-- ---------------------------------------------------------
UPDATE equity_brain.buyers
SET is_synthetic = true
WHERE nome ~ '#A[0-9]+'
  AND is_synthetic IS DISTINCT FROM true;

-- Recriar buyers_blind incluindo filtro de sintéticos
DROP VIEW IF EXISTS equity_brain.buyers_blind CASCADE;
CREATE VIEW equity_brain.buyers_blind
WITH (security_invoker = true)
AS
SELECT b.*
FROM equity_brain.buyers b
WHERE b.is_synthetic = false
   OR public.has_role(auth.uid(), 'admin'::public.app_role);

-- ---------------------------------------------------------
-- A.4a Função de refresh defensiva + cron horário
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.refresh_dashboard_views()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v jsonb := '{}'::jsonb;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_matviews WHERE schemaname='public' AND matviewname='mv_dashboard_executivo') THEN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_dashboard_executivo;
    v := v || jsonb_build_object('mv_dashboard_executivo','ok');
  END IF;
  IF EXISTS (SELECT 1 FROM pg_matviews WHERE schemaname='public' AND matviewname='mv_dashboard_mandato') THEN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_dashboard_mandato;
    v := v || jsonb_build_object('mv_dashboard_mandato','ok');
  END IF;
  IF EXISTS (SELECT 1 FROM pg_matviews WHERE schemaname='public' AND matviewname='mv_dashboard_match') THEN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_dashboard_match;
    v := v || jsonb_build_object('mv_dashboard_match','ok');
  END IF;
  IF EXISTS (SELECT 1 FROM pg_matviews WHERE schemaname='public' AND matviewname='mv_dashboard_nbo') THEN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_dashboard_nbo;
    v := v || jsonb_build_object('mv_dashboard_nbo','ok');
  END IF;
END;
$function$;

-- Agendar cron horário (idempotente)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname='pg_cron') THEN
    PERFORM cron.unschedule('refresh-dashboards-hourly')
    WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname='refresh-dashboards-hourly');
    PERFORM cron.schedule('refresh-dashboards-hourly','0 * * * *','SELECT public.refresh_dashboard_views()');
  END IF;
END$$;

-- ---------------------------------------------------------
-- A.5 RLS em equity_brain.drain_jobs
-- ---------------------------------------------------------
ALTER TABLE equity_brain.drain_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS drain_jobs_admin_only ON equity_brain.drain_jobs;
CREATE POLICY drain_jobs_admin_only ON equity_brain.drain_jobs
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
