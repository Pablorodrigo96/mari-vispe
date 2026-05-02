
CREATE OR REPLACE FUNCTION equity_brain.get_deal_timeline(p_mandate_id uuid)
RETURNS TABLE (
  ts timestamptz,
  source text,
  kind text,
  title text,
  body text,
  actor_name text,
  metadata jsonb,
  color text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, equity_brain
AS $$
DECLARE
  v_cnpj text;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'advisor')) THEN
    RETURN;
  END IF;

  SELECT company_cnpj INTO v_cnpj
  FROM equity_brain.mandates WHERE id = p_mandate_id;

  RETURN QUERY
  -- 1. crm_activities
  SELECT
    ca.created_at AS ts,
    'crm_activity'::text AS source,
    COALESCE(ca.kind, 'note')::text AS kind,
    INITCAP(COALESCE(ca.kind, 'nota'))::text AS title,
    ca.body AS body,
    p.full_name AS actor_name,
    COALESCE(ca.metadata, '{}'::jsonb) AS metadata,
    CASE ca.kind
      WHEN 'call' THEN 'blue'
      WHEN 'email' THEN 'amber'
      WHEN 'whatsapp' THEN 'green'
      WHEN 'meeting' THEN 'purple'
      ELSE 'zinc'
    END::text AS color
  FROM equity_brain.crm_activities ca
  LEFT JOIN public.profiles p ON p.user_id = ca.created_by
  WHERE ca.entity_type = 'mandate' AND ca.entity_id = p_mandate_id

  UNION ALL

  -- 2. whatsapp_action_log
  SELECT
    COALESCE(wal.opened_at, wal.created_at) AS ts,
    'whatsapp'::text,
    'whatsapp_outbound'::text,
    'WhatsApp enviado'::text,
    COALESCE(wal.draft_text_sent, wal.draft_text_generated) AS body,
    p.full_name AS actor_name,
    jsonb_build_object('phone', wal.phone_number, 'draft_type', wal.draft_type, 'marked_action', wal.marked_action) AS metadata,
    'green'::text AS color
  FROM equity_brain.whatsapp_action_log wal
  LEFT JOIN public.profiles p ON p.user_id = wal.advisor_id
  WHERE wal.mandate_id = p_mandate_id

  UNION ALL

  -- 3. eb_pipeline_transitions (public schema)
  SELECT
    pt.moved_at AS ts,
    'pipeline'::text,
    'phase_change'::text,
    ('Fase: ' || COALESCE(pt.from_stage, '—') || ' → ' || COALESCE(pt.to_stage, '—'))::text AS title,
    pt.note AS body,
    p.full_name AS actor_name,
    jsonb_build_object('from', pt.from_stage, 'to', pt.to_stage, 'time_in_prev_seconds', pt.time_in_previous_stage_seconds) AS metadata,
    'purple'::text AS color
  FROM public.eb_pipeline_transitions pt
  LEFT JOIN public.profiles p ON p.user_id = pt.moved_by
  WHERE pt.mandate_id = p_mandate_id

  UNION ALL

  -- 4. mandate_subtasks
  SELECT
    COALESCE(ms.updated_at, ms.created_at) AS ts,
    'subtask'::text,
    CASE WHEN ms.status = 'concluido' THEN 'subtask_done' ELSE 'subtask_update' END::text,
    ('Subtarefa: ' || ms.name)::text,
    ms.anotacoes AS body,
    p.full_name AS actor_name,
    jsonb_build_object('status', ms.status, 'etapa', ms.etapa) AS metadata,
    CASE WHEN ms.status = 'concluido' THEN 'emerald' ELSE 'zinc' END::text AS color
  FROM equity_brain.mandate_subtasks ms
  LEFT JOIN public.profiles p ON p.user_id = ms.created_by
  WHERE ms.mandate_id = p_mandate_id

  UNION ALL

  -- 5. deal_events (linked by cnpj)
  SELECT
    de.event_ts AS ts,
    'deal_event'::text,
    de.event_type::text,
    ('Evento: ' || de.event_type)::text,
    COALESCE(de.notes, de.rejection_reason) AS body,
    p.full_name AS actor_name,
    COALESCE(de.metadata, '{}'::jsonb) AS metadata,
    CASE
      WHEN de.event_type ILIKE '%accept%' OR de.event_type ILIKE '%won%' THEN 'emerald'
      WHEN de.event_type ILIKE '%reject%' OR de.event_type ILIKE '%lost%' THEN 'rose'
      ELSE 'sky'
    END::text AS color
  FROM equity_brain.deal_events de
  LEFT JOIN public.profiles p ON p.user_id = de.bdr_user_id
  WHERE v_cnpj IS NOT NULL AND de.cnpj = v_cnpj

  ORDER BY ts DESC NULLS LAST
  LIMIT 200;
END;
$$;

GRANT EXECUTE ON FUNCTION equity_brain.get_deal_timeline(uuid) TO authenticated;
