
CREATE TABLE public.capital_requests (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  full_name text,
  company_name text NOT NULL,
  email text,
  phone text,
  requested_amount numeric NOT NULL,
  capital_type text NOT NULL DEFAULT 'divida',
  objective text NOT NULL,
  monthly_revenue text,
  net_profit text,
  status text NOT NULL DEFAULT 'pending',
  views_count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.capital_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own capital requests"
ON public.capital_requests FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own capital requests"
ON public.capital_requests FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all capital requests"
ON public.capital_requests FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update all capital requests"
ON public.capital_requests FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_capital_requests_updated_at
BEFORE UPDATE ON public.capital_requests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
