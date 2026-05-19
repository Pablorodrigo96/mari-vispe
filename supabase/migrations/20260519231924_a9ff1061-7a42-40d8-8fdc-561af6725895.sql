
-- 1) Estender doc_templates
ALTER TABLE public.doc_templates
  ADD COLUMN IF NOT EXISTS template_body text,
  ADD COLUMN IF NOT EXISTS customizable_fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS static_clauses jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS ai_instructions text,
  ADD COLUMN IF NOT EXISTS parts jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS preferred_model text DEFAULT 'claude-sonnet-4-5';

-- Expandir o constraint de category
ALTER TABLE public.doc_templates DROP CONSTRAINT IF EXISTS doc_templates_category_check;
ALTER TABLE public.doc_templates
  ADD CONSTRAINT doc_templates_category_check
  CHECK (category = ANY (ARRAY['nda','nbo','loi','spa','due_diligence','term_sheet','legal','other']));

-- 2) Estender deal_documents
ALTER TABLE public.deal_documents
  ADD COLUMN IF NOT EXISTS generated_body text,
  ADD COLUMN IF NOT EXISTS custom_fields_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS version_number int NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS parent_version_id uuid REFERENCES public.deal_documents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS requires_partner_approval boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS partner_approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS partner_approved_by uuid,
  ADD COLUMN IF NOT EXISTS partner_comments text,
  ADD COLUMN IF NOT EXISTS homologation_status text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS ai_provider text,
  ADD COLUMN IF NOT EXISTS ai_model text,
  ADD COLUMN IF NOT EXISTS ai_fallback_used boolean NOT NULL DEFAULT false;

ALTER TABLE public.deal_documents DROP CONSTRAINT IF EXISTS deal_documents_homologation_status_chk;
ALTER TABLE public.deal_documents
  ADD CONSTRAINT deal_documents_homologation_status_chk
  CHECK (homologation_status IN ('none','pending','approved','rejected','changes_requested'));

CREATE INDEX IF NOT EXISTS idx_deal_documents_parent_version ON public.deal_documents(parent_version_id);
CREATE INDEX IF NOT EXISTS idx_deal_documents_deal_template ON public.deal_documents(deal_id, template_code, version_number DESC);

-- 3) legal_homologations
CREATE TABLE IF NOT EXISTS public.legal_homologations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.deal_documents(id) ON DELETE CASCADE,
  lawyer_name text NOT NULL,
  lawyer_email text NOT NULL,
  access_token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  sent_by uuid,
  sent_at timestamptz NOT NULL DEFAULT now(),
  viewed_at timestamptz,
  decision text,
  comments text,
  decided_at timestamptz,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT legal_homologations_decision_chk
    CHECK (decision IS NULL OR decision IN ('approved','rejected','changes_requested'))
);
CREATE INDEX IF NOT EXISTS idx_legal_homologations_document ON public.legal_homologations(document_id);
CREATE INDEX IF NOT EXISTS idx_legal_homologations_token ON public.legal_homologations(access_token);

ALTER TABLE public.legal_homologations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS legal_homologations_select_staff ON public.legal_homologations;
CREATE POLICY legal_homologations_select_staff ON public.legal_homologations
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'advisor'::app_role)
         OR has_role(auth.uid(),'legal'::app_role) OR has_role(auth.uid(),'observer'::app_role));

DROP POLICY IF EXISTS legal_homologations_insert_staff ON public.legal_homologations;
CREATE POLICY legal_homologations_insert_staff ON public.legal_homologations
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'advisor'::app_role)
              OR has_role(auth.uid(),'legal'::app_role));

DROP POLICY IF EXISTS legal_homologations_update_staff ON public.legal_homologations;
CREATE POLICY legal_homologations_update_staff ON public.legal_homologations
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'advisor'::app_role)
         OR has_role(auth.uid(),'legal'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'advisor'::app_role)
              OR has_role(auth.uid(),'legal'::app_role));

