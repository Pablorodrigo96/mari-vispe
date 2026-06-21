
ALTER TABLE public.equity_buyer_map
  ADD COLUMN IF NOT EXISTS selecionado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS carta_convite text;

CREATE INDEX IF NOT EXISTS idx_equity_buyer_map_selecionado ON public.equity_buyer_map(assessment_id) WHERE selecionado;
