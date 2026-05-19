
-- ============================================
-- BLOCO 1.3: audit_events (imutável + RLS + helper + view + backfill)
-- ============================================

-- 1) Tabela
CREATE TABLE IF NOT EXISTS public.audit_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id uuid,
  entity_type text NOT NULL,
  entity_id uuid,
  event_type text NOT NULL,
  actor_user_id uuid,
  actor_role app_role,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_events_deal_created ON public.audit_events (deal_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_events_entity ON public.audit_events (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_actor ON public.audit_events (actor_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_event_type ON public.audit_events (event_type);

-- 2) Imutabilidade — bloqueia UPDATE/DELETE
CREATE OR REPLACE FUNCTION public.audit_events_block_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'audit_events is append-only — % is not allowed', TG_OP;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_events_no_update ON public.audit_events;
CREATE TRIGGER trg_audit_events_no_update
BEFORE UPDATE ON public.audit_events
FOR EACH ROW EXECUTE FUNCTION public.audit_events_block_mutation();

DROP TRIGGER IF EXISTS trg_audit_events_no_delete ON public.audit_events;
CREATE TRIGGER trg_audit_events_no_delete
BEFORE DELETE ON public.audit_events
FOR EACH ROW EXECUTE FUNCTION public.audit_events_block_mutation();

-- 3) RLS
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_events_select" ON public.audit_events;
CREATE POLICY "audit_events_select"
ON public.audit_events
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR has_role(auth.uid(), 'advisor'::app_role)
  OR actor_user_id = auth.uid()
);

DROP POLICY IF EXISTS "audit_events_insert" ON public.audit_events;
CREATE POLICY "audit_events_insert"
ON public.audit_events
FOR INSERT
TO authenticated
WITH CHECK (true);

-- 4) Helper SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.log_audit_event(
  _deal_id uuid,
  _entity_type text,
  _entity_id uuid,
  _event_type text,
  _payload jsonb DEFAULT '{}'::jsonb,
  _ip inet DEFAULT NULL,
  _user_agent text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _role app_role;
  _id uuid;
BEGIN
  SELECT role INTO _role
  FROM public.user_roles
  WHERE user_id = _uid
  ORDER BY CASE role
    WHEN 'admin' THEN 1
    WHEN 'advisor' THEN 2
    WHEN 'franchisee' THEN 3
    ELSE 9
  END
  LIMIT 1;

  INSERT INTO public.audit_events (
    deal_id, entity_type, entity_id, event_type,
    actor_user_id, actor_role, payload, ip, user_agent
  )
  VALUES (
    _deal_id, _entity_type, _entity_id, _event_type,
    _uid, _role, COALESCE(_payload, '{}'::jsonb), _ip, _user_agent
  )
  RETURNING id INTO _id;

  RETURN _id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_audit_event(uuid, text, uuid, text, jsonb, inet, text) TO authenticated;

-- 5) View deal_timeline (security_invoker para respeitar RLS do chamador)
DROP VIEW IF EXISTS public.deal_timeline;
CREATE VIEW public.deal_timeline
WITH (security_invoker = on)
AS
SELECT
  ae.id,
  ae.deal_id,
  'audit'::text AS source,
  ae.event_type,
  ae.entity_type,
  ae.entity_id,
  ae.actor_user_id,
  ae.payload,
  ae.created_at
FROM public.audit_events ae
UNION ALL
SELECT
  t.id,
  t.mandate_id AS deal_id,
  'pipeline'::text AS source,
  'stage_changed'::text AS event_type,
  'pipeline'::text AS entity_type,
  t.mandate_id AS entity_id,
  t.moved_by AS actor_user_id,
  jsonb_build_object(
    'from_stage', t.from_stage,
    'to_stage', t.to_stage,
    'from_outcome', t.from_outcome,
    'to_outcome', t.to_outcome,
    'note', t.note,
    'actual_hours', t.actual_hours,
    'target_hours', t.target_hours,
    'delta_hours', t.delta_hours
  ) AS payload,
  t.moved_at AS created_at
FROM public.eb_pipeline_transitions t;

GRANT SELECT ON public.deal_timeline TO authenticated;

-- 6) Backfill idempotente (transições já existentes -> audit_events)
INSERT INTO public.audit_events (
  deal_id, entity_type, entity_id, event_type,
  actor_user_id, payload, created_at
)
SELECT
  t.mandate_id AS deal_id,
  'pipeline'::text,
  t.mandate_id AS entity_id,
  'stage_changed'::text,
  t.moved_by,
  jsonb_build_object(
    'transition_id', t.id,
    'from_stage', t.from_stage,
    'to_stage', t.to_stage,
    'from_outcome', t.from_outcome,
    'to_outcome', t.to_outcome,
    'note', t.note,
    'actual_hours', t.actual_hours,
    'target_hours', t.target_hours,
    'delta_hours', t.delta_hours,
    'backfilled', true
  ),
  t.moved_at
FROM public.eb_pipeline_transitions t
WHERE NOT EXISTS (
  SELECT 1 FROM public.audit_events ae
  WHERE ae.event_type = 'stage_changed'
    AND ae.entity_type = 'pipeline'
    AND ae.payload->>'transition_id' = t.id::text
);
