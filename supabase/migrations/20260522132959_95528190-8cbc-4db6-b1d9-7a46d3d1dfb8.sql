CREATE OR REPLACE FUNCTION public.fn_deal_doc_signed_notify()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions', 'equity_brain'
AS $function$
DECLARE
  v_pair public.deal_pairs%ROWTYPE;
  v_seller_user uuid;
  v_buyer_user uuid;
  v_codename text;
  v_company_cnpj text;
  v_template text;
  v_title text;
  v_msg text;
  v_is_closing boolean := false;
  v_is_nbo boolean := false;
  v_url text;
BEGIN
  IF NEW.status <> 'signed' OR COALESCE(OLD.status,'') = 'signed' THEN
    RETURN NEW;
  END IF;
  IF NEW.deal_pair_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_pair FROM public.deal_pairs WHERE id = NEW.deal_pair_id;
  IF NOT FOUND THEN RETURN NEW; END IF;

  -- sell_mandate_id refere equity_brain.mandates(id)
  SELECT m.company_cnpj, COALESCE(m.created_by, m.responsavel_id)
    INTO v_company_cnpj, v_seller_user
    FROM equity_brain.mandates m
   WHERE m.id = v_pair.sell_mandate_id
   LIMIT 1;

  IF v_company_cnpj IS NOT NULL THEN
    SELECT c.codename INTO v_codename
      FROM equity_brain.companies c
     WHERE c.cnpj = v_company_cnpj
     LIMIT 1;
  END IF;
  v_codename := COALESCE(v_codename, 'Projeto');

  IF v_pair.buyer_profile_id IS NOT NULL THEN
    v_buyer_user := v_pair.buyer_profile_id;
  END IF;

  v_template := COALESCE(NEW.template_code, '');
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

  IF v_is_nbo OR v_is_closing THEN
    BEGIN
      v_url := current_setting('app.settings.supabase_url', true);
      IF v_url IS NULL OR v_url = '' THEN
        v_url := 'https://eiprjgotjruiutztjavp.supabase.co';
      END IF;

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
$function$;