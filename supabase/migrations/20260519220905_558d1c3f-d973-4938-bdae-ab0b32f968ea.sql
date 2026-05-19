
-- 1) Catálogo
CREATE TABLE IF NOT EXISTS public.stage_task_templates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  stage_key text NOT NULL,
  code text NOT NULL UNIQUE,
  label text NOT NULL,
  description text,
  is_required boolean NOT NULL DEFAULT true,
  is_blocking boolean NOT NULL DEFAULT true,
  position integer NOT NULL DEFAULT 0,
  applies_to text NOT NULL DEFAULT 'all',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_stage_task_tpl_stage ON public.stage_task_templates(stage_key, position) WHERE is_active;

ALTER TABLE public.stage_task_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tpl_select_auth" ON public.stage_task_templates;
CREATE POLICY "tpl_select_auth" ON public.stage_task_templates FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "tpl_admin_write" ON public.stage_task_templates;
CREATE POLICY "tpl_admin_write" ON public.stage_task_templates FOR ALL TO authenticated
USING (has_role(auth.uid(),'admin'::app_role)) WITH CHECK (has_role(auth.uid(),'admin'::app_role));

-- 2) Instâncias
CREATE TABLE IF NOT EXISTS public.stage_tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  deal_id uuid NOT NULL,
  stage_key text NOT NULL,
  template_code text NOT NULL,
  label text NOT NULL,
  is_required boolean NOT NULL DEFAULT true,
  is_blocking boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'pending',
  done_at timestamptz,
  done_by uuid,
  due_at timestamptz,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT stage_tasks_status_chk CHECK (status IN ('pending','done','skipped','na')),
  CONSTRAINT stage_tasks_deal_tpl_unique UNIQUE (deal_id, template_code)
);
CREATE INDEX IF NOT EXISTS idx_stage_tasks_deal_stage ON public.stage_tasks(deal_id, stage_key, status);

ALTER TABLE public.stage_tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "stage_tasks_select" ON public.stage_tasks;
CREATE POLICY "stage_tasks_select" ON public.stage_tasks FOR SELECT TO authenticated
USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'advisor'::app_role) OR has_role(auth.uid(),'legal'::app_role) OR has_role(auth.uid(),'observer'::app_role));
DROP POLICY IF EXISTS "stage_tasks_update" ON public.stage_tasks;
CREATE POLICY "stage_tasks_update" ON public.stage_tasks FOR UPDATE TO authenticated
USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'advisor'::app_role) OR has_role(auth.uid(),'legal'::app_role));
DROP POLICY IF EXISTS "stage_tasks_insert" ON public.stage_tasks;
CREATE POLICY "stage_tasks_insert" ON public.stage_tasks FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'advisor'::app_role));

CREATE OR REPLACE FUNCTION public.stage_tasks_touch()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS trg_stage_tasks_touch ON public.stage_tasks;
CREATE TRIGGER trg_stage_tasks_touch BEFORE UPDATE ON public.stage_tasks
FOR EACH ROW EXECUTE FUNCTION public.stage_tasks_touch();

-- 3) Instanciação
CREATE OR REPLACE FUNCTION public.instantiate_stage_tasks(_deal_id uuid, _stage_key text)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _count int := 0;
BEGIN
  INSERT INTO public.stage_tasks (deal_id, stage_key, template_code, label, is_required, is_blocking)
  SELECT _deal_id, t.stage_key, t.code, t.label, t.is_required, t.is_blocking
  FROM public.stage_task_templates t
  WHERE t.stage_key = _stage_key AND t.is_active
  ON CONFLICT (deal_id, template_code) DO NOTHING;
  GET DIAGNOSTICS _count = ROW_COUNT;
  RETURN _count;
END; $$;

-- 4) Trigger na TABELA BASE equity_brain.mandates
CREATE OR REPLACE FUNCTION public.eb_mandates_stage_tasks_trg()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.instantiate_stage_tasks(NEW.id, COALESCE(NEW.pipeline_stage::text, 'prospeccao'));
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.pipeline_stage IS DISTINCT FROM OLD.pipeline_stage THEN
      PERFORM public.instantiate_stage_tasks(NEW.id, NEW.pipeline_stage::text);
    END IF;
  END IF;
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS trg_eb_mandates_stage_tasks ON equity_brain.mandates;
CREATE TRIGGER trg_eb_mandates_stage_tasks
AFTER INSERT OR UPDATE OF pipeline_stage ON equity_brain.mandates
FOR EACH ROW EXECUTE FUNCTION public.eb_mandates_stage_tasks_trg();

