
-- 1. calculate_lead_score — BEFORE INSERT OR UPDATE on capital_requests
CREATE OR REPLACE FUNCTION public.calculate_lead_score()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
BEGIN
  -- Revenue score (0-30): map monthly_revenue text ranges to numeric
  CASE NEW.monthly_revenue
    WHEN 'above_1m' THEN rev_num := 1500000; revenue_score := 30;
    WHEN '500k_1m' THEN rev_num := 750000; revenue_score := 25;
    WHEN '100k_500k' THEN rev_num := 300000; revenue_score := 20;
    WHEN '50k_100k' THEN rev_num := 75000; revenue_score := 12;
    WHEN 'below_50k' THEN rev_num := 25000; revenue_score := 5;
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

  -- Ratio score (0-20): annual_revenue / requested_amount
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

  -- Completeness score (0-15): count filled fields
  IF NEW.email IS NOT NULL AND NEW.email != '' THEN filled := filled + 1; END IF;
  IF NEW.phone IS NOT NULL AND NEW.phone != '' THEN filled := filled + 1; END IF;
  IF NEW.sector IS NOT NULL AND NEW.sector != '' THEN filled := filled + 1; END IF;
  IF NEW.company_age IS NOT NULL AND NEW.company_age != '' THEN filled := filled + 1; END IF;
  IF NEW.full_name IS NOT NULL AND NEW.full_name != '' THEN filled := filled + 1; END IF;
  IF NEW.monthly_revenue IS NOT NULL THEN filled := filled + 1; END IF;
  IF NEW.net_profit IS NOT NULL THEN filled := filled + 1; END IF;
  IF NEW.objective IS NOT NULL THEN filled := filled + 1; END IF;
  -- Max 8 fields → normalize to 0-15
  completeness_score := LEAST(15, (filled * 15) / 8);

  -- Age score (0-10)
  CASE NEW.company_age
    WHEN 'above_10' THEN age_score := 10;
    WHEN '5_10' THEN age_score := 8;
    WHEN '2_5' THEN age_score := 6;
    WHEN '1_2' THEN age_score := 3;
    WHEN 'below_1' THEN age_score := 1;
    ELSE age_score := 0;
  END CASE;

  -- Also set company_age_months
  CASE NEW.company_age
    WHEN 'above_10' THEN NEW.company_age_months := 120;
    WHEN '5_10' THEN NEW.company_age_months := 84;
    WHEN '2_5' THEN NEW.company_age_months := 42;
    WHEN '1_2' THEN NEW.company_age_months := 18;
    WHEN 'below_1' THEN NEW.company_age_months := 6;
    ELSE NULL;
  END CASE;

  total_score := revenue_score + profit_score + ratio_score + completeness_score + age_score;
  NEW.lead_score := LEAST(100, total_score);
  NEW.estimated_approval := LEAST(100, total_score);

  -- Sector bonus
  IF NEW.sector IN ('tech', 'telecom', 'saude', 'financeiro') THEN
    NEW.lead_score := LEAST(100, NEW.lead_score + 5);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER a_calculate_lead_score
BEFORE INSERT OR UPDATE ON public.capital_requests
FOR EACH ROW EXECUTE FUNCTION public.calculate_lead_score();

-- 2. sla_deadline_setter — BEFORE INSERT (runs after calculate_lead_score due to name ordering)
CREATE OR REPLACE FUNCTION public.sla_deadline_setter()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.lead_score IS NOT NULL AND NEW.lead_score > 70 THEN
    NEW.sla_deadline := now() + interval '72 hours';
  ELSE
    NEW.sla_deadline := now() + interval '7 days';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER b_sla_deadline_setter
BEFORE INSERT ON public.capital_requests
FOR EACH ROW EXECUTE FUNCTION public.sla_deadline_setter();

-- 3. auto_match_providers — AFTER INSERT on capital_requests
CREATE OR REPLACE FUNCTION public.auto_match_providers()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  provider RECORD;
  m_score INT;
  match_count INT := 0;
