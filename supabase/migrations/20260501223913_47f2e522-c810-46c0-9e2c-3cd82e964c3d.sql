
-- Helper safe-by-default: ignora colunas que pertencem a PRIMARY KEY ou UNIQUE
CREATE OR REPLACE FUNCTION equity_brain._merge_fillup(
  p_schema text, p_table text, p_keep uuid, p_drop uuid
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, equity_brain
AS $$
DECLARE
  cols text;
BEGIN
  SELECT string_agg(format('%I = COALESCE(k.%I, d.%I)', column_name, column_name, column_name), ', ')
    INTO cols
  FROM information_schema.columns c
  WHERE c.table_schema = p_schema
    AND c.table_name = p_table
    AND c.column_name NOT IN ('id','created_at','updated_at')
    AND c.column_name NOT IN (
      SELECT a.attname
      FROM pg_constraint pc
      JOIN pg_attribute a
        ON a.attrelid = pc.conrelid AND a.attnum = ANY (pc.conkey)
      WHERE pc.conrelid = format('%I.%I', p_schema, p_table)::regclass
        AND pc.contype IN ('p','u')
    );

  IF cols IS NULL THEN RETURN; END IF;

  EXECUTE format(
    'UPDATE %I.%I AS t SET %s FROM (SELECT * FROM %I.%I WHERE id = $1) k, (SELECT * FROM %I.%I WHERE id = $2) d WHERE t.id = $1',
    p_schema, p_table, cols, p_schema, p_table, p_schema, p_table
  ) USING p_keep, p_drop;
END;
$$;

-- Substitui merge_mandates com steal-then-null do monday_item_id
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

  -- steal-then-null: transfere monday_item_id do drop para o keep, se necessário, sem colisão
  UPDATE equity_brain.mandates SET monday_item_id = NULL WHERE id = p_drop AND monday_item_id IS NOT NULL
    AND EXISTS(SELECT 1 FROM equity_brain.mandates WHERE id = p_keep AND monday_item_id IS NOT NULL);
  -- caso keep esteja vazio, mover o valor do drop
  UPDATE equity_brain.mandates k
    SET monday_item_id = d.monday_item_id
    FROM equity_brain.mandates d
    WHERE k.id = p_keep AND d.id = p_drop
      AND k.monday_item_id IS NULL
      AND d.monday_item_id IS NOT NULL;
  UPDATE equity_brain.mandates SET monday_item_id = NULL WHERE id = p_drop;

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

  UPDATE equity_brain.crm_activities SET entity_id = p_keep
    WHERE entity_type = 'mandate' AND entity_id = p_drop;
  GET DIAGNOSTICS v_n = ROW_COUNT; v_refs := v_refs || jsonb_build_object('crm_activities', v_n);

  PERFORM equity_brain._merge_fillup('equity_brain','mandates', p_keep, p_drop);

  INSERT INTO equity_brain.dedupe_audit (entity_type, kept_id, removed_id, merged_by, reason, payload, refs_updated)
    VALUES ('mandate', p_keep, p_drop, auth.uid(), p_reason, v_payload, v_refs);

  DELETE FROM equity_brain.mandates WHERE id = p_drop;

  RETURN v_refs;
END;
$$;
