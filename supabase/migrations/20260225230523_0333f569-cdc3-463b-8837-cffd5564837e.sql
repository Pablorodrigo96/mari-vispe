
-- Add investor contact columns to interest_logs
ALTER TABLE public.interest_logs
  ADD COLUMN IF NOT EXISTS investor_name text,
  ADD COLUMN IF NOT EXISTS investor_company text,
  ADD COLUMN IF NOT EXISTS investor_email text,
  ADD COLUMN IF NOT EXISTS investor_whatsapp text;

-- Listing owners can view interests on their listings
CREATE POLICY "Listing owners can view interests"
  ON public.interest_logs FOR SELECT
  USING (listing_id IN (
    SELECT id FROM public.listings WHERE user_id = auth.uid()
  ));

-- Trigger function to auto-create notifications when interest is registered
CREATE OR REPLACE FUNCTION public.create_interest_notification()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
DECLARE
  listing_owner_id UUID;
  listing_ticker TEXT;
  admin_record RECORD;
  inv_name TEXT;
BEGIN
  -- Get listing owner and ticker
  SELECT user_id, ticker INTO listing_owner_id, listing_ticker
  FROM public.listings
  WHERE id = NEW.listing_id;

  inv_name := COALESCE(NEW.investor_name, 'Um investidor');

  -- Notify listing owner
  IF listing_owner_id IS NOT NULL THEN
    INSERT INTO public.notifications (user_id, type, title, content, listing_id)
    VALUES (
      listing_owner_id,
      'system',
      'Novo interesse registrado!',
      inv_name || ' demonstrou interesse no seu ativo ' || COALESCE(listing_ticker, ''),
      NEW.listing_id
    );
  END IF;

  -- Notify all admins
  FOR admin_record IN
    SELECT user_id FROM public.user_roles WHERE role = 'admin'
  LOOP
    INSERT INTO public.notifications (user_id, type, title, content, listing_id)
    VALUES (
      admin_record.user_id,
      'system',
      'Novo interesse registrado!',
      COALESCE(NEW.investor_name, 'Investidor') || ' - ' || COALESCE(NEW.investor_email, 'sem email') || ' interessado em ' || COALESCE(listing_ticker, ''),
      NEW.listing_id
    );
  END LOOP;

  RETURN NEW;
END;
$function$;

-- Create trigger
DROP TRIGGER IF EXISTS on_interest_created ON public.interest_logs;
CREATE TRIGGER on_interest_created
  AFTER INSERT ON public.interest_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.create_interest_notification();