DROP POLICY IF EXISTS legal_homologations_service ON public.legal_homologations;
CREATE POLICY legal_homologations_service ON public.legal_homologations
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 4) internal_signatures
CREATE TABLE IF NOT EXISTS public.internal_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.deal_documents(id) ON DELETE CASCADE,
  signer_user_id uuid,
  signer_email text NOT NULL,
  signer_name text NOT NULL,
  signer_role text NOT NULL,
  sign_token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  requested_by uuid,
  requested_at timestamptz NOT NULL DEFAULT now(),
  viewed_at timestamptz,
  signed_at timestamptz,
  ip inet,
  user_agent text,
  signature_hash text,
  signature_image_path text,
  final_pdf_path text,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT internal_signatures_role_chk
    CHECK (signer_role IN ('seller','buyer','witness','advisor','legal','admin','partner'))
);
CREATE INDEX IF NOT EXISTS idx_internal_signatures_document ON public.internal_signatures(document_id);
CREATE INDEX IF NOT EXISTS idx_internal_signatures_token ON public.internal_signatures(sign_token);
CREATE INDEX IF NOT EXISTS idx_internal_signatures_user ON public.internal_signatures(signer_user_id);

ALTER TABLE public.internal_signatures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS internal_signatures_select_staff ON public.internal_signatures;
CREATE POLICY internal_signatures_select_staff ON public.internal_signatures
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'advisor'::app_role)
         OR has_role(auth.uid(),'legal'::app_role) OR has_role(auth.uid(),'observer'::app_role)
         OR signer_user_id = auth.uid());

DROP POLICY IF EXISTS internal_signatures_insert_staff ON public.internal_signatures;
CREATE POLICY internal_signatures_insert_staff ON public.internal_signatures
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'advisor'::app_role)
              OR has_role(auth.uid(),'legal'::app_role));

DROP POLICY IF EXISTS internal_signatures_update_staff ON public.internal_signatures;
CREATE POLICY internal_signatures_update_staff ON public.internal_signatures
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'advisor'::app_role)
         OR has_role(auth.uid(),'legal'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'advisor'::app_role)
              OR has_role(auth.uid(),'legal'::app_role));

DROP POLICY IF EXISTS internal_signatures_service ON public.internal_signatures;
CREATE POLICY internal_signatures_service ON public.internal_signatures
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 5) Bucket privado
INSERT INTO storage.buckets (id, name, public)
VALUES ('legal-signatures','legal-signatures', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS legal_sig_storage_select_staff ON storage.objects;
CREATE POLICY legal_sig_storage_select_staff ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'legal-signatures' AND (
    has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'advisor'::app_role)
    OR has_role(auth.uid(),'legal'::app_role) OR has_role(auth.uid(),'observer'::app_role)
  ));

DROP POLICY IF EXISTS legal_sig_storage_write_service ON storage.objects;
CREATE POLICY legal_sig_storage_write_service ON storage.objects
  FOR INSERT TO service_role WITH CHECK (bucket_id = 'legal-signatures');

DROP POLICY IF EXISTS legal_sig_storage_update_service ON storage.objects;
CREATE POLICY legal_sig_storage_update_service ON storage.objects
  FOR UPDATE TO service_role USING (bucket_id = 'legal-signatures') WITH CHECK (bucket_id = 'legal-signatures');

DROP POLICY IF EXISTS legal_sig_storage_delete_admin ON storage.objects;
CREATE POLICY legal_sig_storage_delete_admin ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'legal-signatures' AND has_role(auth.uid(),'admin'::app_role));

-- 6) RPCs públicas via token
CREATE OR REPLACE FUNCTION public.homologation_get_by_token(p_token uuid)
RETURNS TABLE (
  id uuid, document_id uuid, lawyer_name text, lawyer_email text,
  decision text, comments text, decided_at timestamptz, expires_at timestamptz,
  document_body text, document_label text, document_template_code text, document_version int
)
LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public
AS $$
  SELECT h.id, h.document_id, h.lawyer_name, h.lawyer_email,
         h.decision, h.comments, h.decided_at, h.expires_at,
         d.generated_body, d.label, d.template_code, d.version_number
  FROM public.legal_homologations h
  JOIN public.deal_documents d ON d.id = h.document_id
  WHERE h.access_token = p_token AND h.expires_at > now();
