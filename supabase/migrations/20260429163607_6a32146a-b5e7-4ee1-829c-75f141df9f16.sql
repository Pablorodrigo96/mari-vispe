
-- =====================================================================
-- CRM Buyside/Sellside Foundation - Fase 1
-- =====================================================================

-- 1) ENUMs
DO $$ BEGIN
  CREATE TYPE equity_brain.mandate_status AS ENUM (
    'vigente','vencido','vendemos','em_negociacao','vendeu_sozinho','cancelado'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE equity_brain.crm_entity_type AS ENUM ('mandate','buyer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE equity_brain.crm_activity_kind AS ENUM (
    'whatsapp','call','email','meeting','note','status_change','preference_change','match_event'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE equity_brain.crm_activity_direction AS ENUM ('out','in','system');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) MANDATES
CREATE TABLE IF NOT EXISTS equity_brain.mandates (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_cnpj    varchar(14) NOT NULL REFERENCES equity_brain.companies(cnpj) ON DELETE CASCADE,
  status          equity_brain.mandate_status NOT NULL DEFAULT 'vigente',
  exclusividade   boolean NOT NULL DEFAULT false,
  data_assinatura date,
  data_vencimento date,
  comissao_pct    numeric(5,2),
  valor_pedido    numeric(15,2),
  responsavel_id  uuid,
  observacoes     text,
  source          varchar(30) DEFAULT 'manual',
  created_by      uuid,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mandates_status   ON equity_brain.mandates(status);
CREATE INDEX IF NOT EXISTS idx_mandates_cnpj     ON equity_brain.mandates(company_cnpj);
CREATE INDEX IF NOT EXISTS idx_mandates_resp     ON equity_brain.mandates(responsavel_id);
CREATE INDEX IF NOT EXISTS idx_mandates_venc     ON equity_brain.mandates(data_vencimento) WHERE data_vencimento IS NOT NULL;

ALTER TABLE equity_brain.mandates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS mandates_admin_advisor_all ON equity_brain.mandates;
CREATE POLICY mandates_admin_advisor_all ON equity_brain.mandates
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'advisor'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'advisor'));

-- 3) CONTACTS
CREATE TABLE IF NOT EXISTS equity_brain.contacts (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type      equity_brain.crm_entity_type NOT NULL,
  entity_id        uuid NOT NULL,
  nome             text NOT NULL,
  cargo            text,
  telefone_e164    text,
  email            text,
  is_primary       boolean NOT NULL DEFAULT false,
  whatsapp_opt_in  boolean NOT NULL DEFAULT true,
  notas            text,
  source           varchar(30) DEFAULT 'manual',
  created_by       uuid,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contacts_entity     ON equity_brain.contacts(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_contacts_primary    ON equity_brain.contacts(entity_type, entity_id) WHERE is_primary = true;
CREATE INDEX IF NOT EXISTS idx_contacts_phone      ON equity_brain.contacts(telefone_e164) WHERE telefone_e164 IS NOT NULL;

ALTER TABLE equity_brain.contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS contacts_admin_advisor_all ON equity_brain.contacts;
CREATE POLICY contacts_admin_advisor_all ON equity_brain.contacts
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'advisor'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'advisor'));

-- 4) CRM ACTIVITIES (timeline unificada)
CREATE TABLE IF NOT EXISTS equity_brain.crm_activities (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type   equity_brain.crm_entity_type NOT NULL,
  entity_id     uuid NOT NULL,
  contact_id    uuid REFERENCES equity_brain.contacts(id) ON DELETE SET NULL,
  kind          equity_brain.crm_activity_kind NOT NULL,
  direction     equity_brain.crm_activity_direction NOT NULL DEFAULT 'out',
  body          text,
  metadata      jsonb DEFAULT '{}'::jsonb,
  created_by    uuid,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_act_entity ON equity_brain.crm_activities(entity_type, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_crm_act_kind   ON equity_brain.crm_activities(kind, created_at DESC);

ALTER TABLE equity_brain.crm_activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS crm_act_admin_advisor_all ON equity_brain.crm_activities;
CREATE POLICY crm_act_admin_advisor_all ON equity_brain.crm_activities
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'advisor'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'advisor'));

-- 5) BUYER PREFERENCES HISTORY
CREATE TABLE IF NOT EXISTS equity_brain.buyer_preferences_history (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id    uuid NOT NULL REFERENCES equity_brain.buyers(id) ON DELETE CASCADE,
  changed_by  uuid,
  changed_at  timestamptz NOT NULL DEFAULT now(),
  diff        jsonb NOT NULL DEFAULT '{}'::jsonb,
  before_snap jsonb,
  after_snap  jsonb
);

