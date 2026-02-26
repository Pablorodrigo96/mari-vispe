
ALTER TYPE public.app_role ADD VALUE 'franchisee';

CREATE TABLE public.franchisee_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.franchisee_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own franchisee requests"
  ON public.franchisee_requests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own franchisee requests"
  ON public.franchisee_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all franchisee requests"
  ON public.franchisee_requests FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update franchisee requests"
  ON public.franchisee_requests FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));