$$;

CREATE OR REPLACE FUNCTION public.homologation_mark_viewed(p_token uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  UPDATE public.legal_homologations
  SET viewed_at = COALESCE(viewed_at, now())
  WHERE access_token = p_token AND expires_at > now();
$$;

CREATE OR REPLACE FUNCTION public.homologation_decide(
  p_token uuid, p_decision text, p_comments text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_id uuid; v_doc_id uuid;
BEGIN
  IF p_decision NOT IN ('approved','rejected','changes_requested') THEN
    RAISE EXCEPTION 'Decisão inválida';
  END IF;

  UPDATE public.legal_homologations
  SET decision = p_decision, comments = p_comments, decided_at = now()
  WHERE access_token = p_token AND expires_at > now() AND decision IS NULL
  RETURNING id, document_id INTO v_id, v_doc_id;

  IF v_id IS NULL THEN
    RAISE EXCEPTION 'Homologação não encontrada, expirada ou já decidida';
  END IF;

  UPDATE public.deal_documents
  SET homologation_status = p_decision, updated_at = now()
  WHERE id = v_doc_id;

  INSERT INTO public.audit_events (event_type, entity_type, entity_id, payload)
  VALUES ('legal_homologation_decided','legal_document', v_doc_id,
          jsonb_build_object('homologation_id', v_id, 'decision', p_decision));

  RETURN jsonb_build_object('id', v_id, 'document_id', v_doc_id, 'decision', p_decision);
END;
$$;

CREATE OR REPLACE FUNCTION public.signature_get_by_token(p_token uuid)
RETURNS TABLE (
  id uuid, document_id uuid, signer_name text, signer_email text, signer_role text,
  signed_at timestamptz, expires_at timestamptz,
  document_body text, document_label text, document_template_code text, document_version int
) LANGUAGE sql SECURITY DEFINER STABLE SET search_path = public
AS $$
  SELECT s.id, s.document_id, s.signer_name, s.signer_email, s.signer_role,
         s.signed_at, s.expires_at,
         d.generated_body, d.label, d.template_code, d.version_number
  FROM public.internal_signatures s
  JOIN public.deal_documents d ON d.id = s.document_id
  WHERE s.sign_token = p_token AND s.expires_at > now();
$$;

CREATE OR REPLACE FUNCTION public.signature_mark_viewed(p_token uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public
AS $$
  UPDATE public.internal_signatures
  SET viewed_at = COALESCE(viewed_at, now())
  WHERE sign_token = p_token AND expires_at > now();
$$;

CREATE OR REPLACE FUNCTION public.signature_sign(
  p_token uuid, p_signature_hash text, p_signature_image_path text,
  p_ip inet, p_user_agent text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_id uuid; v_doc_id uuid; v_remaining int;
BEGIN
  UPDATE public.internal_signatures
  SET signed_at = now(), signature_hash = p_signature_hash,
      signature_image_path = p_signature_image_path, ip = p_ip, user_agent = p_user_agent
  WHERE sign_token = p_token AND expires_at > now() AND signed_at IS NULL
  RETURNING id, document_id INTO v_id, v_doc_id;

  IF v_id IS NULL THEN
    RAISE EXCEPTION 'Assinatura não encontrada, expirada ou já realizada';
  END IF;

  SELECT count(*) INTO v_remaining
  FROM public.internal_signatures
  WHERE document_id = v_doc_id AND signed_at IS NULL;

  IF v_remaining = 0 THEN
    UPDATE public.deal_documents
    SET status = 'signed', signed_at = now(), updated_at = now()
    WHERE id = v_doc_id;
  END IF;

  INSERT INTO public.audit_events (event_type, entity_type, entity_id, payload)
  VALUES ('legal_signature_signed','legal_document', v_doc_id,
          jsonb_build_object('signature_id', v_id, 'remaining', v_remaining));

  RETURN jsonb_build_object('id', v_id, 'document_id', v_doc_id, 'remaining', v_remaining);
END;
$$;

-- 7) Seeds templates
INSERT INTO public.doc_templates (
  code, label, category, description, applies_to_stages,
  requires_signature, is_active, ai_instructions,
  customizable_fields, static_clauses, template_body, preferred_model
) VALUES
('legal_nda_v1','NDA — Acordo de Confidencialidade','nda',
 'Modelo Vispe de NDA bilateral para fase inicial de negociação M&A.',
 ARRAY['teaser','round1']::text[], true, true,
 'Você é um advogado sênior brasileiro especialista em M&A. Gere um NDA bilateral em português jurídico formal. Substitua APENAS os placeholders {{...}}. Não altere cláusulas fixas. Cite LGPD quando aplicável.',
 '[
   {"key":"parte_a_nome","label":"Parte A — Razão Social","type":"text","required":true},
   {"key":"parte_a_cnpj","label":"Parte A — CNPJ","type":"cnpj","required":true},
   {"key":"parte_a_endereco","label":"Parte A — Endereço","type":"text","required":true},
   {"key":"parte_b_nome","label":"Parte B — Razão Social","type":"text","required":true},
   {"key":"parte_b_cnpj","label":"Parte B — CNPJ","type":"cnpj","required":true},
   {"key":"parte_b_endereco","label":"Parte B — Endereço","type":"text","required":true},
   {"key":"objeto","label":"Objeto da operação","type":"textarea","required":true},
   {"key":"vigencia_anos","label":"Vigência (anos)","type":"number","required":true,"default":3},
   {"key":"foro","label":"Foro de eleição","type":"text","required":true,"default":"São Paulo/SP"}
 ]'::jsonb,
 '[
   {"id":"confidencialidade","title":"Da Confidencialidade","mandatory":true},
   {"id":"lgpd","title":"Da Lei Geral de Proteção de Dados","mandatory":true},
   {"id":"penalidades","title":"Das Penalidades por Descumprimento","mandatory":true},
   {"id":"foro","title":"Do Foro de Eleição","mandatory":true}
 ]'::jsonb,
 E'# ACORDO DE CONFIDENCIALIDADE — NDA\n\n**[PLACEHOLDER OFICIAL VISPE — substituir pelo texto enviado pelo cliente]**\n\nPelo presente instrumento particular, as partes:\n\n**PARTE A:** {{parte_a_nome}}, CNPJ {{parte_a_cnpj}}, com sede em {{parte_a_endereco}};\n\n**PARTE B:** {{parte_b_nome}}, CNPJ {{parte_b_cnpj}}, com sede em {{parte_b_endereco}};\n\nResolvem celebrar o presente Acordo de Confidencialidade, mediante as cláusulas e condições a seguir.\n\n## CLÁUSULA 1ª — DO OBJETO\n\nO presente acordo tem por objeto: {{objeto}}.\n\n## CLÁUSULA 2ª — DA VIGÊNCIA\n\nO presente acordo vigorará pelo prazo de {{vigencia_anos}} anos, contados de sua assinatura.\n\n## CLÁUSULA 3ª — DA CONFIDENCIALIDADE\n\n[CLÁUSULA FIXA — TEXTO OFICIAL VISPE]\n\n## CLÁUSULA 4ª — DA LGPD\n\n[CLÁUSULA FIXA — TEXTO OFICIAL VISPE]\n\n## CLÁUSULA 5ª — DAS PENALIDADES\n\n[CLÁUSULA FIXA — TEXTO OFICIAL VISPE]\n\n## CLÁUSULA 6ª — DO FORO\n\nFica eleito o foro da Comarca de {{foro}}.\n\nE por estarem assim justas e contratadas, firmam o presente instrumento.',
 'claude-sonnet-4-5'),
('legal_nbo_v1','NBO — Carta de Intenções','nbo',
 'Modelo Vispe de carta de intenções não-vinculante para oferta inicial.',
 ARRAY['round1','round2']::text[], true, true,
 'Você é um advogado sênior brasileiro especialista em M&A. Gere uma NBO em português jurídico formal, deixando explícito o caráter NÃO-VINCULANTE exceto exclusividade/confidencialidade/despesas. Valores em R$ formatados.',
 '[
   {"key":"comprador_nome","label":"Comprador — Razão Social","type":"text","required":true},
   {"key":"comprador_cnpj","label":"Comprador — CNPJ","type":"cnpj","required":true},
   {"key":"vendedor_nome","label":"Vendedor — Razão Social","type":"text","required":true},
   {"key":"vendedor_cnpj","label":"Vendedor — CNPJ","type":"cnpj","required":true},
   {"key":"empresa_alvo","label":"Empresa-alvo","type":"text","required":true},
   {"key":"valor_oferta","label":"Valor da oferta (R$)","type":"currency","required":true},
   {"key":"forma_pagamento","label":"Forma de pagamento","type":"textarea","required":true},
   {"key":"prazo_due_diligence_dias","label":"Prazo de Due Diligence (dias)","type":"number","required":true,"default":60},
   {"key":"prazo_exclusividade_dias","label":"Prazo de exclusividade (dias)","type":"number","required":true,"default":90},
   {"key":"condicoes_suspensivas","label":"Condições suspensivas","type":"textarea","required":false}
 ]'::jsonb,
 '[
   {"id":"nao_vinculante","title":"Do caráter não-vinculante","mandatory":true},
   {"id":"exclusividade","title":"Da exclusividade (vinculante)","mandatory":true},
   {"id":"confidencialidade","title":"Da confidencialidade (vinculante)","mandatory":true},
   {"id":"despesas","title":"Das despesas (vinculante)","mandatory":true}
 ]'::jsonb,
 E'# CARTA DE INTENÇÕES — NON-BINDING OFFER\n\n**[PLACEHOLDER OFICIAL VISPE — substituir pelo texto enviado pelo cliente]**\n\n{{comprador_nome}}, CNPJ {{comprador_cnpj}}, vem por meio desta apresentar a {{vendedor_nome}}, CNPJ {{vendedor_cnpj}}, sua manifestação de interesse na aquisição de {{empresa_alvo}}.\n\n## 1. PROPOSTA\n\nValor: {{valor_oferta}}\n\nForma de pagamento: {{forma_pagamento}}\n\n## 2. DUE DILIGENCE\n\nPrazo: {{prazo_due_diligence_dias}} dias corridos.\n\n## 3. CONDIÇÕES SUSPENSIVAS\n\n{{condicoes_suspensivas}}\n\n## 4. EXCLUSIVIDADE (VINCULANTE)\n\nPrazo: {{prazo_exclusividade_dias}} dias corridos.\n\n## 5. CARÁTER NÃO-VINCULANTE\n\n[CLÁUSULA FIXA — TEXTO OFICIAL VISPE]\n\n## 6. CONFIDENCIALIDADE\n\n[CLÁUSULA FIXA — TEXTO OFICIAL VISPE]\n\n## 7. DESPESAS\n\n[CLÁUSULA FIXA — TEXTO OFICIAL VISPE]',
 'claude-sonnet-4-5')
ON CONFLICT (code) DO NOTHING;

-- 8) Pricing Anthropic
INSERT INTO public.api_pricing (provider, model, input_per_1m_usd, output_per_1m_usd, currency, category, notes)
SELECT 'anthropic','claude-sonnet-4-5', 3.00, 15.00, 'USD','llm','Claude Sonnet 4.5'
WHERE NOT EXISTS (SELECT 1 FROM public.api_pricing WHERE provider='anthropic' AND model='claude-sonnet-4-5');

INSERT INTO public.api_pricing (provider, model, input_per_1m_usd, output_per_1m_usd, currency, category, notes)
SELECT 'anthropic','claude-opus-4-1', 15.00, 75.00, 'USD','llm','Claude Opus 4.1'
WHERE NOT EXISTS (SELECT 1 FROM public.api_pricing WHERE provider='anthropic' AND model='claude-opus-4-1');
