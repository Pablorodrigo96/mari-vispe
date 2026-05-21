
ALTER TABLE public.deal_pairs ADD COLUMN IF NOT EXISTS closed_at timestamptz;
ALTER TABLE public.deal_pairs ADD COLUMN IF NOT EXISTS nbo_signed_at timestamptz;

CREATE OR REPLACE FUNCTION public.fn_deal_doc_signed_notify()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pair public.deal_pairs%ROWTYPE;
  v_seller_user uuid;
  v_buyer_user uuid;
  v_codename text;
  v_template text;
  v_title text;
  v_msg text;
BEGIN
  IF NEW.status <> 'signed' OR COALESCE(OLD.status,'') = 'signed' THEN
    RETURN NEW;
  END IF;
  IF NEW.deal_pair_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_pair FROM public.deal_pairs WHERE id = NEW.deal_pair_id;
  IF NOT FOUND THEN RETURN NEW; END IF;

  -- resolver seller user via sell_mandate (eb_companies.created_by ou user_id)
  SELECT c.created_by INTO v_seller_user
    FROM public.eb_companies c
   WHERE c.id = v_pair.sell_mandate_id
   LIMIT 1;

  -- resolver buyer user (se buy_mandate_id apontar para eb_buyers com user)
  IF v_pair.buyer_profile_id IS NOT NULL THEN
    v_buyer_user := v_pair.buyer_profile_id;
  END IF;

  v_template := COALESCE(NEW.template_code, '');
  v_codename := COALESCE((SELECT codename FROM public.eb_companies WHERE id = v_pair.sell_mandate_id), 'Projeto');

  v_title := 'Documento assinado · ' || v_codename;
  v_msg := COALESCE(NEW.label, 'Documento') || ' foi assinado com sucesso.';

  -- notifica advisor
  IF v_pair.responsavel_advisor_id IS NOT NULL THEN
    INSERT INTO public.notifications(user_id, type, title, content)
    VALUES (v_pair.responsavel_advisor_id, 'system', v_title, v_msg);
  END IF;
  -- notifica seller
  IF v_seller_user IS NOT NULL AND v_seller_user <> COALESCE(v_pair.responsavel_advisor_id, '00000000-0000-0000-0000-000000000000'::uuid) THEN
    INSERT INTO public.notifications(user_id, type, title, content)
    VALUES (v_seller_user, 'system', v_title, v_msg);
  END IF;
  -- notifica buyer
  IF v_buyer_user IS NOT NULL THEN
    INSERT INTO public.notifications(user_id, type, title, content)
    VALUES (v_buyer_user, 'system', v_title, v_msg);
  END IF;

  -- transição automática
  IF v_template ILIKE '%nbo%' AND v_pair.status IN ('active','draft','nbo') THEN
    UPDATE public.deal_pairs
       SET status = 'signed', nbo_signed_at = now(), updated_at = now()
     WHERE id = v_pair.id;
  ELSIF (v_template ILIKE '%spa%' OR v_template ILIKE '%closing%' OR NEW.category = 'closing')
        AND v_pair.status IN ('signed','active','nbo') THEN
    UPDATE public.deal_pairs
       SET status = 'closed', closed_at = now(), updated_at = now()
     WHERE id = v_pair.id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_deal_doc_signed_notify ON public.deal_documents;
CREATE TRIGGER trg_deal_doc_signed_notify
AFTER UPDATE OF status ON public.deal_documents
FOR EACH ROW
EXECUTE FUNCTION public.fn_deal_doc_signed_notify();