CREATE INDEX IF NOT EXISTS idx_bph_buyer_time ON equity_brain.buyer_preferences_history(buyer_id, changed_at DESC);

ALTER TABLE equity_brain.buyer_preferences_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bph_admin_advisor_all ON equity_brain.buyer_preferences_history;
CREATE POLICY bph_admin_advisor_all ON equity_brain.buyer_preferences_history
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'advisor'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'advisor'));

-- 6) updated_at triggers
CREATE OR REPLACE FUNCTION equity_brain.tg_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_mandates_updated ON equity_brain.mandates;
CREATE TRIGGER trg_mandates_updated BEFORE UPDATE ON equity_brain.mandates
  FOR EACH ROW EXECUTE FUNCTION equity_brain.tg_set_updated_at();

DROP TRIGGER IF EXISTS trg_contacts_updated ON equity_brain.contacts;
CREATE TRIGGER trg_contacts_updated BEFORE UPDATE ON equity_brain.contacts
  FOR EACH ROW EXECUTE FUNCTION equity_brain.tg_set_updated_at();

-- 7) ENRICHED VIEWS
CREATE OR REPLACE VIEW public.eb_mandates_enriched
WITH (security_invoker=true) AS
SELECT
  m.id,
  m.company_cnpj,
  m.status,
  m.exclusividade,
  m.data_assinatura,
  m.data_vencimento,
  m.comissao_pct,
  m.valor_pedido,
  m.responsavel_id,
  m.observacoes,
  m.source,
  m.created_at,
  m.updated_at,
  c.razao_social,
  c.nome_fantasia,
  c.uf,
  c.municipio,
  c.setor_ma,
  c.subsetor_ma,
  c.faturamento_estimado,
  c.has_listing,
  c.listing_id,
  CASE c.uf
    WHEN 'SP' THEN 'sudeste' WHEN 'RJ' THEN 'sudeste' WHEN 'MG' THEN 'sudeste' WHEN 'ES' THEN 'sudeste'
    WHEN 'PR' THEN 'sul' WHEN 'SC' THEN 'sul' WHEN 'RS' THEN 'sul'
    WHEN 'GO' THEN 'centro-oeste' WHEN 'MT' THEN 'centro-oeste' WHEN 'MS' THEN 'centro-oeste' WHEN 'DF' THEN 'centro-oeste'
    WHEN 'BA' THEN 'nordeste' WHEN 'PE' THEN 'nordeste' WHEN 'CE' THEN 'nordeste' WHEN 'MA' THEN 'nordeste'
    WHEN 'PB' THEN 'nordeste' WHEN 'RN' THEN 'nordeste' WHEN 'AL' THEN 'nordeste' WHEN 'SE' THEN 'nordeste' WHEN 'PI' THEN 'nordeste'
    WHEN 'AM' THEN 'norte' WHEN 'PA' THEN 'norte' WHEN 'AC' THEN 'norte' WHEN 'RO' THEN 'norte'
    WHEN 'RR' THEN 'norte' WHEN 'AP' THEN 'norte' WHEN 'TO' THEN 'norte'
    ELSE 'outros'
  END AS regiao,
  (SELECT row_to_json(ct.*) FROM equity_brain.contacts ct
     WHERE ct.entity_type='mandate' AND ct.entity_id=m.id AND ct.is_primary=true
     ORDER BY ct.created_at LIMIT 1) AS primary_contact
FROM equity_brain.mandates m
JOIN equity_brain.companies c ON c.cnpj = m.company_cnpj;

GRANT SELECT ON public.eb_mandates_enriched TO authenticated;

CREATE OR REPLACE VIEW public.eb_buyers_enriched
WITH (security_invoker=true) AS
SELECT
  b.*,
  (SELECT row_to_json(ct.*) FROM equity_brain.contacts ct
     WHERE ct.entity_type='buyer' AND ct.entity_id=b.id AND ct.is_primary=true
     ORDER BY ct.created_at LIMIT 1) AS primary_contact,
  (SELECT count(*) FROM equity_brain.matches mt
     WHERE mt.buyer_id=b.id AND mt.is_current=true) AS active_matches_count
FROM equity_brain.buyers b;

GRANT SELECT ON public.eb_buyers_enriched TO authenticated;

CREATE OR REPLACE VIEW public.eb_crm_activities AS
SELECT * FROM equity_brain.crm_activities;
GRANT SELECT, INSERT ON public.eb_crm_activities TO authenticated;

CREATE OR REPLACE VIEW public.eb_contacts AS
SELECT * FROM equity_brain.contacts;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.eb_contacts TO authenticated;

CREATE OR REPLACE VIEW public.eb_mandates AS
SELECT * FROM equity_brain.mandates;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.eb_mandates TO authenticated;

