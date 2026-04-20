
-- 1. Tabela de reservas de leads para contadores parceiros
CREATE TABLE public.partner_lead_reservations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  partner_user_id UUID NOT NULL,
  listing_id UUID NOT NULL,
  reserved_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '45 days'),
  status TEXT NOT NULL DEFAULT 'reserved', -- reserved | exclusive | expired | closed_by_matrix
  qualifying_action TEXT, -- valuation | meeting_requested | vdr_doc_uploaded
  qualified_at TIMESTAMP WITH TIME ZONE,
  commission_type TEXT NOT NULL DEFAULT 'full', -- full (20%) | discovery_fee
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (listing_id)
);

CREATE INDEX idx_partner_reservations_partner ON public.partner_lead_reservations(partner_user_id);
CREATE INDEX idx_partner_reservations_status ON public.partner_lead_reservations(status);
CREATE INDEX idx_partner_reservations_expires ON public.partner_lead_reservations(expires_at);

ALTER TABLE public.partner_lead_reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners view own reservations"
  ON public.partner_lead_reservations FOR SELECT
  USING (partner_user_id = auth.uid());

CREATE POLICY "Admins view all reservations"
  ON public.partner_lead_reservations FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage reservations"
  ON public.partner_lead_reservations FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER partner_reservations_updated
  BEFORE UPDATE ON public.partner_lead_reservations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Tabela de documentos VDR (Cofre Digital)
CREATE TABLE public.vdr_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID NOT NULL,
  uploaded_by UUID NOT NULL,
  doc_category TEXT NOT NULL, -- balanco | dre | contrato | fluxo_caixa | impostos | outros
  doc_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | validated | rejected
  validated_by UUID,
  validated_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_vdr_listing ON public.vdr_documents(listing_id);
CREATE INDEX idx_vdr_status ON public.vdr_documents(status);

ALTER TABLE public.vdr_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Listing owners view own VDR docs"
  ON public.vdr_documents FOR SELECT
  USING (listing_id IN (SELECT id FROM public.listings WHERE user_id = auth.uid()));

CREATE POLICY "Partners view VDR of reserved listings"
  ON public.vdr_documents FOR SELECT
  USING (listing_id IN (
    SELECT listing_id FROM public.partner_lead_reservations
    WHERE partner_user_id = auth.uid()
  ));

CREATE POLICY "Admins view all VDR docs"
  ON public.vdr_documents FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Listing owners insert VDR docs"
  ON public.vdr_documents FOR INSERT
  WITH CHECK (
    uploaded_by = auth.uid() AND
    listing_id IN (SELECT id FROM public.listings WHERE user_id = auth.uid())
  );

CREATE POLICY "Partners insert VDR docs of reserved listings"
  ON public.vdr_documents FOR INSERT
  WITH CHECK (
    uploaded_by = auth.uid() AND
    listing_id IN (
      SELECT listing_id FROM public.partner_lead_reservations
      WHERE partner_user_id = auth.uid()
    )
  );

CREATE POLICY "Admins manage VDR docs"
  ON public.vdr_documents FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER vdr_docs_updated
  BEFORE UPDATE ON public.vdr_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Coluna vdr_readiness em listings
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS vdr_readiness INTEGER DEFAULT 0;

