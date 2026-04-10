
-- 1. Update calculate_lead_score to accept BOTH frontend and legacy value formats
CREATE OR REPLACE FUNCTION public.calculate_lead_score()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  revenue_score INT := 0;
  profit_score INT := 0;
  ratio_score INT := 0;
  completeness_score INT := 0;
  age_score INT := 0;
  total_score INT := 0;
  rev_num NUMERIC := 0;
  prof_num NUMERIC := 0;
  filled INT := 0;
  doc_count INT := 0;
  doc_bonus INT := 0;
BEGIN
  -- Revenue score (0-30): accept both frontend and legacy formats
  CASE NEW.monthly_revenue
    WHEN 'above_1m', 'acima-1m' THEN rev_num := 1500000; revenue_score := 30;
    WHEN '500k_1m', '500k-1m' THEN rev_num := 750000; revenue_score := 25;
    WHEN '100k_500k', '200k-500k' THEN rev_num := 300000; revenue_score := 20;
    WHEN '50k_100k', '50k-200k' THEN rev_num := 75000; revenue_score := 12;
    WHEN 'below_50k', 'ate-50k' THEN rev_num := 25000; revenue_score := 5;
    ELSE revenue_score := 0;
  END CASE;

  -- Profit score (0-25)
  CASE NEW.net_profit
    WHEN 'above_200k' THEN prof_num := 300000; profit_score := 25;
    WHEN '50k_200k' THEN prof_num := 125000; profit_score := 20;
    WHEN '10k_50k' THEN prof_num := 30000; profit_score := 12;
    WHEN 'below_10k' THEN prof_num := 5000; profit_score := 5;
    WHEN 'negative' THEN prof_num := 0; profit_score := 0;
    ELSE profit_score := 0;
  END CASE;

  -- Ratio score (0-20)
  IF rev_num > 0 AND NEW.requested_amount > 0 THEN
    DECLARE r NUMERIC := (rev_num * 12) / NEW.requested_amount;
    BEGIN
      IF r >= 3 THEN ratio_score := 20;
      ELSIF r >= 2 THEN ratio_score := 15;
      ELSIF r >= 1 THEN ratio_score := 10;
      ELSIF r >= 0.5 THEN ratio_score := 5;
      ELSE ratio_score := 2;
      END IF;
    END;
  END IF;

  -- Completeness score (0-15)
  IF NEW.email IS NOT NULL AND NEW.email != '' THEN filled := filled + 1; END IF;
  IF NEW.phone IS NOT NULL AND NEW.phone != '' THEN filled := filled + 1; END IF;
  IF NEW.sector IS NOT NULL AND NEW.sector != '' THEN filled := filled + 1; END IF;
  IF NEW.company_age IS NOT NULL AND NEW.company_age != '' THEN filled := filled + 1; END IF;
  IF NEW.full_name IS NOT NULL AND NEW.full_name != '' THEN filled := filled + 1; END IF;
  IF NEW.monthly_revenue IS NOT NULL THEN filled := filled + 1; END IF;
  IF NEW.net_profit IS NOT NULL THEN filled := filled + 1; END IF;
  IF NEW.objective IS NOT NULL THEN filled := filled + 1; END IF;
  completeness_score := LEAST(15, (filled * 15) / 8);

  -- Age score (0-10): accept both frontend and legacy formats
  CASE NEW.company_age
    WHEN 'above_10', '10+' THEN age_score := 10;
    WHEN '5_10', '5-10' THEN age_score := 8;
    WHEN '2_5', '3-5' THEN age_score := 6;
    WHEN '1_2', '1-3' THEN age_score := 3;
    WHEN 'below_1', '<1' THEN age_score := 1;
    ELSE age_score := 0;
  END CASE;

  -- Also set company_age_months
  CASE NEW.company_age
    WHEN 'above_10', '10+' THEN NEW.company_age_months := 120;
    WHEN '5_10', '5-10' THEN NEW.company_age_months := 84;
    WHEN '2_5', '3-5' THEN NEW.company_age_months := 42;
    WHEN '1_2', '1-3' THEN NEW.company_age_months := 18;
    WHEN 'below_1', '<1' THEN NEW.company_age_months := 6;
    ELSE NULL;
  END CASE;

  -- Document bonus (0-16): +2 per document, max 16
  SELECT COUNT(*) INTO doc_count FROM public.capital_documents WHERE request_id = NEW.id;
  doc_bonus := LEAST(16, doc_count * 2);

  total_score := revenue_score + profit_score + ratio_score + completeness_score + age_score + doc_bonus;
  NEW.lead_score := LEAST(100, total_score);
  NEW.estimated_approval := LEAST(100, total_score);

  -- Sector bonus
  IF NEW.sector IN ('tech', 'telecom', 'saude', 'financeiro') THEN
    NEW.lead_score := LEAST(100, NEW.lead_score + 5);
  END IF;

  RETURN NEW;
END;
$function$;

-- 2. Create trigger function for document upload bonus
CREATE OR REPLACE FUNCTION public.update_lead_score_on_doc()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  doc_count INT;
  doc_bonus INT;
  current_score INT;
BEGIN
  -- Count total docs for this request
  SELECT COUNT(*) INTO doc_count FROM public.capital_documents WHERE request_id = NEW.request_id;
  doc_bonus := LEAST(16, doc_count * 2);

  -- Get current lead_score (without old doc bonus, recalculate)
  -- Simple approach: just update by triggering the calculate_lead_score via a dummy update
  UPDATE public.capital_requests
  SET updated_at = now()
  WHERE id = NEW.request_id;

  RETURN NEW;
END;
$function$;

-- 3. Create trigger on capital_documents
CREATE TRIGGER on_capital_doc_insert
  AFTER INSERT ON public.capital_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.update_lead_score_on_doc();