-- 5) can_advance_stage
CREATE OR REPLACE FUNCTION public.can_advance_stage(_deal_id uuid, _from_stage text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT NOT EXISTS (
    SELECT 1 FROM public.stage_tasks
    WHERE deal_id = _deal_id AND stage_key = _from_stage AND is_blocking = true AND status = 'pending'
  );
$$;
GRANT EXECUTE ON FUNCTION public.can_advance_stage(uuid, text) TO authenticated;

-- 6) View progresso
DROP VIEW IF EXISTS public.deal_stage_progress;
CREATE VIEW public.deal_stage_progress WITH (security_invoker = on) AS
SELECT
  deal_id, stage_key,
  COUNT(*)::int AS total,
  COUNT(*) FILTER (WHERE status = 'done')::int AS done,
  COUNT(*) FILTER (WHERE status = 'pending' AND is_blocking)::int AS pending_blocking,
  ROUND(100.0 * COUNT(*) FILTER (WHERE status IN ('done','skipped','na'))::numeric / NULLIF(COUNT(*),0), 0)::int AS pct_done
FROM public.stage_tasks GROUP BY deal_id, stage_key;
GRANT SELECT ON public.deal_stage_progress TO authenticated;

-- 7) Update audit_events RLS para legal/observer
DROP POLICY IF EXISTS "audit_events_select" ON public.audit_events;
CREATE POLICY "audit_events_select" ON public.audit_events FOR SELECT TO authenticated
USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'advisor'::app_role) OR has_role(auth.uid(),'legal'::app_role) OR has_role(auth.uid(),'observer'::app_role) OR actor_user_id = auth.uid());

-- 8) Seed templates
INSERT INTO public.stage_task_templates (stage_key, code, label, description, is_blocking, position) VALUES
('prospeccao','prosp_contact_made','Primeiro contato realizado','Conversa inicial com decisor',true,1),
('prospeccao','prosp_fit_qualified','Fit qualificado','Validar setor/porte/intenção',true,2),
('prospeccao','prosp_nda_proposed','NDA inicial enviado',null,false,3),
('mandato','mand_terms_aligned','Termos comerciais alinhados',null,true,1),
('mandato','mand_signed','Mandato assinado','Contrato de assessoria assinado',true,2),
('mandato','mand_kickoff','Kickoff agendado',null,false,3),
('qna_prelim','qnap_data_request','Lista de dados enviada',null,true,1),
('qna_prelim','qnap_received','Dados recebidos do vendedor',null,true,2),
('qna_prelim','qnap_validated','Dados validados pelo advisor',null,true,3),
('teaser','teaser_drafted','Teaser elaborado',null,true,1),
('teaser','teaser_seller_approved','Teaser aprovado pelo vendedor',null,true,2),
('teaser','teaser_published','Teaser publicado/distribuído',null,false,3),
('roadshow','rs_buyer_list','Long-list de buyers definida',null,true,1),
('roadshow','rs_outreach_started','Outreach iniciado',null,true,2),
('roadshow','rs_meetings_scheduled','Reuniões agendadas',null,false,3),
('match','match_buyer_identified','Buyer compatível identificado',null,true,1),
('match','match_intro_made','Apresentação realizada',null,true,2),
('match','match_interest_confirmed','Interesse confirmado',null,false,3),
('nda','nda_template_sent','Template NDA enviado',null,true,1),
('nda','nda_signed','NDA assinado pelo buyer',null,true,2),
('nda','nda_identity_disclosed','Identidade revelada',null,false,3),
('qna','qna_dataroom_opened','Dataroom liberado',null,true,1),
('qna','qna_questions_answered','Q&A respondido',null,true,2),
('qna','qna_buyer_aligned','Buyer alinhado para próxima fase',null,false,3),
('nbo','nbo_received','NBO recebida',null,true,1),
('nbo','nbo_reviewed','NBO revisada com vendedor',null,true,2),
('nbo','nbo_response_sent','Resposta enviada ao buyer',null,false,3),
('due_diligence','dd_checklist_sent','Checklist DD enviado',null,true,1),
('due_diligence','dd_docs_uploaded','Documentos carregados',null,true,2),
('due_diligence','dd_findings_addressed','Findings tratados',null,true,3),
('negociacoes','neg_term_sheet','Term sheet acordado',null,true,1),
('negociacoes','neg_issues_resolved','Issues resolvidas',null,true,2),
('negociacoes','neg_lawyers_aligned','Jurídicos alinhados',null,false,3),
('spa','spa_drafted','Minuta SPA pronta',null,true,1),
('spa','spa_negotiated','SPA negociado',null,true,2),
('spa','spa_signed','SPA assinado',null,true,3),
('closing','clo_conditions_met','Conditions precedent atendidas',null,true,1),
('closing','clo_funds_flow','Funds flow confirmado',null,true,2),
('closing','clo_closing_executed','Closing executado',null,true,3),
('closed','closd_post_closing','Pós-closing concluído',null,false,1),
('closed','closd_invoice_issued','Success fee faturado',null,true,2)
ON CONFLICT (code) DO NOTHING;

-- 9) Backfill
DO $$ DECLARE r record;
BEGIN
  FOR r IN SELECT id, COALESCE(pipeline_stage::text,'prospeccao') AS stage FROM equity_brain.mandates LOOP
    PERFORM public.instantiate_stage_tasks(r.id, r.stage);
  END LOOP;
END $$;
