-- Helper: lista staff (admin + advisor) para notificar
CREATE OR REPLACE FUNCTION public._notify_staff_user_ids()
RETURNS TABLE(user_id uuid)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT DISTINCT ur.user_id
  FROM public.user_roles ur
  WHERE ur.role IN ('admin'::app_role, 'advisor'::app_role);
$$;

-- 1) deal_qa INSERT → buyer pergunta, notifica staff
CREATE OR REPLACE FUNCTION public.tg_deal_qa_notify_insert()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF NEW.author_role = 'buyer' THEN
    INSERT INTO public.notifications (user_id, type, title, content)
    SELECT s.user_id,
           'deal_qa_new',
           'Nova pergunta de comprador',
           left(NEW.question, 240)
    FROM public._notify_staff_user_ids() s;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_deal_qa_notify_insert ON public.deal_qa;
CREATE TRIGGER trg_deal_qa_notify_insert
AFTER INSERT ON public.deal_qa
FOR EACH ROW EXECUTE FUNCTION public.tg_deal_qa_notify_insert();

-- 2) deal_qa UPDATE (resposta preenchida) → notifica buyer
CREATE OR REPLACE FUNCTION public.tg_deal_qa_notify_answer()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF (OLD.answer IS NULL OR OLD.answer = '')
     AND NEW.answer IS NOT NULL AND NEW.answer <> ''
     AND NEW.visible_to_buyer = true THEN
    INSERT INTO public.notifications (user_id, type, title, content)
    VALUES (
      NEW.buyer_user_id,
      'deal_qa_answered',
      'Sua pergunta foi respondida',
      left(NEW.answer, 240)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_deal_qa_notify_answer ON public.deal_qa;
CREATE TRIGGER trg_deal_qa_notify_answer
AFTER UPDATE OF answer, visible_to_buyer ON public.deal_qa
FOR EACH ROW EXECUTE FUNCTION public.tg_deal_qa_notify_answer();

-- 3) deal_documents: doc disponibilizado ao buyer → notifica compradores com acesso ativo
CREATE OR REPLACE FUNCTION public.tg_deal_documents_notify_visible()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  became_visible boolean;
BEGIN
  became_visible := (TG_OP = 'INSERT' AND COALESCE(NEW.visible_to_buyer, false) = true)
                 OR (TG_OP = 'UPDATE'
                     AND COALESCE(OLD.visible_to_buyer, false) = false
                     AND COALESCE(NEW.visible_to_buyer, false) = true);

  IF became_visible THEN
    INSERT INTO public.notifications (user_id, type, title, content)
    SELECT bda.buyer_user_id,
           'deal_doc_shared',
           'Novo documento disponível',
           COALESCE(NEW.label, 'Documento liberado pelo assessor')
    FROM public.buyer_deal_access bda
    WHERE bda.deal_id = NEW.deal_id
      AND bda.revoked_at IS NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_deal_documents_notify_visible ON public.deal_documents;
CREATE TRIGGER trg_deal_documents_notify_visible
AFTER INSERT OR UPDATE OF visible_to_buyer ON public.deal_documents
FOR EACH ROW EXECUTE FUNCTION public.tg_deal_documents_notify_visible();