BEGIN
  FOR provider IN
    SELECT * FROM public.capital_providers
    WHERE active = true
      AND (ticket_min IS NULL OR ticket_min <= NEW.requested_amount)
      AND (ticket_max IS NULL OR ticket_max >= NEW.requested_amount)
  LOOP
    m_score := 50; -- base score

    -- Sector match bonus
    IF provider.sectors = '{}' OR provider.sectors IS NULL THEN
      m_score := m_score + 10;
    ELSIF NEW.sector IS NOT NULL AND NEW.sector = ANY(provider.sectors) THEN
      m_score := m_score + 25;
    END IF;

    -- Instrument compatibility
    IF provider.instruments IS NOT NULL AND array_length(provider.instruments, 1) > 0 THEN
      IF NEW.capital_type = 'divida' AND ('credito' = ANY(provider.instruments) OR 'divida' = ANY(provider.instruments) OR 'antecipacao' = ANY(provider.instruments)) THEN
        m_score := m_score + 20;
      ELSIF NEW.capital_type = 'equity' AND ('equity' = ANY(provider.instruments) OR 'participacao' = ANY(provider.instruments)) THEN
        m_score := m_score + 20;
      END IF;
    ELSE
      m_score := m_score + 10;
    END IF;

    -- Only insert if reasonable match
    IF m_score >= 50 THEN
      INSERT INTO public.capital_matches (request_id, provider_id, match_score, status)
      VALUES (NEW.id, provider.id, LEAST(100, m_score), 'suggested');
      match_count := match_count + 1;
    END IF;
  END LOOP;

  -- Update matched count
  UPDATE public.capital_requests
  SET matched_providers_count = match_count
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER c_auto_match_providers
AFTER INSERT ON public.capital_requests
FOR EACH ROW EXECUTE FUNCTION public.auto_match_providers();

-- 4. notify_on_capital_request — AFTER INSERT on capital_requests
CREATE OR REPLACE FUNCTION public.notify_on_capital_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  admin_record RECORD;
  franchisee_record RECORD;
BEGIN
  -- Insert timeline event
  INSERT INTO public.capital_timeline (request_id, event_type, description, actor_id)
  VALUES (NEW.id, 'created', 'Solicitação de captação criada: ' || NEW.company_name || ' - R$ ' || NEW.requested_amount::text, NEW.user_id);

  -- Notify all admins
  FOR admin_record IN
    SELECT ur.user_id FROM public.user_roles ur WHERE ur.role = 'admin'
  LOOP
    INSERT INTO public.notifications (user_id, type, title, content)
    VALUES (
      admin_record.user_id,
      'system',
      'Nova captação: ' || NEW.company_name,
      'Novo pedido de ' || COALESCE(NEW.capital_type, 'capital') || ' no valor de R$ ' || NEW.requested_amount::text || '. Score: ' || COALESCE(NEW.lead_score::text, 'N/A')
    );
  END LOOP;

  -- Notify franchisees in matching region
  FOR franchisee_record IN
    SELECT ur.user_id
    FROM public.user_roles ur
    WHERE ur.role = 'franchisee'
      AND (
        NOT EXISTS (SELECT 1 FROM public.franchisee_regions fr WHERE fr.user_id = ur.user_id)
        OR EXISTS (
          SELECT 1 FROM public.franchisee_regions fr
          WHERE fr.user_id = ur.user_id
            AND (fr.states = '{}' OR NEW.sector = ANY(fr.categories) OR fr.categories = '{}')
        )
      )
  LOOP
    INSERT INTO public.notifications (user_id, type, title, content)
    VALUES (
      franchisee_record.user_id,
      'system',
      'Nova captação na sua região!',
      NEW.company_name || ' busca ' || COALESCE(NEW.capital_type, 'capital') || ' de R$ ' || NEW.requested_amount::text
    );
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER d_notify_on_capital_request
AFTER INSERT ON public.capital_requests
FOR EACH ROW EXECUTE FUNCTION public.notify_on_capital_request();

-- 5. increment_capital_view function
CREATE OR REPLACE FUNCTION public.increment_capital_view(p_request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.capital_requests
  SET views_count = views_count + 1
  WHERE id = p_request_id;
END;
$$;
