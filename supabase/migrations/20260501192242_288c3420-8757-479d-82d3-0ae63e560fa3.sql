
-- Helper 1: lookup de usuário pelo nome em raw_user_meta_data
CREATE OR REPLACE FUNCTION public.find_user_by_meta_name(search_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE result_id uuid;
BEGIN
  SELECT id INTO result_id FROM auth.users
   WHERE raw_user_meta_data->>'full_name' ILIKE search_name
      OR raw_user_meta_data->>'name' ILIKE search_name
   LIMIT 1;
  RETURN result_id;
END;
$$;

REVOKE ALL ON FUNCTION public.find_user_by_meta_name(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.find_user_by_meta_name(text) FROM anon;
REVOKE ALL ON FUNCTION public.find_user_by_meta_name(text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.find_user_by_meta_name(text) TO service_role;

-- Helper 2: resolver advisor pendente + backfill de mandatos importados
CREATE OR REPLACE FUNCTION public.eb_resolve_advisor_mapping(
  p_monday_name text,
  p_user_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_resp int := 0;
  v_pad int := 0;
  v_tag_resp text;
  v_tag_pad text;
BEGIN
  IF NOT public.has_role(v_caller, 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'forbidden: admin only';
  END IF;
  IF p_monday_name IS NULL OR length(trim(p_monday_name)) = 0 THEN
    RAISE EXCEPTION 'monday_name required';
  END IF;
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'user_id required';
  END IF;

  v_tag_resp := '%[mari:monday_responsavel=' || trim(p_monday_name) || ']%';
  v_tag_pad  := '%[mari:monday_padrinho='   || trim(p_monday_name) || ']%';

  -- Backfill responsavel_id em mandatos importados sem responsável
  WITH upd AS (
    UPDATE equity_brain.mandates m
       SET responsavel_id = p_user_id,
           updated_at = now()
     WHERE m.responsavel_id IS NULL
       AND coalesce(m.observacoes, '') ILIKE v_tag_resp
    RETURNING 1
  )
  SELECT count(*)::int INTO v_resp FROM upd;

  -- Backfill padrinho_id
  WITH updp AS (
    UPDATE equity_brain.mandates m
       SET padrinho_id = p_user_id,
           updated_at = now()
     WHERE m.padrinho_id IS NULL
       AND coalesce(m.observacoes, '') ILIKE v_tag_pad
    RETURNING 1
  )
  SELECT count(*)::int INTO v_pad FROM updp;

  -- Marca o nome pendente como resolvido
  UPDATE equity_brain.advisors_pending_mapping
     SET resolved_user_id = p_user_id,
         resolved_at = now(),
         resolved_by = v_caller
   WHERE monday_name = trim(p_monday_name);

  RETURN jsonb_build_object(
    'monday_name', trim(p_monday_name),
    'user_id', p_user_id,
    'updated_responsavel', v_resp,
    'updated_padrinho', v_pad
  );
END;
$$;

REVOKE ALL ON FUNCTION public.eb_resolve_advisor_mapping(text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.eb_resolve_advisor_mapping(text, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.eb_resolve_advisor_mapping(text, uuid) TO authenticated;
