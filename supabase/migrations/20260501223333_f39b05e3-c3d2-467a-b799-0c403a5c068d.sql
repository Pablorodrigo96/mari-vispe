
-- =========================================================
-- 1) AUDITORIA
-- =========================================================
CREATE TABLE IF NOT EXISTS equity_brain.dedupe_audit (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type  text NOT NULL,
  kept_id      uuid NOT NULL,
  removed_id   uuid NOT NULL,
  merged_at    timestamptz NOT NULL DEFAULT now(),
  merged_by    uuid,
  reason       text,
  payload      jsonb NOT NULL,
  refs_updated jsonb
);

ALTER TABLE equity_brain.dedupe_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins read dedupe_audit" ON equity_brain.dedupe_audit;
CREATE POLICY "admins read dedupe_audit"
  ON equity_brain.dedupe_audit FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE INDEX IF NOT EXISTS idx_dedupe_audit_entity ON equity_brain.dedupe_audit (entity_type, merged_at DESC);

-- =========================================================
-- 2) MERGE FUNCTIONS
-- =========================================================

-- Helper: copia valores NULL do canonical a partir do duplicado (não sobrescreve)
CREATE OR REPLACE FUNCTION equity_brain._merge_fillup(
  p_schema text, p_table text, p_keep uuid, p_drop uuid
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, equity_brain
AS $$
DECLARE
  rec record;
  cols text;
BEGIN
  -- monta SET col = COALESCE(keep.col, drop.col) para todas as colunas exceto id/created_at
  SELECT string_agg(format('%I = COALESCE(k.%I, d.%I)', column_name, column_name, column_name), ', ')
    INTO cols
  FROM information_schema.columns
  WHERE table_schema = p_schema AND table_name = p_table
    AND column_name NOT IN ('id','created_at');

  IF cols IS NULL THEN RETURN; END IF;

  EXECUTE format(
    'UPDATE %I.%I AS t SET %s FROM (SELECT * FROM %I.%I WHERE id = $1) k, (SELECT * FROM %I.%I WHERE id = $2) d WHERE t.id = $1',
    p_schema, p_table, cols, p_schema, p_table, p_schema, p_table
  ) USING p_keep, p_drop;
END;
$$;

-- ----- MANDATES -----
CREATE OR REPLACE FUNCTION equity_brain.merge_mandates(p_keep uuid, p_drop uuid, p_reason text DEFAULT 'auto-dedupe')
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, equity_brain
AS $$
DECLARE
  v_payload jsonb;
  v_refs jsonb := '{}'::jsonb;
  v_n int;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'permission denied: admin only';
  END IF;
  IF p_keep = p_drop THEN RAISE EXCEPTION 'keep and drop must differ'; END IF;

  SELECT to_jsonb(m) INTO v_payload FROM equity_brain.mandates m WHERE id = p_drop;
  IF v_payload IS NULL THEN RAISE EXCEPTION 'drop mandate not found'; END IF;
  IF NOT EXISTS(SELECT 1 FROM equity_brain.mandates WHERE id = p_keep) THEN
    RAISE EXCEPTION 'keep mandate not found';
  END IF;

  -- repointar referências
  UPDATE equity_brain.deals SET mandate_id = p_keep WHERE mandate_id = p_drop;
  GET DIAGNOSTICS v_n = ROW_COUNT; v_refs := v_refs || jsonb_build_object('deals', v_n);

  UPDATE equity_brain.mandate_subtasks SET mandate_id = p_keep WHERE mandate_id = p_drop;
  GET DIAGNOSTICS v_n = ROW_COUNT; v_refs := v_refs || jsonb_build_object('mandate_subtasks', v_n);

  UPDATE equity_brain.mandate_summaries SET mandate_id = p_keep WHERE mandate_id = p_drop;
  GET DIAGNOSTICS v_n = ROW_COUNT; v_refs := v_refs || jsonb_build_object('mandate_summaries', v_n);

  UPDATE equity_brain.whatsapp_action_log SET mandate_id = p_keep WHERE mandate_id = p_drop;
  GET DIAGNOSTICS v_n = ROW_COUNT; v_refs := v_refs || jsonb_build_object('whatsapp_action_log', v_n);

  UPDATE public.eb_pipeline_transitions SET mandate_id = p_keep WHERE mandate_id = p_drop;
  GET DIAGNOSTICS v_n = ROW_COUNT; v_refs := v_refs || jsonb_build_object('eb_pipeline_transitions', v_n);

  UPDATE public.whatsapp_messages SET mandate_id = p_keep WHERE mandate_id = p_drop;
  GET DIAGNOSTICS v_n = ROW_COUNT; v_refs := v_refs || jsonb_build_object('whatsapp_messages', v_n);

  -- atividades genéricas (entity_id)
  UPDATE equity_brain.crm_activities SET entity_id = p_keep
    WHERE entity_type = 'mandate' AND entity_id = p_drop;
  GET DIAGNOSTICS v_n = ROW_COUNT; v_refs := v_refs || jsonb_build_object('crm_activities', v_n);

  -- preencher campos NULL do canonical
  PERFORM equity_brain._merge_fillup('equity_brain','mandates', p_keep, p_drop);

  -- log e delete
  INSERT INTO equity_brain.dedupe_audit (entity_type, kept_id, removed_id, merged_by, reason, payload, refs_updated)
    VALUES ('mandate', p_keep, p_drop, auth.uid(), p_reason, v_payload, v_refs);

  DELETE FROM equity_brain.mandates WHERE id = p_drop;

  RETURN v_refs;
END;
$$;

-- ----- BUYERS -----
CREATE OR REPLACE FUNCTION equity_brain.merge_buyers(p_keep uuid, p_drop uuid, p_reason text DEFAULT 'auto-dedupe')
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, equity_brain
AS $$
DECLARE
  v_payload jsonb;
  v_refs jsonb := '{}'::jsonb;
  v_n int;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'permission denied: admin only';
  END IF;
  IF p_keep = p_drop THEN RAISE EXCEPTION 'keep and drop must differ'; END IF;

  SELECT to_jsonb(b) INTO v_payload FROM equity_brain.buyers b WHERE id = p_drop;
  IF v_payload IS NULL THEN RAISE EXCEPTION 'drop buyer not found'; END IF;

  UPDATE equity_brain.deals SET buyer_id = p_keep WHERE buyer_id = p_drop;
  GET DIAGNOSTICS v_n = ROW_COUNT; v_refs := v_refs || jsonb_build_object('deals', v_n);

  UPDATE equity_brain.matches SET buyer_id = p_keep WHERE buyer_id = p_drop;
  GET DIAGNOSTICS v_n = ROW_COUNT; v_refs := v_refs || jsonb_build_object('matches', v_n);

  UPDATE equity_brain.match_snapshots SET buyer_id = p_keep WHERE buyer_id = p_drop;
  GET DIAGNOSTICS v_n = ROW_COUNT; v_refs := v_refs || jsonb_build_object('match_snapshots', v_n);

  UPDATE equity_brain.deal_events SET buyer_id = p_keep WHERE buyer_id = p_drop;
  GET DIAGNOSTICS v_n = ROW_COUNT; v_refs := v_refs || jsonb_build_object('deal_events', v_n);

  UPDATE equity_brain.buyer_theses SET buyer_id = p_keep WHERE buyer_id = p_drop;
  GET DIAGNOSTICS v_n = ROW_COUNT; v_refs := v_refs || jsonb_build_object('buyer_theses', v_n);

  UPDATE equity_brain.buyer_preferences_history SET buyer_id = p_keep WHERE buyer_id = p_drop;
  GET DIAGNOSTICS v_n = ROW_COUNT; v_refs := v_refs || jsonb_build_object('buyer_preferences_history', v_n);

  UPDATE equity_brain.buyer_revealed_thetas SET buyer_id = p_keep WHERE buyer_id = p_drop;
  GET DIAGNOSTICS v_n = ROW_COUNT; v_refs := v_refs || jsonb_build_object('buyer_revealed_thetas', v_n);

  UPDATE equity_brain.company_news SET buyer_id = p_keep WHERE buyer_id = p_drop;
  GET DIAGNOSTICS v_n = ROW_COUNT; v_refs := v_refs || jsonb_build_object('company_news', v_n);

  UPDATE equity_brain.ai_runs SET buyer_id = p_keep WHERE buyer_id = p_drop;
  GET DIAGNOSTICS v_n = ROW_COUNT; v_refs := v_refs || jsonb_build_object('ai_runs', v_n);

  UPDATE equity_brain.whatsapp_action_log SET buyer_id = p_keep WHERE buyer_id = p_drop;
  GET DIAGNOSTICS v_n = ROW_COUNT; v_refs := v_refs || jsonb_build_object('whatsapp_action_log', v_n);

  UPDATE equity_brain.crm_activities SET entity_id = p_keep
    WHERE entity_type = 'buyer' AND entity_id = p_drop;
  GET DIAGNOSTICS v_n = ROW_COUNT; v_refs := v_refs || jsonb_build_object('crm_activities', v_n);

  UPDATE equity_brain.contacts SET entity_id = p_keep
    WHERE entity_type = 'buyer' AND entity_id = p_drop;
  GET DIAGNOSTICS v_n = ROW_COUNT; v_refs := v_refs || jsonb_build_object('contacts', v_n);

  UPDATE public.buyer_profiles SET source_eb_buyer_id = p_keep WHERE source_eb_buyer_id = p_drop;
  GET DIAGNOSTICS v_n = ROW_COUNT; v_refs := v_refs || jsonb_build_object('buyer_profiles', v_n);

  PERFORM equity_brain._merge_fillup('equity_brain','buyers', p_keep, p_drop);

  INSERT INTO equity_brain.dedupe_audit (entity_type, kept_id, removed_id, merged_by, reason, payload, refs_updated)
    VALUES ('buyer', p_keep, p_drop, auth.uid(), p_reason, v_payload, v_refs);

  DELETE FROM equity_brain.buyers WHERE id = p_drop;
  RETURN v_refs;
END;
$$;

-- ----- CONTACTS -----
CREATE OR REPLACE FUNCTION equity_brain.merge_contacts(p_keep uuid, p_drop uuid, p_reason text DEFAULT 'auto-dedupe')
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, equity_brain
AS $$
DECLARE
  v_payload jsonb;
  v_refs jsonb := '{}'::jsonb;
  v_n int;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'permission denied: admin only';
  END IF;
  IF p_keep = p_drop THEN RAISE EXCEPTION 'keep and drop must differ'; END IF;

  SELECT to_jsonb(c) INTO v_payload FROM equity_brain.contacts c WHERE id = p_drop;
  IF v_payload IS NULL THEN RAISE EXCEPTION 'drop contact not found'; END IF;

  UPDATE equity_brain.crm_activities SET contact_id = p_keep WHERE contact_id = p_drop;
  GET DIAGNOSTICS v_n = ROW_COUNT; v_refs := v_refs || jsonb_build_object('crm_activities', v_n);

  UPDATE equity_brain.whatsapp_action_log SET contact_id = p_keep WHERE contact_id = p_drop;
  GET DIAGNOSTICS v_n = ROW_COUNT; v_refs := v_refs || jsonb_build_object('whatsapp_action_log', v_n);

  UPDATE public.whatsapp_messages SET contact_id = p_keep WHERE contact_id = p_drop;
  GET DIAGNOSTICS v_n = ROW_COUNT; v_refs := v_refs || jsonb_build_object('whatsapp_messages', v_n);

  PERFORM equity_brain._merge_fillup('equity_brain','contacts', p_keep, p_drop);

  INSERT INTO equity_brain.dedupe_audit (entity_type, kept_id, removed_id, merged_by, reason, payload, refs_updated)
    VALUES ('contact', p_keep, p_drop, auth.uid(), p_reason, v_payload, v_refs);

  DELETE FROM equity_brain.contacts WHERE id = p_drop;
  RETURN v_refs;
END;
$$;

-- ----- BUYER_PROFILES (public) -----
CREATE OR REPLACE FUNCTION equity_brain.merge_buyer_profiles(p_keep uuid, p_drop uuid, p_reason text DEFAULT 'auto-dedupe')
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, equity_brain
AS $$
DECLARE
  v_payload jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'permission denied: admin only';
  END IF;
  IF p_keep = p_drop THEN RAISE EXCEPTION 'keep and drop must differ'; END IF;

  SELECT to_jsonb(p) INTO v_payload FROM public.buyer_profiles p WHERE id = p_drop;
  IF v_payload IS NULL THEN RAISE EXCEPTION 'drop buyer_profile not found'; END IF;

  PERFORM equity_brain._merge_fillup('public','buyer_profiles', p_keep, p_drop);

  INSERT INTO equity_brain.dedupe_audit (entity_type, kept_id, removed_id, merged_by, reason, payload)
    VALUES ('buyer_profile', p_keep, p_drop, auth.uid(), p_reason, v_payload);

  DELETE FROM public.buyer_profiles WHERE id = p_drop;
  RETURN '{"buyer_profiles":1}'::jsonb;
END;
$$;

-- =========================================================
-- 3) DEDUPE STATS
-- =========================================================
CREATE OR REPLACE FUNCTION equity_brain.get_dedupe_stats()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, equity_brain
AS $$
DECLARE
  v jsonb := '{}'::jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'permission denied: admin only';
  END IF;

  SELECT v || jsonb_build_object('mandates',
    jsonb_build_object('groups', COUNT(*) FILTER (WHERE c>1), 'extra', COALESCE(SUM(c-1) FILTER (WHERE c>1),0))
  ) INTO v
  FROM (SELECT company_cnpj, COALESCE(deal_type::text,''), COALESCE(deal_kind::text,''), COUNT(*) c
        FROM equity_brain.mandates
        WHERE company_cnpj IS NOT NULL AND status::text NOT IN ('cancelado','concluido')
        GROUP BY 1,2,3) x;

  SELECT v || jsonb_build_object('buyers',
    jsonb_build_object('groups', COUNT(*) FILTER (WHERE c>1), 'extra', COALESCE(SUM(c-1) FILTER (WHERE c>1),0))
  ) INTO v
  FROM (SELECT lower(trim(nome)), COUNT(*) c FROM equity_brain.buyers
        WHERE nome IS NOT NULL GROUP BY 1) x;

  SELECT v || jsonb_build_object('contacts',
    jsonb_build_object('groups', COUNT(*) FILTER (WHERE c>1), 'extra', COALESCE(SUM(c-1) FILTER (WHERE c>1),0))
  ) INTO v
  FROM (
    SELECT key, COUNT(*) c FROM (
      SELECT entity_type::text||'|'||entity_id::text||'|email|'||lower(email) AS key
      FROM equity_brain.contacts WHERE email IS NOT NULL AND email<>''
      UNION ALL
      SELECT entity_type::text||'|'||entity_id::text||'|tel|'||regexp_replace(telefone_e164,'\D','','g')
      FROM equity_brain.contacts WHERE telefone_e164 IS NOT NULL AND length(regexp_replace(telefone_e164,'\D','','g'))>=10
    ) z GROUP BY key
  ) y;

  SELECT v || jsonb_build_object('buyer_profiles',
    jsonb_build_object('groups', COUNT(*) FILTER (WHERE c>1), 'extra', COALESCE(SUM(c-1) FILTER (WHERE c>1),0))
  ) INTO v
  FROM (SELECT user_id, lower(buyer_name), COUNT(*) c FROM public.buyer_profiles GROUP BY 1,2) x;

  RETURN v;
