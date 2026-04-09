
-- Table for webhook/integration configuration
CREATE TABLE public.integrations_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text NOT NULL,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.integrations_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage integrations_config"
  ON public.integrations_config
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));
