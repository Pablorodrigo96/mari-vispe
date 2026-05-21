
-- ============ letter_templates ============
CREATE TABLE public.letter_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subject TEXT NOT NULL DEFAULT 'Lote de cartas para impressão',
  body_html TEXT NOT NULL,
  signature_html TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.letter_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth_read_letter_templates"
  ON public.letter_templates FOR SELECT
  TO authenticated USING (is_active = true OR has_role(auth.uid(), 'admin'));

CREATE POLICY "admin_write_letter_templates"
  ON public.letter_templates FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE TRIGGER tr_letter_templates_updated_at
  BEFORE UPDATE ON public.letter_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Ensure only one default template
CREATE UNIQUE INDEX letter_templates_one_default
  ON public.letter_templates (is_default)
  WHERE is_default = true;

-- ============ letter_batches ============
CREATE TABLE public.letter_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advisor_id UUID NOT NULL,
  template_id UUID REFERENCES public.letter_templates(id) ON DELETE SET NULL,
  total_contacts INT NOT NULL DEFAULT 0,
  pdf_storage_path TEXT,
  csv_storage_path TEXT,
  status TEXT NOT NULL DEFAULT 'generating'
    CHECK (status IN ('generating','sent','failed')),
  grafica_email TEXT,
  email_message_id TEXT,
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.letter_batches ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_letter_batches_advisor ON public.letter_batches(advisor_id, created_at DESC);

CREATE POLICY "advisor_read_own_batches"
  ON public.letter_batches FOR SELECT
  TO authenticated
  USING (advisor_id = auth.uid() OR has_role(auth.uid(), 'admin'));

CREATE POLICY "advisor_insert_own_batches"
  ON public.letter_batches FOR INSERT
  TO authenticated
  WITH CHECK (
    advisor_id = auth.uid()
    AND (has_role(auth.uid(), 'advisor') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'franchisee'))
  );

CREATE POLICY "advisor_update_own_batches"
  ON public.letter_batches FOR UPDATE
  TO authenticated
  USING (advisor_id = auth.uid() OR has_role(auth.uid(), 'admin'));

CREATE TRIGGER tr_letter_batches_updated_at
  BEFORE UPDATE ON public.letter_batches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ letter_batch_items ============
CREATE TABLE public.letter_batch_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES public.letter_batches(id) ON DELETE CASCADE,
  prospect_contact_id UUID,
  page_number INT NOT NULL,
  snapshot JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.letter_batch_items ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_letter_batch_items_batch ON public.letter_batch_items(batch_id, page_number);

CREATE POLICY "read_batch_items_via_batch"
  ON public.letter_batch_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.letter_batches b
      WHERE b.id = letter_batch_items.batch_id
        AND (b.advisor_id = auth.uid() OR has_role(auth.uid(), 'admin'))
    )
  );

CREATE POLICY "insert_batch_items_via_batch"
  ON public.letter_batch_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.letter_batches b
      WHERE b.id = letter_batch_items.batch_id
        AND b.advisor_id = auth.uid()
    )
  );

-- ============ Storage bucket ============
INSERT INTO storage.buckets (id, name, public)
VALUES ('prospect-letters', 'prospect-letters', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "advisor_read_own_letter_files"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'prospect-letters'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR has_role(auth.uid(), 'admin')
    )
  );

CREATE POLICY "advisor_write_own_letter_files"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'prospect-letters'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "advisor_delete_own_letter_files"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'prospect-letters'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR has_role(auth.uid(), 'admin')
    )
  );

-- ============ Seed default template ============
INSERT INTO public.letter_templates (name, subject, body_html, signature_html, is_default)
VALUES (
  'Carta padrão — apresentação',
  'Lote de cartas para impressão e envio postal — mari',
  '<p>Prezado(a) {{contact_name}},</p>
<p>Meu nome é {{advisor_name}}, da <strong>mari</strong>, plataforma especializada em M&A para empresas de pequeno e médio porte no Brasil.</p>
<p>Tenho acompanhado a trajetória da <strong>{{company_name}}</strong> em {{city}} e gostaria de propor uma conversa exploratória — sem compromisso — para apresentar oportunidades estratégicas que podem se alinhar ao momento da empresa.</p>
<p>Caso queira saber mais, ligue ou mande mensagem em <strong>{{advisor_phone}}</strong>.</p>
<p>Aguardo seu retorno.</p>',
  '<p>Atenciosamente,<br><strong>{{advisor_name}}</strong><br>mari · Vispe Group<br>{{advisor_phone}}</p>',
  true
);
