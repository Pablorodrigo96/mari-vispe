
-- 1. Codename columns
ALTER TABLE equity_brain.companies
  ADD COLUMN IF NOT EXISTS codename text,
  ADD COLUMN IF NOT EXISTS codename_prefix text;

ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS codename text,
  ADD COLUMN IF NOT EXISTS codename_prefix text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_eb_companies_codename ON equity_brain.companies (codename) WHERE codename IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_listings_codename ON public.listings (codename) WHERE codename IS NOT NULL;

-- 2. Codename generator
CREATE OR REPLACE FUNCTION equity_brain.derive_codename_prefix(p_sector text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT COALESCE(
    NULLIF(upper(left(regexp_replace(coalesce(p_sector,''), '[^A-Za-z]', '', 'g'), 4)), ''),
    'GEN'
  );
$$;

CREATE OR REPLACE FUNCTION equity_brain.next_codename(p_prefix text)
RETURNS text LANGUAGE plpgsql AS $$
DECLARE seq int; pat text;
BEGIN
  pat := 'MARI-' || p_prefix || '-%';
  SELECT COALESCE(MAX(NULLIF(regexp_replace(codename, '^MARI-[A-Z]+-', ''), '')::int), 0) + 1
    INTO seq
  FROM (
    SELECT codename FROM equity_brain.companies WHERE codename LIKE pat
    UNION ALL
    SELECT codename FROM public.listings WHERE codename LIKE pat
  ) x;
  RETURN format('MARI-%s-%s', p_prefix, lpad(seq::text, 4, '0'));
END $$;

-- 3. Triggers
CREATE OR REPLACE FUNCTION equity_brain.set_company_codename()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.codename IS NULL OR NEW.codename = '' THEN
    NEW.codename_prefix := equity_brain.derive_codename_prefix(NEW.setor_ma);
    NEW.codename := equity_brain.next_codename(NEW.codename_prefix);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_eb_companies_codename ON equity_brain.companies;
CREATE TRIGGER trg_eb_companies_codename
  BEFORE INSERT ON equity_brain.companies
  FOR EACH ROW EXECUTE FUNCTION equity_brain.set_company_codename();

CREATE OR REPLACE FUNCTION public.set_listing_codename()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','equity_brain' AS $$
BEGIN
  IF NEW.codename IS NULL OR NEW.codename = '' THEN
    NEW.codename_prefix := equity_brain.derive_codename_prefix(NEW.category);
    NEW.codename := equity_brain.next_codename(NEW.codename_prefix);
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_listings_codename ON public.listings;
CREATE TRIGGER trg_listings_codename
  BEFORE INSERT ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.set_listing_codename();

-- 4. Backfill
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT cnpj, setor_ma FROM equity_brain.companies WHERE codename IS NULL LOOP
    UPDATE equity_brain.companies
       SET codename_prefix = equity_brain.derive_codename_prefix(r.setor_ma),
           codename = equity_brain.next_codename(equity_brain.derive_codename_prefix(r.setor_ma))
     WHERE cnpj = r.cnpj;
  END LOOP;
  FOR r IN SELECT id, category FROM public.listings WHERE codename IS NULL LOOP
    UPDATE public.listings
       SET codename_prefix = equity_brain.derive_codename_prefix(r.category),
           codename = equity_brain.next_codename(equity_brain.derive_codename_prefix(r.category))
     WHERE id = r.id;
  END LOOP;
END $$;

-- 5. Disclosure requests + grants
CREATE TABLE IF NOT EXISTS equity_brain.disclosure_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL,
  target_kind text NOT NULL CHECK (target_kind IN ('company','listing')),
  target_cnpj varchar(14),
  target_listing_id uuid,
  target_codename text,
  reason text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','expired','revoked')),
  advisor_id uuid,
  decision_notes text,
  decided_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((target_kind='company' AND target_cnpj IS NOT NULL) OR (target_kind='listing' AND target_listing_id IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS idx_disclosure_req_requester ON equity_brain.disclosure_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_disclosure_req_status ON equity_brain.disclosure_requests(status);

ALTER TABLE equity_brain.disclosure_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Requester sees own requests" ON equity_brain.disclosure_requests
  FOR SELECT TO authenticated USING (requester_id = auth.uid());
CREATE POLICY "Advisors and admins see all requests" ON equity_brain.disclosure_requests
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'advisor'::app_role)
  );
CREATE POLICY "Authenticated can create request" ON equity_brain.disclosure_requests
  FOR INSERT TO authenticated WITH CHECK (requester_id = auth.uid());
CREATE POLICY "Advisors/admins can decide" ON equity_brain.disclosure_requests
  FOR UPDATE TO authenticated USING (
    public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'advisor'::app_role)
  );

CREATE TABLE IF NOT EXISTS equity_brain.disclosure_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid REFERENCES equity_brain.disclosure_requests(id) ON DELETE SET NULL,
  granted_to uuid NOT NULL,
  target_kind text NOT NULL CHECK (target_kind IN ('company','listing')),
  target_cnpj varchar(14),
  target_listing_id uuid,
  granted_by uuid NOT NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  revoked_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_disclosure_grants_active
  ON equity_brain.disclosure_grants(granted_to, target_cnpj, target_listing_id) WHERE revoked_at IS NULL;

