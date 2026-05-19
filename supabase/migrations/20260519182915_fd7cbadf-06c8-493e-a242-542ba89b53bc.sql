
-- C4: trilha de auditoria de acessos a identidade
ALTER TABLE equity_brain.access_logs
  ADD COLUMN IF NOT EXISTS disclosure_mode text NOT NULL DEFAULT 'implicit',
  ADD COLUMN IF NOT EXISTS context text,
  ADD COLUMN IF NOT EXISTS cnpj text;

CREATE INDEX IF NOT EXISTS idx_eb_access_logs_cnpj
  ON equity_brain.access_logs (cnpj, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_eb_access_logs_user_recent
  ON equity_brain.access_logs (user_id, created_at DESC);

-- RPC: logar acesso a identidade (security definer, sem fricção)
CREATE OR REPLACE FUNCTION public.eb_log_identity_access(
  p_entity_type text,
  p_entity_id uuid,
  p_cnpj text DEFAULT NULL,
  p_context text DEFAULT NULL,
  p_disclosure_mode text DEFAULT 'implicit'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, equity_brain
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_id uuid;
  v_recent uuid;
BEGIN
  IF v_uid IS NULL THEN
    RETURN NULL;
  END IF;

  -- Throttle server-side: dedup último (user, target, contexto) na última 1h
  SELECT id INTO v_recent
  FROM equity_brain.access_logs
  WHERE user_id = v_uid
    AND COALESCE(cnpj,'') = COALESCE(p_cnpj,'')
    AND COALESCE(entity_id::text,'') = COALESCE(p_entity_id::text,'')
    AND COALESCE(context,'') = COALESCE(p_context,'')
    AND created_at > now() - interval '1 hour'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_recent IS NOT NULL THEN
    RETURN v_recent;
  END IF;

  INSERT INTO equity_brain.access_logs (
    user_id, entity_type, entity_id, action, cnpj, context, disclosure_mode
  ) VALUES (
    v_uid,
    p_entity_type,
    p_entity_id,
    'identity_view',
    p_cnpj,
    p_context,
    COALESCE(p_disclosure_mode, 'implicit')
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.eb_log_identity_access(text, uuid, text, text, text) FROM public;
GRANT EXECUTE ON FUNCTION public.eb_log_identity_access(text, uuid, text, text, text) TO authenticated;

-- View pública para a tela de auditoria ler com profile join
CREATE OR REPLACE VIEW public.eb_access_logs_v
WITH (security_invoker = true)
AS
SELECT
  al.id,
  al.user_id,
  al.entity_type,
  al.entity_id,
  al.cnpj,
  al.action,
  al.context,
  al.disclosure_mode,
  al.created_at,
  p.full_name AS advisor_name,
  c.razao_social,
  c.codename
FROM equity_brain.access_logs al
LEFT JOIN public.profiles p ON p.user_id = al.user_id
LEFT JOIN equity_brain.companies c ON c.cnpj = al.cnpj;

GRANT SELECT ON public.eb_access_logs_v TO authenticated;
