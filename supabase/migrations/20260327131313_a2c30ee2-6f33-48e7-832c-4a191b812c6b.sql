CREATE TABLE public.buyer_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  buyer_name text NOT NULL,
  company_name text,
  email text,
  whatsapp text,
  categories text[] NOT NULL DEFAULT '{}',
  min_budget numeric,
  max_budget numeric,
  city text,
  state text,
  description text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.buyer_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view active buyers"
  ON public.buyer_profiles FOR SELECT TO authenticated
  USING (status = 'active' OR user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated can insert buyers"
  ON public.buyer_profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners and admins can update buyers"
  ON public.buyer_profiles FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Owners and admins can delete buyers"
  ON public.buyer_profiles FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_buyer_profiles_status ON public.buyer_profiles(status);
CREATE INDEX idx_buyer_profiles_state ON public.buyer_profiles(state);