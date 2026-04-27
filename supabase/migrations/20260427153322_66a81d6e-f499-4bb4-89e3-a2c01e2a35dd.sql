
-- RPC pública para registrar deal events (feedback do BDR)
CREATE OR REPLACE FUNCTION public.eb_log_deal_event(
  p_match_id uuid,
  p_event_type text,
  p_rejection_reason text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, equity_brain
AS $$
DECLARE
  v_event_id uuid;
  v_cnpj varchar(14);
  v_buyer_id uuid;
BEGIN
  -- Apenas admin ou advisor podem registrar
  IF NOT (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'advisor'::app_role)) THEN
    RAISE EXCEPTION 'Sem permissão para registrar deal events';
  END IF;

  -- Validar event_type
  IF p_event_type NOT IN ('rejected','contacted','reply_received','nda_signed','loi_received','term_sheet','closed','dropped') THEN
    RAISE EXCEPTION 'event_type inválido: %', p_event_type;
  END IF;

  -- Buscar cnpj/buyer_id do match
  SELECT cnpj, buyer_id INTO v_cnpj, v_buyer_id
  FROM equity_brain.matches WHERE id = p_match_id;

  IF v_cnpj IS NULL THEN
    RAISE EXCEPTION 'Match não encontrado: %', p_match_id;
  END IF;

  INSERT INTO equity_brain.deal_events
    (match_id, cnpj, buyer_id, event_type, rejection_reason, notes, bdr_user_id, metadata)
  VALUES
    (p_match_id, v_cnpj, v_buyer_id, p_event_type, p_rejection_reason, p_notes, auth.uid(), COALESCE(p_metadata, '{}'::jsonb))
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.eb_log_deal_event(uuid, text, text, text, jsonb) TO authenticated;
