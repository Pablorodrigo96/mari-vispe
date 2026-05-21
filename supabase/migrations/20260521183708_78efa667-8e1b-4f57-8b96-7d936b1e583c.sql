
-- 1) Tabela de log
CREATE TABLE IF NOT EXISTS public.deal_closing_emails_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_pair_id uuid NOT NULL REFERENCES public.deal_pairs(id) ON DELETE CASCADE,
  deal_document_id uuid REFERENCES public.deal_documents(id) ON DELETE SET NULL,
  recipient_type text NOT NULL,
  recipient_email text NOT NULL,
  template text NOT NULL,
  sent_at timestamptz,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dcel_pair ON public.deal_closing_emails_log(deal_pair_id);
CREATE INDEX IF NOT EXISTS idx_dcel_doc ON public.deal_closing_emails_log(deal_document_id);

ALTER TABLE public.deal_closing_emails_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dcel_select_staff" ON public.deal_closing_emails_log;
CREATE POLICY "dcel_select_staff"
ON public.deal_closing_emails_log FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'advisor'::app_role)
);

DROP POLICY IF EXISTS "dcel_insert_service" ON public.deal_closing_emails_log;
CREATE POLICY "dcel_insert_service"
ON public.deal_closing_emails_log FOR INSERT TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  OR public.has_role(auth.uid(), 'advisor'::app_role)
);

-- 2) Garantir pg_net
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- 3) Atualizar trigger function para chamar deal-closing-notify
CREATE OR REPLACE FUNCTION public.fn_deal_doc_signed_notify()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_pair public.deal_pairs%ROWTYPE;
  v_seller_user uuid;
  v_buyer_user uuid;
  v_codename text;
  v_template text;
  v_title text;
  v_msg text;
  v_is_closing boolean := false;
  v_is_nbo boolean := false;
  v_url text;
  v_anon text;
BEGIN
  IF NEW.status <> 'signed' OR COALESCE(OLD.status,'') = 'signed' THEN
    RETURN NEW;
  END IF;
  IF NEW.deal_pair_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_pair FROM public.deal_pairs WHERE id = NEW.deal_pair_id;
  IF NOT FOUND THEN RETURN NEW; END IF;

  SELECT c.created_by INTO v_seller_user
    FROM public.eb_companies c
   WHERE c.id = v_pair.sell_mandate_id
   LIMIT 1;

  IF v_pair.buyer_profile_id IS NOT NULL THEN
    v_buyer_user := v_pair.buyer_profile_id;
  END IF;

  v_template := COALESCE(NEW.template_code, '');
  v_codename := COALESCE((SELECT codename FROM public.eb_companies WHERE id = v_pair.sell_mandate_id), 'Projeto');

  v_title := 'Documento assinado · ' || v_codename;
  v_msg := COALESCE(NEW.label, 'Documento') || ' foi assinado com sucesso.';

  IF v_pair.responsavel_advisor_id IS NOT NULL THEN
    INSERT INTO public.notifications(user_id, type, title, content)
    VALUES (v_pair.responsavel_advisor_id, 'system', v_title, v_msg);
  END IF;
  IF v_seller_user IS NOT NULL AND v_seller_user <> COALESCE(v_pair.responsavel_advisor_id, '00000000-0000-0000-0000-000000000000'::uuid) THEN
    INSERT INTO public.notifications(user_id, type, title, content)
    VALUES (v_seller_user, 'system', v_title, v_msg);
  END IF;
  IF v_buyer_user IS NOT NULL THEN
    INSERT INTO public.notifications(user_id, type, title, content)
    VALUES (v_buyer_user, 'system', v_title, v_msg);
  END IF;

  v_is_nbo := v_template ILIKE '%nbo%';
  v_is_closing := v_template ILIKE '%spa%' OR v_template ILIKE '%closing%' OR NEW.category = 'closing';

  IF v_is_nbo AND v_pair.status IN ('active','draft','nbo') THEN
    UPDATE public.deal_pairs
       SET status = 'signed', nbo_signed_at = now(), updated_at = now()
     WHERE id = v_pair.id;
  ELSIF v_is_closing AND v_pair.status IN ('signed','active','nbo') THEN
    UPDATE public.deal_pairs
       SET status = 'closed', closed_at = now(), updated_at = now()
     WHERE id = v_pair.id;
  END IF;

  -- Dispara e-mails de fechamento (best-effort, não bloqueia o trigger)
  IF v_is_nbo OR v_is_closing THEN
    BEGIN
      v_url := current_setting('app.settings.supabase_url', true);
      IF v_url IS NULL OR v_url = '' THEN
        v_url := 'https://eiprjgotjruiutztjavp.supabase.co';
      END IF;
      v_anon := current_setting('app.settings.service_role_key', true);

      PERFORM extensions.http_post(
        url := v_url || '/functions/v1/deal-closing-notify',
        body := jsonb_build_object('deal_document_id', NEW.id),
        headers := jsonb_build_object('Content-Type','application/json')
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'deal-closing-notify dispatch failed: %', SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$$;
