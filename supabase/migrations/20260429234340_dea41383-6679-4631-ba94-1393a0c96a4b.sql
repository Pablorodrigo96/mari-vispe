CREATE TABLE IF NOT EXISTS equity_brain.saved_companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  cnpj TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, cnpj)
);

ALTER TABLE equity_brain.saved_companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own saved companies"
  ON equity_brain.saved_companies
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins view all saved companies"
  ON equity_brain.saved_companies
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE INDEX IF NOT EXISTS idx_eb_saved_companies_user ON equity_brain.saved_companies (user_id);
CREATE INDEX IF NOT EXISTS idx_eb_saved_companies_cnpj ON equity_brain.saved_companies (cnpj);

GRANT ALL ON equity_brain.saved_companies TO authenticated, service_role;