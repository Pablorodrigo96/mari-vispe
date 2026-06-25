
-- Triggers: notificar seguidores de uma empresa quando há novo post ou quando a rodada abre

CREATE OR REPLACE FUNCTION public.notify_followers_on_company_post()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_symbol text;
  v_name text;
  v_listing_id uuid;
BEGIN
  SELECT t.symbol, t.name, t.listing_id INTO v_symbol, v_name, v_listing_id
  FROM public.tokens t WHERE t.id = NEW.token_id;

  IF v_symbol IS NULL THEN RETURN NEW; END IF;

  INSERT INTO public.notifications (user_id, type, title, content, listing_id, is_read, is_digest)
  SELECT
    f.user_id,
    'company_post',
    COALESCE(v_name, v_symbol) || ' publicou: ' || COALESCE(NEW.title, 'nova atualização'),
    COALESCE(LEFT(NEW.body, 180), '') || ' · /investir/empresa/' || v_symbol,
    v_listing_id,
    false,
    false
  FROM public.company_follows f
  WHERE f.token_id = NEW.token_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_followers_on_company_post ON public.company_posts;
CREATE TRIGGER trg_notify_followers_on_company_post
AFTER INSERT ON public.company_posts
FOR EACH ROW EXECUTE FUNCTION public.notify_followers_on_company_post();


CREATE OR REPLACE FUNCTION public.notify_followers_on_round_open()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'primary_open' AND COALESCE(OLD.status, '') <> 'primary_open' THEN
    INSERT INTO public.notifications (user_id, type, title, content, listing_id, is_read, is_digest)
    SELECT
      f.user_id,
      'round_open',
      'Rodada aberta: ' || NEW.name,
      'A rodada de ' || NEW.name || ' acaba de abrir. Acompanhe em /investir/empresa/' || NEW.symbol,
      NEW.listing_id,
      false,
      false
    FROM public.company_follows f
    WHERE f.token_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_followers_on_round_open ON public.tokens;
CREATE TRIGGER trg_notify_followers_on_round_open
AFTER UPDATE OF status ON public.tokens
FOR EACH ROW EXECUTE FUNCTION public.notify_followers_on_round_open();