END;
$$;

-- =========================================================
-- 4) RUN SAFE DEDUPE (lote, por entidade)
-- =========================================================
CREATE OR REPLACE FUNCTION equity_brain.run_safe_dedupe(p_entity text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, equity_brain
AS $$
DECLARE
  v_count int := 0;
  rec record;
  v_keep uuid;
  v_drop uuid;
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
        PERFORM equity_brain.merge_mandates(v_keep, v_drop, 'batch:mandates');
        v_count := v_count + 1;
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
        PERFORM equity_brain.merge_buyers(v_keep, v_drop, 'batch:buyers');
        v_count := v_count + 1;
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
        PERFORM equity_brain.merge_contacts(v_keep, v_drop, 'batch:contacts:email');
        v_count := v_count + 1;
      END LOOP;
    END LOOP;

    -- telefone (depois do email para reduzir grupos restantes)
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
          AND regexp_replace(telefone_e164,'\D','','g') = rec.k AND id <> v_keep
      LOOP
        PERFORM equity_brain.merge_contacts(v_keep, v_drop, 'batch:contacts:phone');
        v_count := v_count + 1;
      END LOOP;
    END LOOP;

  ELSIF p_entity = 'buyer_profiles' THEN
    FOR rec IN
      SELECT user_id, lower(buyer_name) k FROM public.buyer_profiles
      GROUP BY 1,2 HAVING COUNT(*) > 1
    LOOP
      SELECT id INTO v_keep FROM public.buyer_profiles p
      WHERE user_id = rec.user_id AND lower(buyer_name) = rec.k
      ORDER BY (source_eb_buyer_id IS NOT NULL) DESC,
               (SELECT count(*) FROM jsonb_each(to_jsonb(p)) e WHERE e.value IS NOT NULL AND e.value::text NOT IN ('null','""')) DESC,
               created_at ASC
      LIMIT 1;
      FOR v_drop IN
        SELECT id FROM public.buyer_profiles
        WHERE user_id = rec.user_id AND lower(buyer_name) = rec.k AND id <> v_keep
      LOOP
        PERFORM equity_brain.merge_buyer_profiles(v_keep, v_drop, 'batch:buyer_profiles');
        v_count := v_count + 1;
      END LOOP;
    END LOOP;
  ELSE
    RAISE EXCEPTION 'unknown entity %', p_entity;
  END IF;

  RETURN jsonb_build_object('entity', p_entity, 'merged', v_count);
END;
$$;

-- =========================================================
-- 5) GRANTS via wrappers no schema public (Supabase só expõe public)
-- =========================================================
CREATE OR REPLACE FUNCTION public.eb_get_dedupe_stats()
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path = public, equity_brain AS
$$ SELECT equity_brain.get_dedupe_stats() $$;

CREATE OR REPLACE FUNCTION public.eb_run_safe_dedupe(p_entity text)
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path = public, equity_brain AS
$$ SELECT equity_brain.run_safe_dedupe(p_entity) $$;

CREATE OR REPLACE FUNCTION public.eb_dedupe_audit_recent(p_limit int DEFAULT 50)
RETURNS TABLE(id uuid, entity_type text, kept_id uuid, removed_id uuid, merged_at timestamptz, merged_by uuid, reason text, refs_updated jsonb)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, equity_brain AS
$$
  SELECT id, entity_type, kept_id, removed_id, merged_at, merged_by, reason, refs_updated
  FROM equity_brain.dedupe_audit
  WHERE public.has_role(auth.uid(), 'admin'::public.app_role)
  ORDER BY merged_at DESC LIMIT p_limit
$$;

REVOKE ALL ON FUNCTION public.eb_get_dedupe_stats() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.eb_get_dedupe_stats() TO authenticated;
REVOKE ALL ON FUNCTION public.eb_run_safe_dedupe(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.eb_run_safe_dedupe(text) TO authenticated;
REVOKE ALL ON FUNCTION public.eb_dedupe_audit_recent(int) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.eb_dedupe_audit_recent(int) TO authenticated;
