
-- 1) Add percentile multiple columns to existing comps benchmarks
ALTER TABLE public.equity_comps_benchmarks
  ADD COLUMN IF NOT EXISTS multiplo_p25 NUMERIC,
  ADD COLUMN IF NOT EXISTS multiplo_p50 NUMERIC,
  ADD COLUMN IF NOT EXISTS multiplo_p75 NUMERIC,
  ADD COLUMN IF NOT EXISTS multiplo_top10 NUMERIC,
  ADD COLUMN IF NOT EXISTS sample_n INTEGER;

-- Derive percentiles: p25=min+0.15*(max-min), p50=min+0.5*(max-min), p75=max, top10=max*1.15
UPDATE public.equity_comps_benchmarks
SET
  multiplo_p25  = ROUND((multiplo_min + 0.15 * (multiplo_max - multiplo_min))::numeric, 2),
  multiplo_p50  = ROUND((multiplo_min + 0.50 * (multiplo_max - multiplo_min))::numeric, 2),
  multiplo_p75  = ROUND(multiplo_max::numeric, 2),
  multiplo_top10= ROUND((multiplo_max * 1.15)::numeric, 2),
  sample_n      = CASE porte WHEN 'micro' THEN 142 WHEN 'pequena' THEN 88 WHEN 'media' THEN 34 ELSE 12 END
WHERE multiplo_p50 IS NULL;

-- 2) Create dimension benchmarks table
CREATE TABLE IF NOT EXISTS public.equity_dimension_benchmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  arquetipo_id TEXT NOT NULL,
  porte TEXT NOT NULL,
  dimensao_key TEXT NOT NULL,
  p25 NUMERIC NOT NULL,
  p50 NUMERIC NOT NULL,
  p75 NUMERIC NOT NULL,
  p90 NUMERIC NOT NULL,
  sample_n INTEGER NOT NULL DEFAULT 100,
  fonte TEXT NOT NULL DEFAULT 'Vispe comps PME 2025',
  vigencia DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (arquetipo_id, porte, dimensao_key)
);

GRANT SELECT ON public.equity_dimension_benchmarks TO authenticated;
GRANT ALL    ON public.equity_dimension_benchmarks TO service_role;

ALTER TABLE public.equity_dimension_benchmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read dimension benchmarks"
  ON public.equity_dimension_benchmarks FOR SELECT TO authenticated USING (true);

CREATE POLICY "Service role manages dimension benchmarks"
  ON public.equity_dimension_benchmarks FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 3) Seed 108 rows (3 arquétipos × 3 portes × 12 dimensões)
DO $$
DECLARE
  v_arq TEXT;
  v_porte TEXT;
  v_dim TEXT;
  v_base_p50 NUMERIC;
  v_porte_lift NUMERIC;
  v_dim_offset NUMERIC;
  v_p50 NUMERIC;
  v_p25 NUMERIC;
  v_p75 NUMERIC;
  v_p90 NUMERIC;
  v_sample INTEGER;
  arq_bases JSONB := '{
    "servico_profissional": 55,
    "projeto_obra": 48,
    "recorrente": 65
  }'::jsonb;
  porte_lifts JSONB := '{
    "micro": -8,
    "pequena": 0,
    "media": 10
  }'::jsonb;
  dim_keys TEXT[] := ARRAY[
    'independencia_dono','qualidade_receita','margem','higiene_financeira',
    'concentracao','motor_comercial','gestao','processos',
    'contingencias','narrativa','atratividade','societario'
  ];
  dim_offsets JSONB := '{
    "independencia_dono": -10,
    "qualidade_receita": 0,
    "margem": -2,
    "higiene_financeira": 3,
    "concentracao": -6,
    "motor_comercial": -5,
    "gestao": -8,
    "processos": -4,
    "contingencias": 5,
    "narrativa": -3,
    "atratividade": -2,
    "societario": 6
  }'::jsonb;
BEGIN
  FOR v_arq IN SELECT jsonb_object_keys(arq_bases) LOOP
    FOR v_porte IN SELECT jsonb_object_keys(porte_lifts) LOOP
      FOREACH v_dim IN ARRAY dim_keys LOOP
        v_base_p50 := (arq_bases ->> v_arq)::numeric;
        v_porte_lift := (porte_lifts ->> v_porte)::numeric;
        v_dim_offset := (dim_offsets ->> v_dim)::numeric;

        -- Recorrente boost para qualidade_receita
        IF v_arq = 'recorrente' AND v_dim = 'qualidade_receita' THEN
          v_dim_offset := v_dim_offset + 10;
        END IF;
        -- Projeto/obra penalty para qualidade_receita
        IF v_arq = 'projeto_obra' AND v_dim = 'qualidade_receita' THEN
          v_dim_offset := v_dim_offset - 12;
        END IF;

        v_p50 := GREATEST(15, LEAST(90, v_base_p50 + v_porte_lift + v_dim_offset));
        v_p25 := GREATEST(10, v_p50 - 15);
        v_p75 := LEAST(95, v_p50 + 12);
        v_p90 := LEAST(98, v_p50 + 22);
        v_sample := CASE v_porte WHEN 'micro' THEN 142 WHEN 'pequena' THEN 88 ELSE 34 END;

        INSERT INTO public.equity_dimension_benchmarks
          (arquetipo_id, porte, dimensao_key, p25, p50, p75, p90, sample_n)
        VALUES
          (v_arq, v_porte, v_dim, v_p25, v_p50, v_p75, v_p90, v_sample)
        ON CONFLICT (arquetipo_id, porte, dimensao_key) DO NOTHING;
      END LOOP;
    END LOOP;
  END LOOP;
END $$;
