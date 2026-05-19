
-- ============================================================
-- BLOCO 1.4 — Documents per stage + templates + signature mock
-- ============================================================

-- 1) doc_templates (catálogo curado)
CREATE TABLE IF NOT EXISTS public.doc_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  label text NOT NULL,
  category text NOT NULL CHECK (category IN ('nda','loi','spa','due_diligence','term_sheet','other')),
  description text,
  storage_path text,
  requires_signature boolean NOT NULL DEFAULT false,
  applies_to_stages text[] NOT NULL DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.doc_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "doc_templates_select_auth" ON public.doc_templates
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "doc_templates_admin_write" ON public.doc_templates
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 2) stage_doc_requirements
CREATE TABLE IF NOT EXISTS public.stage_doc_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_key text NOT NULL,
  template_code text NOT NULL REFERENCES public.doc_templates(code) ON DELETE CASCADE,
  is_required boolean NOT NULL DEFAULT true,
  is_blocking boolean NOT NULL DEFAULT false,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (stage_key, template_code)
);

ALTER TABLE public.stage_doc_requirements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stage_doc_req_select_auth" ON public.stage_doc_requirements
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "stage_doc_req_admin_write" ON public.stage_doc_requirements
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 3) deal_documents (instâncias por deal/mandate)
CREATE TABLE IF NOT EXISTS public.deal_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL,
  stage_key text,
  template_code text REFERENCES public.doc_templates(code) ON DELETE SET NULL,
  label text NOT NULL,
  category text NOT NULL DEFAULT 'other',
  storage_path text,
  uploaded_by uuid,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','pending_signature','signed','archived')),
  signature_provider text,
  signature_request_id text,
  signing_url text,
  signed_at timestamptz,
  signed_by text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deal_documents_deal ON public.deal_documents(deal_id);
CREATE INDEX IF NOT EXISTS idx_deal_documents_deal_stage ON public.deal_documents(deal_id, stage_key);
CREATE INDEX IF NOT EXISTS idx_deal_documents_template ON public.deal_documents(template_code);

ALTER TABLE public.deal_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deal_documents_select" ON public.deal_documents
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(),'admin'::public.app_role)
    OR public.has_role(auth.uid(),'advisor'::public.app_role)
    OR public.has_role(auth.uid(),'legal'::public.app_role)
    OR public.has_role(auth.uid(),'observer'::public.app_role)
  );

CREATE POLICY "deal_documents_write" ON public.deal_documents
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(),'admin'::public.app_role)
    OR public.has_role(auth.uid(),'advisor'::public.app_role)
    OR public.has_role(auth.uid(),'legal'::public.app_role)
  )
  WITH CHECK (
    public.has_role(auth.uid(),'admin'::public.app_role)
    OR public.has_role(auth.uid(),'advisor'::public.app_role)
    OR public.has_role(auth.uid(),'legal'::public.app_role)
  );

CREATE POLICY "deal_documents_service" ON public.deal_documents
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at_deal_documents()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_deal_documents_touch ON public.deal_documents;
CREATE TRIGGER trg_deal_documents_touch BEFORE UPDATE ON public.deal_documents
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at_deal_documents();

-- Audit trigger
CREATE OR REPLACE FUNCTION public.audit_deal_documents()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_event text;
  v_payload jsonb;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_event := 'doc_uploaded';
    v_payload := jsonb_build_object(
      'template_code', NEW.template_code,
      'stage_key', NEW.stage_key,
      'label', NEW.label,
      'category', NEW.category,
      'status', NEW.status
    );
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      IF NEW.status = 'signed' THEN
        v_event := 'doc_signed';
      ELSE
        v_event := 'doc_status_changed';
      END IF;
      v_payload := jsonb_build_object(
        'from_status', OLD.status,
        'to_status', NEW.status,
        'template_code', NEW.template_code,
        'stage_key', NEW.stage_key
      );
    ELSE
      RETURN NEW;
    END IF;
  ELSE
    RETURN NEW;
  END IF;

  BEGIN
    PERFORM public.log_audit_event(
      _deal_id := NEW.deal_id,
      _entity_type := 'document',
      _entity_id := NEW.id,
      _event_type := v_event,
      _payload := v_payload
    );
  EXCEPTION WHEN OTHERS THEN
    -- best effort, do not block writes
    NULL;
  END;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_deal_documents_audit ON public.deal_documents;
CREATE TRIGGER trg_deal_documents_audit
  AFTER INSERT OR UPDATE ON public.deal_documents
  FOR EACH ROW EXECUTE FUNCTION public.audit_deal_documents();

-- 4) view deal_doc_progress
CREATE OR REPLACE VIEW public.deal_doc_progress
WITH (security_invoker = on) AS
SELECT
  dd_join.deal_id,
  r.stage_key,
  COUNT(*) AS required_count,
  COUNT(dd.id) FILTER (WHERE dd.id IS NOT NULL AND dd.status <> 'archived') AS present_count,
  COUNT(*) FILTER (
    WHERE r.is_blocking
      AND NOT EXISTS (
        SELECT 1 FROM public.deal_documents x
        WHERE x.deal_id = dd_join.deal_id
          AND x.template_code = r.template_code
          AND x.status IN ('signed','pending_signature','draft')
      )
  ) AS pending_blocking