CREATE OR REPLACE VIEW public.eb_buyer_preferences_history AS
SELECT * FROM equity_brain.buyer_preferences_history;
GRANT SELECT ON public.eb_buyer_preferences_history TO authenticated;

-- 8) KPI VIEW
CREATE OR REPLACE VIEW public.eb_crm_kpis
WITH (security_invoker=true) AS
SELECT
  (SELECT count(*) FROM equity_brain.mandates) AS total_mandates,
  (SELECT count(*) FROM equity_brain.buyers WHERE status='ativo') AS total_buyers_active,
  (SELECT count(*) FROM equity_brain.mandates WHERE status='vigente') AS mandates_vigente,
  (SELECT count(*) FROM equity_brain.mandates WHERE status='em_negociacao') AS mandates_em_negociacao,
  (SELECT count(*) FROM equity_brain.mandates WHERE status='vendemos') AS mandates_vendemos,
  (SELECT count(*) FROM equity_brain.mandates WHERE status='cancelado') AS mandates_cancelado,
  (SELECT count(*) FROM equity_brain.mandates WHERE status='vencido') AS mandates_vencido,
  (SELECT coalesce(sum(valor_pedido),0) FROM equity_brain.mandates WHERE status IN ('vigente','em_negociacao','vendemos')) AS valor_total_carteira,
  (SELECT coalesce(sum(valor_pedido*comissao_pct/100),0) FROM equity_brain.mandates WHERE status='vendemos') AS comissao_realizada,
  (SELECT coalesce(avg(valor_pedido),0) FROM equity_brain.mandates WHERE valor_pedido IS NOT NULL) AS ticket_medio;

GRANT SELECT ON public.eb_crm_kpis TO authenticated;

-- 9) TRIGGER de mudança de preferências do buyer + rematch async
CREATE OR REPLACE FUNCTION equity_brain.tg_buyer_pref_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, equity_brain AS $$
DECLARE
  v_diff jsonb := '{}'::jsonb;
  v_changed boolean := false;
  v_summary text := '';
  v_added text;
  v_removed text;
  v_url text;
  v_anon text;