ALTER TABLE equity_brain.disclosure_grants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Recipient sees own grants" ON equity_brain.disclosure_grants
  FOR SELECT TO authenticated USING (granted_to = auth.uid());
CREATE POLICY "Advisors/admins see all grants" ON equity_brain.disclosure_grants
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'advisor'::app_role)
  );
CREATE POLICY "Advisors/admins manage grants" ON equity_brain.disclosure_grants
  FOR ALL TO authenticated USING (
    public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'advisor'::app_role)
  ) WITH CHECK (
    public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'advisor'::app_role)
  );

-- 6. Identity visibility RPC
CREATE OR REPLACE FUNCTION public.eb_can_view_identity(p_cnpj varchar DEFAULT NULL, p_listing uuid DEFAULT NULL)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public','equity_brain' AS $$
DECLARE v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL THEN RETURN false; END IF;
  IF public.has_role(v_user,'admin'::app_role) OR public.has_role(v_user,'advisor'::app_role) THEN RETURN true; END IF;
  IF p_listing IS NOT NULL AND EXISTS (SELECT 1 FROM public.listings WHERE id = p_listing AND user_id = v_user) THEN RETURN true; END IF;
  IF EXISTS (
    SELECT 1 FROM equity_brain.disclosure_grants g
    WHERE g.granted_to = v_user
      AND g.revoked_at IS NULL
      AND g.expires_at > now()
      AND ((p_cnpj IS NOT NULL AND g.target_cnpj = p_cnpj) OR (p_listing IS NOT NULL AND g.target_listing_id = p_listing))
  ) THEN RETURN true; END IF;
  RETURN false;
END $$;

GRANT EXECUTE ON FUNCTION public.eb_can_view_identity(varchar, uuid) TO authenticated;

-- 7. Bucket helpers
CREATE OR REPLACE FUNCTION equity_brain.bucket_revenue(v numeric)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN v IS NULL THEN 'n/d'
    WHEN v < 2e6 THEN '<2M'
    WHEN v < 10e6 THEN '2-10M'
    WHEN v < 50e6 THEN '10-50M'
    WHEN v < 200e6 THEN '50-200M'
    ELSE '200M+' END;
$$;

CREATE OR REPLACE FUNCTION equity_brain.bucket_employees(v integer)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN v IS NULL THEN 'n/d'
    WHEN v < 10 THEN '<10'
    WHEN v < 50 THEN '10-50'
    WHEN v < 200 THEN '50-200'
    WHEN v < 1000 THEN '200-1k'
    ELSE '1k+' END;
$$;

-- 8. Blind views
DROP VIEW IF EXISTS equity_brain.companies_blind CASCADE;
CREATE VIEW equity_brain.companies_blind WITH (security_invoker=on) AS
SELECT
  c.codename,
  c.codename_prefix,
  c.setor_ma,
  c.subsetor_ma,
  c.uf,
  c.porte,
  equity_brain.bucket_revenue(c.faturamento_estimado) AS faixa_faturamento,
  equity_brain.bucket_employees(c.funcionarios_estimado) AS faixa_funcionarios,
  c.qtd_socios,
  c.has_listing,
  c.qualification_status,
  c.last_enriched_at,
  c.created_at,
  CASE WHEN public.eb_can_view_identity(c.cnpj, NULL) THEN c.cnpj END AS cnpj,
  CASE WHEN public.eb_can_view_identity(c.cnpj, NULL) THEN c.razao_social END AS razao_social,
  CASE WHEN public.eb_can_view_identity(c.cnpj, NULL) THEN c.nome_fantasia END AS nome_fantasia,
  CASE WHEN public.eb_can_view_identity(c.cnpj, NULL) THEN c.municipio END AS municipio
FROM equity_brain.companies c;

GRANT SELECT ON equity_brain.companies_blind TO anon, authenticated;

DROP VIEW IF EXISTS public.listings_blind CASCADE;
CREATE VIEW public.listings_blind WITH (security_invoker=on) AS
SELECT
  l.id,
  l.codename,
  l.codename_prefix,
  l.category,
  l.state,
  l.status,
  l.plan,
  l.equity_score,
  l.vdr_readiness,
  equity_brain.bucket_revenue(l.annual_revenue) AS faixa_faturamento,
  equity_brain.bucket_revenue(l.annual_profit) AS faixa_lucro,
  l.foundation_year,
  l.created_at,
  CASE WHEN public.eb_can_view_identity(l.cnpj, l.id) THEN l.title END AS title,
  CASE WHEN public.eb_can_view_identity(l.cnpj, l.id) THEN l.description END AS description,
  CASE WHEN public.eb_can_view_identity(l.cnpj, l.id) THEN l.cnpj END AS cnpj,
  CASE WHEN public.eb_can_view_identity(l.cnpj, l.id) THEN l.city END AS city,
  CASE WHEN public.eb_can_view_identity(l.cnpj, l.id) THEN l.images END AS images,
  CASE WHEN public.eb_can_view_identity(l.cnpj, l.id) THEN l.video_url END AS video_url,
  CASE WHEN public.eb_can_view_identity(l.cnpj, l.id) THEN l.asking_price END AS asking_price
