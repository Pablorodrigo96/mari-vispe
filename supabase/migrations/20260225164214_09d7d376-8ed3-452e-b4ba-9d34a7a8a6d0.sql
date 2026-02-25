CREATE TABLE public.interest_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL,
  user_id UUID NOT NULL,
  ticker TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.interest_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own interest" ON public.interest_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own interests" ON public.interest_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all interests" ON public.interest_logs
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role));