
CREATE TABLE public.company_captables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listing_id uuid NOT NULL UNIQUE REFERENCES public.listings(id) ON DELETE CASCADE,
  cnpj text,
  razao_social text,
  nome_fantasia text,
  valuation_amount numeric(15,2),
  valuation_source text CHECK (valuation_source IN ('valuation_history','listing_calc','manual')),
  valuation_at timestamptz,
  total_shares numeric NOT NULL DEFAULT 100,
  currency text NOT NULL DEFAULT 'BRL',
  available_for_sale_pct numeric NOT NULL DEFAULT 0 CHECK (available_for_sale_pct >= 0 AND available_for_sale_pct <= 100),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_captables TO authenticated;
GRANT ALL ON public.company_captables TO service_role;
ALTER TABLE public.company_captables ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owners manage captables" ON public.company_captables
  FOR ALL TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'advisor'))
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'advisor'));

CREATE TABLE public.company_partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  captable_id uuid NOT NULL REFERENCES public.company_captables(id) ON DELETE CASCADE,
  nome text NOT NULL,
  documento text,
  qualificacao text,
  pct numeric NOT NULL DEFAULT 0 CHECK (pct >= 0 AND pct <= 100),
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('rfb','manual')),
  is_pf boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_company_partners_captable ON public.company_partners(captable_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_partners TO authenticated;
GRANT ALL ON public.company_partners TO service_role;
ALTER TABLE public.company_partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owners manage partners via captable" ON public.company_partners
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.company_captables c WHERE c.id = captable_id
    AND (c.user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'advisor'))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.company_captables c WHERE c.id = captable_id
    AND (c.user_id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'advisor'))));

CREATE TRIGGER trg_captables_updated_at BEFORE UPDATE ON public.company_captables
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_partners_updated_at BEFORE UPDATE ON public.company_partners
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