BEGIN
  IF TG_OP <> 'UPDATE' THEN RETURN NEW; END IF;

  -- Detect changes in preference fields
  IF coalesce(OLD.ufs_interesse,'{}') IS DISTINCT FROM coalesce(NEW.ufs_interesse,'{}') THEN
    v_changed := true;
    v_diff := v_diff || jsonb_build_object('ufs_interesse', jsonb_build_object('before', OLD.ufs_interesse, 'after', NEW.ufs_interesse));
    SELECT string_agg(x, ', ') INTO v_added FROM (
      SELECT unnest(NEW.ufs_interesse) EXCEPT SELECT unnest(coalesce(OLD.ufs_interesse,'{}')) ) t(x);
    SELECT string_agg(x, ', ') INTO v_removed FROM (
      SELECT unnest(coalesce(OLD.ufs_interesse,'{}')) EXCEPT SELECT unnest(NEW.ufs_interesse) ) t(x);
    IF v_added   IS NOT NULL AND v_added   <> '' THEN v_summary := v_summary || 'Adicionou UFs: ' || v_added || '. '; END IF;
    IF v_removed IS NOT NULL AND v_removed <> '' THEN v_summary := v_summary || 'Removeu UFs: ' || v_removed || '. '; END IF;
  END IF;

  IF coalesce(OLD.setores_interesse,'{}') IS DISTINCT FROM coalesce(NEW.setores_interesse,'{}') THEN
    v_changed := true;
    v_diff := v_diff || jsonb_build_object('setores_interesse', jsonb_build_object('before', OLD.setores_interesse, 'after', NEW.setores_interesse));
    SELECT string_agg(x, ', ') INTO v_added FROM (
      SELECT unnest(NEW.setores_interesse) EXCEPT SELECT unnest(coalesce(OLD.setores_interesse,'{}')) ) t(x);
    SELECT string_agg(x, ', ') INTO v_removed FROM (
      SELECT unnest(coalesce(OLD.setores_interesse,'{}')) EXCEPT SELECT unnest(NEW.setores_interesse) ) t(x);
    IF v_added   IS NOT NULL AND v_added   <> '' THEN v_summary := v_summary || 'Adicionou setores: ' || v_added || '. '; END IF;
    IF v_removed IS NOT NULL AND v_removed <> '' THEN v_summary := v_summary || 'Removeu setores: ' || v_removed || '. '; END IF;
  END IF;

  IF OLD.ticket_min IS DISTINCT FROM NEW.ticket_min OR OLD.ticket_max IS DISTINCT FROM NEW.ticket_max THEN
    v_changed := true;
    v_diff := v_diff || jsonb_build_object('ticket', jsonb_build_object(
      'before', jsonb_build_object('min', OLD.ticket_min, 'max', OLD.ticket_max),
      'after',  jsonb_build_object('min', NEW.ticket_min, 'max', NEW.ticket_max)));
    v_summary := v_summary || 'Ticket alterado. ';
  END IF;

  IF OLD.vertical_principal IS DISTINCT FROM NEW.vertical_principal THEN
    v_changed := true;
    v_diff := v_diff || jsonb_build_object('vertical_principal', jsonb_build_object('before', OLD.vertical_principal, 'after', NEW.vertical_principal));
    v_summary := v_summary || 'Vertical alterada. ';
  END IF;

  IF OLD.pause_signal IS DISTINCT FROM NEW.pause_signal THEN
    v_changed := true;
    v_diff := v_diff || jsonb_build_object('pause_signal', jsonb_build_object('before', OLD.pause_signal, 'after', NEW.pause_signal));
    v_summary := v_summary || CASE WHEN NEW.pause_signal THEN 'Pausado. ' ELSE 'Reativado. ' END;
  END IF;

  IF NOT v_changed THEN RETURN NEW; END IF;

  -- 1) snapshot histórico
  INSERT INTO equity_brain.buyer_preferences_history(buyer_id, diff, before_snap, after_snap)
  VALUES (NEW.id, v_diff,
    jsonb_build_object(
      'ufs_interesse', OLD.ufs_interesse, 'setores_interesse', OLD.setores_interesse,
      'ticket_min', OLD.ticket_min, 'ticket_max', OLD.ticket_max,
      'vertical_principal', OLD.vertical_principal, 'pause_signal', OLD.pause_signal),
    jsonb_build_object(
      'ufs_interesse', NEW.ufs_interesse, 'setores_interesse', NEW.setores_interesse,
      'ticket_min', NEW.ticket_min, 'ticket_max', NEW.ticket_max,
      'vertical_principal', NEW.vertical_principal, 'pause_signal', NEW.pause_signal));

  -- 2) atividade legível na timeline
  INSERT INTO equity_brain.crm_activities(entity_type, entity_id, kind, direction, body, metadata)
  VALUES ('buyer', NEW.id, 'preference_change', 'system', trim(v_summary), v_diff);

  -- 3) dispara rematch async via pg_net (best-effort, não bloqueia)
  BEGIN
    SELECT decrypted_secret INTO v_url FROM vault.decrypted_secrets WHERE name = 'project_url' LIMIT 1;
    SELECT decrypted_secret INTO v_anon FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1;
    IF v_url IS NOT NULL AND v_anon IS NOT NULL THEN
      PERFORM net.http_post(
        url := v_url || '/functions/v1/rematch-buyer',
        headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||v_anon),
        body := jsonb_build_object('buyer_id', NEW.id)
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN NULL; END;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_buyer_pref_change ON equity_brain.buyers;
CREATE TRIGGER trg_buyer_pref_change AFTER UPDATE ON equity_brain.buyers
  FOR EACH ROW EXECUTE FUNCTION equity_brain.tg_buyer_pref_change();

-- 10) BACKFILL: criar mandates a partir de companies com listing ativo
INSERT INTO equity_brain.mandates(company_cnpj, status, source)
SELECT c.cnpj, 'vigente', 'backfill_marketplace'
FROM equity_brain.companies c
WHERE c.has_listing = true
  AND NOT EXISTS (SELECT 1 FROM equity_brain.mandates m WHERE m.company_cnpj = c.cnpj);

-- 10b) Criar contato primário para cada mandato recém-backfilled, derivado do dono do listing
INSERT INTO equity_brain.contacts(entity_type, entity_id, nome, telefone_e164, email, is_primary, source)
SELECT 'mandate', m.id,
       coalesce(p.full_name, p.company_name, 'Contato Vendedor'),
       p.phone, u.email, true, 'backfill_marketplace'
FROM equity_brain.mandates m
JOIN equity_brain.companies c ON c.cnpj = m.company_cnpj AND c.listing_id IS NOT NULL
JOIN public.listings l ON l.id = c.listing_id
LEFT JOIN public.profiles p ON p.user_id = l.user_id
LEFT JOIN auth.users u ON u.id = l.user_id
WHERE m.source = 'backfill_marketplace'
  AND NOT EXISTS (
    SELECT 1 FROM equity_brain.contacts ct
    WHERE ct.entity_type='mandate' AND ct.entity_id=m.id AND ct.is_primary=true
  );

-- 11) Realtime
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE equity_brain.crm_activities;
EXCEPTION WHEN duplicate_object THEN NULL; WHEN others THEN NULL; END $$;