FROM public.listings l
WHERE l.status = 'active' OR public.eb_can_view_identity(l.cnpj, l.id);

GRANT SELECT ON public.listings_blind TO anon, authenticated;

-- 9. Disclosure RPCs
CREATE OR REPLACE FUNCTION public.eb_request_disclosure(
  p_target_kind text,
  p_target_cnpj varchar DEFAULT NULL,
  p_target_listing_id uuid DEFAULT NULL,
  p_reason text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','equity_brain' AS $$
DECLARE
  v_user uuid := auth.uid();
  v_id uuid;
  v_codename text;
  advisor_rec record;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'auth_required'; END IF;
  IF p_target_kind NOT IN ('company','listing') THEN RAISE EXCEPTION 'invalid target_kind'; END IF;

  IF p_target_kind='company' THEN
    SELECT codename INTO v_codename FROM equity_brain.companies WHERE cnpj = p_target_cnpj;
  ELSE
    SELECT codename INTO v_codename FROM public.listings WHERE id = p_target_listing_id;
  END IF;

  SELECT id INTO v_id FROM equity_brain.disclosure_requests
   WHERE requester_id = v_user
     AND target_kind = p_target_kind
     AND COALESCE(target_cnpj,'') = COALESCE(p_target_cnpj,'')
     AND COALESCE(target_listing_id::text,'') = COALESCE(p_target_listing_id::text,'')
     AND status = 'pending'
   LIMIT 1;
  IF v_id IS NOT NULL THEN RETURN v_id; END IF;

  INSERT INTO equity_brain.disclosure_requests
    (requester_id, target_kind, target_cnpj, target_listing_id, target_codename, reason)
  VALUES (v_user, p_target_kind, p_target_cnpj, p_target_listing_id, v_codename, p_reason)
  RETURNING id INTO v_id;

  FOR advisor_rec IN
    SELECT user_id FROM public.user_roles WHERE role IN ('advisor','admin')
  LOOP
    INSERT INTO public.notifications (user_id, type, title, content)
    VALUES (
      advisor_rec.user_id, 'system',
      'Nova solicitação de abertura',
      'Parceiro pediu abertura de identidade do ativo ' || COALESCE(v_codename,'(sem codinome)') || '. Motivo: ' || COALESCE(p_reason,'(não informado)')
    );
  END LOOP;

  RETURN v_id;
END $$;

GRANT EXECUTE ON FUNCTION public.eb_request_disclosure(text, varchar, uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.eb_decide_disclosure(
  p_request_id uuid,
  p_decision text,
  p_expires_in_days integer DEFAULT 14,
  p_notes text DEFAULT NULL
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','equity_brain' AS $$
DECLARE
  v_user uuid := auth.uid();
  v_req equity_brain.disclosure_requests%ROWTYPE;
  v_grant_id uuid;
BEGIN
  IF NOT (public.has_role(v_user,'admin'::app_role) OR public.has_role(v_user,'advisor'::app_role)) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF p_decision NOT IN ('approved','rejected') THEN RAISE EXCEPTION 'invalid_decision'; END IF;

  SELECT * INTO v_req FROM equity_brain.disclosure_requests WHERE id = p_request_id FOR UPDATE;
  IF v_req.id IS NULL THEN RAISE EXCEPTION 'not_found'; END IF;
  IF v_req.status <> 'pending' THEN RAISE EXCEPTION 'already_decided'; END IF;

  UPDATE equity_brain.disclosure_requests
     SET status = p_decision,
         advisor_id = v_user,
         decided_at = now(),
         decision_notes = p_notes
   WHERE id = p_request_id;

  IF p_decision='approved' THEN
    INSERT INTO equity_brain.disclosure_grants
      (request_id, granted_to, target_kind, target_cnpj, target_listing_id, granted_by, expires_at)
    VALUES
      (v_req.id, v_req.requester_id, v_req.target_kind, v_req.target_cnpj, v_req.target_listing_id, v_user,
       now() + make_interval(days => GREATEST(1, COALESCE(p_expires_in_days,14))))
    RETURNING id INTO v_grant_id;

    INSERT INTO public.notifications (user_id, type, title, content)
    VALUES (v_req.requester_id, 'system', 'Abertura aprovada',
      'Sua solicitação para o ativo ' || COALESCE(v_req.target_codename,'') || ' foi aprovada. Você tem acesso à identidade real.');
  ELSE
    INSERT INTO public.notifications (user_id, type, title, content)
    VALUES (v_req.requester_id, 'system', 'Abertura recusada',
      'Sua solicitação para o ativo ' || COALESCE(v_req.target_codename,'') || ' foi recusada por um advisor Vispe.');
  END IF;

  RETURN jsonb_build_object('ok', true, 'status', p_decision, 'grant_id', v_grant_id);
END $$;

GRANT EXECUTE ON FUNCTION public.eb_decide_disclosure(uuid, text, integer, text) TO authenticated;