FROM public.stage_doc_requirements r
CROSS JOIN (SELECT DISTINCT deal_id FROM public.deal_documents
            UNION
            SELECT id AS deal_id FROM equity_brain.mandates) dd_join
LEFT JOIN public.deal_documents dd
  ON dd.deal_id = dd_join.deal_id
 AND dd.template_code = r.template_code
 AND dd.status <> 'archived'
WHERE r.is_required
GROUP BY dd_join.deal_id, r.stage_key;

GRANT SELECT ON public.deal_doc_progress TO authenticated;

-- 5) can_advance_stage — agora também checa docs blocking
CREATE OR REPLACE FUNCTION public.can_advance_stage(_deal_id uuid, _from_stage text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pending_tasks int;
  v_pending_docs int;
BEGIN
  IF _deal_id IS NULL OR _from_stage IS NULL THEN
    RETURN true;
  END IF;

  SELECT COUNT(*)
    INTO v_pending_tasks
  FROM public.stage_tasks
  WHERE deal_id = _deal_id
    AND stage_key = _from_stage
    AND is_blocking = true
    AND status = 'pending';

  SELECT COUNT(*)
    INTO v_pending_docs
  FROM public.stage_doc_requirements r
  WHERE r.stage_key = _from_stage
    AND r.is_blocking = true
    AND NOT EXISTS (
      SELECT 1 FROM public.deal_documents d
      WHERE d.deal_id = _deal_id
        AND d.template_code = r.template_code
        AND d.status IN ('signed','pending_signature','draft')
    );

  RETURN (v_pending_tasks = 0 AND v_pending_docs = 0);
END $$;

GRANT EXECUTE ON FUNCTION public.can_advance_stage(uuid, text) TO authenticated;

-- 6) Storage buckets (privados)
INSERT INTO storage.buckets (id, name, public) VALUES ('deal-documents','deal-documents', false)
ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('doc-templates','doc-templates', false)
ON CONFLICT (id) DO NOTHING;

-- deal-documents storage policies
CREATE POLICY "deal_docs_storage_read"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'deal-documents'
    AND (
      public.has_role(auth.uid(),'admin'::public.app_role)
      OR public.has_role(auth.uid(),'advisor'::public.app_role)
      OR public.has_role(auth.uid(),'legal'::public.app_role)
      OR public.has_role(auth.uid(),'observer'::public.app_role)
    )
  );

CREATE POLICY "deal_docs_storage_write"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'deal-documents'
    AND (
      public.has_role(auth.uid(),'admin'::public.app_role)
      OR public.has_role(auth.uid(),'advisor'::public.app_role)
      OR public.has_role(auth.uid(),'legal'::public.app_role)
    )
  );

CREATE POLICY "deal_docs_storage_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'deal-documents'
    AND (
      public.has_role(auth.uid(),'admin'::public.app_role)
      OR public.has_role(auth.uid(),'advisor'::public.app_role)
      OR public.has_role(auth.uid(),'legal'::public.app_role)
    )
  );

CREATE POLICY "deal_docs_storage_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'deal-documents'
    AND public.has_role(auth.uid(),'admin'::public.app_role)
  );

-- doc-templates storage policies
CREATE POLICY "doc_templates_storage_read"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'doc-templates');

CREATE POLICY "doc_templates_storage_admin"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'doc-templates' AND public.has_role(auth.uid(),'admin'::public.app_role))
  WITH CHECK (bucket_id = 'doc-templates' AND public.has_role(auth.uid(),'admin'::public.app_role));

-- 7) Seed catálogo
INSERT INTO public.doc_templates (code,label,category,description,requires_signature,applies_to_stages) VALUES
  ('nda_mutuo','NDA Mútuo','nda','Acordo de confidencialidade mútua entre vendedor e comprador',true, ARRAY['prospeccao','qualificacao']),
  ('term_sheet_v1','Term Sheet','term_sheet','Termo de intenção comercial preliminar',false, ARRAY['negociacao']),
  ('loi_v1','LOI — Letter of Intent','loi','Carta de intenções vinculante de oferta',true, ARRAY['negociacao']),
  ('dd_checklist','Checklist Due Diligence','due_diligence','Lista mestre de itens a serem auditados na DD',false, ARRAY['due_diligence']),
  ('spa_template','SPA — Contrato de Compra e Venda','spa','Sale & Purchase Agreement padrão',true, ARRAY['fechamento'])
ON CONFLICT (code) DO NOTHING;

-- 8) Seed requirements por etapa (blocking nos críticos)
INSERT INTO public.stage_doc_requirements (stage_key, template_code, is_required, is_blocking, position) VALUES
  ('prospeccao','nda_mutuo', true, false, 1),
  ('qualificacao','nda_mutuo', true, true, 1),
  ('negociacao','term_sheet_v1', true, false, 1),
  ('negociacao','loi_v1', true, true, 2),
  ('due_diligence','dd_checklist', true, false, 1),
  ('fechamento','spa_template', true, true, 1)
ON CONFLICT (stage_key, template_code) DO NOTHING;
