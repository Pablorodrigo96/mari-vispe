-- Fase 5: tabela dedicada para rastrear leads originados em /mari (calculadora pública).
CREATE TABLE public.mari_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  cnpj TEXT NOT NULL,
  razao_social TEXT,
  uf TEXT,
  cidade TEXT,
  cnae TEXT,
  porte TEXT,
  window_base INTEGER,
  listing_id UUID REFERENCES public.listings(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'signup', -- 'signup' | 'listed' | 'contacted'
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, cnpj)
);

CREATE INDEX idx_mari_leads_user ON public.mari_leads(user_id, created_at DESC);
CREATE INDEX idx_mari_leads_status ON public.mari_leads(status, created_at DESC);

ALTER TABLE public.mari_leads ENABLE ROW LEVEL SECURITY;

-- Vendedor (dono) pode ver e inserir o próprio lead
CREATE POLICY "Users insert own mari leads"
ON public.mari_leads FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users view own mari leads"
ON public.mari_leads FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users update own mari leads"
ON public.mari_leads FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

-- Admins e advisors veem todos (pra aparecer em /equity-brain/hoje)
CREATE POLICY "Admins advisors view all mari leads"
ON public.mari_leads FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'advisor'::app_role));

CREATE POLICY "Admins advisors update all mari leads"
ON public.mari_leads FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'advisor'::app_role));

CREATE TRIGGER mari_leads_updated_at
BEFORE UPDATE ON public.mari_leads
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();