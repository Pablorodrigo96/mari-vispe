-- 1) Stop auto-syncing valuations into the equity_brain graph (advisor pulls manually if needed)
DROP TRIGGER IF EXISTS trg_sync_valuation_to_eb ON public.valuation_history;

-- 2) Fix the synthetic-company guard trigger: type is qualification_status (no _enum suffix)
CREATE OR REPLACE FUNCTION equity_brain.guard_synthetic_company_unqualified()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'equity_brain'
AS $$
BEGIN
  IF NEW.cnpj LIKE 'VL%' OR NEW.cnpj LIKE 'CR%' THEN
    IF NEW.qualification_status IS NULL OR NEW.qualification_status::text NOT IN ('qualified') THEN
      NEW.qualification_status := 'unqualified'::equity_brain.qualification_status;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;