-- 4. Função para calcular prontidão VDR
CREATE OR REPLACE FUNCTION public.calculate_vdr_readiness(p_listing_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  required_categories TEXT[] := ARRAY['balanco', 'dre', 'contrato', 'fluxo_caixa', 'impostos'];
  validated_count INTEGER;
BEGIN
  SELECT COUNT(DISTINCT doc_category) INTO validated_count
  FROM public.vdr_documents
  WHERE listing_id = p_listing_id
    AND status = 'validated'
    AND doc_category = ANY(required_categories);

  RETURN (validated_count * 100) / array_length(required_categories, 1);
END;
$$;

-- 5. Trigger para atualizar vdr_readiness no listing após mudança de doc
CREATE OR REPLACE FUNCTION public.update_listing_vdr_readiness()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_listing_id UUID;
  new_readiness INTEGER;
  old_readiness INTEGER;
BEGIN
  target_listing_id := COALESCE(NEW.listing_id, OLD.listing_id);
  
  SELECT vdr_readiness INTO old_readiness FROM public.listings WHERE id = target_listing_id;
  new_readiness := public.calculate_vdr_readiness(target_listing_id);
  
  UPDATE public.listings
  SET vdr_readiness = new_readiness
  WHERE id = target_listing_id;

  -- Notificar admins quando atinge 100%
  IF new_readiness = 100 AND COALESCE(old_readiness, 0) < 100 THEN
    INSERT INTO public.notifications (user_id, type, title, content, listing_id)
    SELECT ur.user_id, 'system',
      'VDR Pronto: empresa pronta para a vitrine',
      'Os documentos do anúncio estão 100% validados. Pronto para investidores.',
      target_listing_id
    FROM public.user_roles ur WHERE ur.role = 'admin';
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER vdr_doc_change_updates_readiness
  AFTER INSERT OR UPDATE OR DELETE ON public.vdr_documents
  FOR EACH ROW EXECUTE FUNCTION public.update_listing_vdr_readiness();

-- 6. Trigger: criar reserva automática quando contador parceiro cadastra listing
CREATE OR REPLACE FUNCTION public.auto_create_partner_reservation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_partner BOOLEAN;
BEGIN
  SELECT COALESCE(is_partner_accountant, false) INTO is_partner
  FROM public.profiles WHERE user_id = NEW.user_id;

  IF is_partner THEN
    INSERT INTO public.partner_lead_reservations (partner_user_id, listing_id)
    VALUES (NEW.user_id, NEW.id)
    ON CONFLICT (listing_id) DO NOTHING;

    INSERT INTO public.notifications (user_id, type, title, content, listing_id)
    VALUES (
      NEW.user_id, 'system',
      'Lead reservado por 45 dias',
      'Você tem 45 dias de prioridade para qualificar este lead. Suba documentos no Cofre Digital ou gere um valuation para garantir exclusividade total (comissão cheia 20%).',
      NEW.id
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auto_partner_reservation
  AFTER INSERT ON public.listings
  FOR EACH ROW EXECUTE FUNCTION public.auto_create_partner_reservation();

-- 7. Trigger: qualificar reserva quando parceiro sobe doc VDR
CREATE OR REPLACE FUNCTION public.qualify_reservation_on_vdr()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  reservation_record RECORD;
BEGIN
  SELECT * INTO reservation_record
  FROM public.partner_lead_reservations
  WHERE listing_id = NEW.listing_id
    AND partner_user_id = NEW.uploaded_by
    AND status = 'reserved';

  IF reservation_record.id IS NOT NULL THEN
    UPDATE public.partner_lead_reservations
    SET status = 'exclusive',
        qualifying_action = 'vdr_doc_uploaded',
        qualified_at = now(),
        commission_type = 'full'
    WHERE id = reservation_record.id;

    INSERT INTO public.notifications (user_id, type, title, content, listing_id)
    VALUES (
      NEW.uploaded_by, 'system',
      'Parabéns! Lead agora é exclusivo seu',
      'Você qualificou a reserva subindo um documento. Comissão cheia (20%) garantida.',
      NEW.listing_id
    );
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_qualify_on_vdr_upload
  AFTER INSERT ON public.vdr_documents
  FOR EACH ROW EXECUTE FUNCTION public.qualify_reservation_on_vdr();

-- 8. Função para expirar reservas antigas (chamada via cron)
CREATE OR REPLACE FUNCTION public.expire_old_reservations()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  expired_record RECORD;
BEGIN
  -- Notificar 7 dias antes de expirar
  FOR expired_record IN
    SELECT plr.*, l.title FROM public.partner_lead_reservations plr
    JOIN public.listings l ON l.id = plr.listing_id
    WHERE plr.status = 'reserved'
      AND plr.expires_at BETWEEN now() + interval '6 days' AND now() + interval '7 days'
  LOOP
    INSERT INTO public.notifications (user_id, type, title, content, listing_id)
    VALUES (
      expired_record.partner_user_id, 'system',
      'Sua reserva expira em 7 dias',
      'A reserva de "' || expired_record.title || '" expira em breve. Qualifique agora subindo um documento ou gerando um valuation!',
      expired_record.listing_id
    );
  END LOOP;

  -- Expirar reservas vencidas
  UPDATE public.partner_lead_reservations
  SET status = 'expired',
      commission_type = 'discovery_fee'
  WHERE status = 'reserved'
    AND expires_at < now();
END;
$$;
