
-- Plano Perfeito: tabela aditiva para guardar planos do empresário.
-- Não toca nenhuma tabela existente.

CREATE TABLE public.planos_perfeitos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  valuation_inputs jsonb NOT NULL,
  plano_inputs jsonb NOT NULL,
  result jsonb NOT NULL,
  valuation_atual numeric,
  valuation_meta numeric,
  investimento_mensal numeric,
  viabilidade text CHECK (viabilidade IN ('green','yellow','red')),
  lead_tag text NOT NULL DEFAULT 'plano_perfeito',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_planos_perfeitos_user ON public.planos_perfeitos(user_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.planos_perfeitos TO authenticated;
GRANT ALL ON public.planos_perfeitos TO service_role;

ALTER TABLE public.planos_perfeitos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own planos"
  ON public.planos_perfeitos FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "users insert own planos"
  ON public.planos_perfeitos FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users update own planos"
  ON public.planos_perfeitos FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "admins read all planos"
  ON public.planos_perfeitos FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_planos_perfeitos_updated_at
  BEFORE UPDATE ON public.planos_perfeitos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
