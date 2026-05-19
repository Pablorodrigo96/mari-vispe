
CREATE TABLE IF NOT EXISTS public.vertical_registry (
  slug TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  short_description TEXT,
  cnae_prefixes TEXT[] NOT NULL DEFAULT '{}',
  metric_1_label TEXT,
  metric_1_unit TEXT,
  metric_2_label TEXT,
  metric_2_unit TEXT,
  color TEXT NOT NULL DEFAULT 'emerald',
  icon TEXT NOT NULL DEFAULT 'Briefcase',
  source_name TEXT,
  source_url TEXT,
  market_page_path TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.vertical_registry ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vertical_registry_read_authenticated" ON public.vertical_registry;
CREATE POLICY "vertical_registry_read_authenticated"
  ON public.vertical_registry FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "vertical_registry_admin_write" ON public.vertical_registry;
CREATE POLICY "vertical_registry_admin_write"
  ON public.vertical_registry FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role))
  WITH CHECK (has_role(auth.uid(),'admin'::app_role));

CREATE TABLE IF NOT EXISTS public.vertical_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vertical_slug TEXT NOT NULL REFERENCES public.vertical_registry(slug) ON DELETE CASCADE,
  cnpj TEXT NOT NULL,
  razao_social TEXT,
  uf TEXT,
  municipio TEXT,
  cnae TEXT,
  metric_1 NUMERIC,
  metric_2 NUMERIC,
  category TEXT,
  raw JSONB,
  source_url TEXT,
  data_corte DATE,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  imported_by UUID,
  promoted_at TIMESTAMPTZ,
  promoted_company_cnpj TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_vertical_imports_dedupe
  ON public.vertical_imports (vertical_slug, cnpj, (COALESCE(data_corte, DATE '1900-01-01')));
CREATE INDEX IF NOT EXISTS idx_vertical_imports_slug ON public.vertical_imports(vertical_slug);
CREATE INDEX IF NOT EXISTS idx_vertical_imports_cnpj ON public.vertical_imports(cnpj);
CREATE INDEX IF NOT EXISTS idx_vertical_imports_uf ON public.vertical_imports(vertical_slug, uf);
CREATE INDEX IF NOT EXISTS idx_vertical_imports_metric1 ON public.vertical_imports(vertical_slug, metric_1 DESC NULLS LAST);

ALTER TABLE public.vertical_imports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vertical_imports_read_advisor_admin" ON public.vertical_imports;
CREATE POLICY "vertical_imports_read_advisor_admin"
  ON public.vertical_imports FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'advisor'::app_role));

DROP POLICY IF EXISTS "vertical_imports_insert_advisor_admin" ON public.vertical_imports;
CREATE POLICY "vertical_imports_insert_advisor_admin"
  ON public.vertical_imports FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'advisor'::app_role));

DROP POLICY IF EXISTS "vertical_imports_update_advisor_admin" ON public.vertical_imports;
CREATE POLICY "vertical_imports_update_advisor_admin"
  ON public.vertical_imports FOR UPDATE TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'advisor'::app_role));

DROP POLICY IF EXISTS "vertical_imports_delete_admin" ON public.vertical_imports;
CREATE POLICY "vertical_imports_delete_admin"
  ON public.vertical_imports FOR DELETE TO authenticated
  USING (has_role(auth.uid(),'admin'::app_role));

CREATE OR REPLACE VIEW public.eb_vertical_uf_summary AS
SELECT
  vi.vertical_slug,
  vr.label AS vertical_label,
  vi.uf,
  COUNT(DISTINCT vi.cnpj)::INT AS n_companies,
  COUNT(DISTINCT vi.municipio)::INT AS n_cities,
  COALESCE(SUM(vi.metric_1), 0)::NUMERIC AS metric_1_sum,
  AVG(NULLIF(vi.metric_1, 0))::NUMERIC AS metric_1_avg,
  COALESCE(SUM(vi.metric_2), 0)::NUMERIC AS metric_2_sum,
  COUNT(*) FILTER (WHERE vi.promoted_at IS NOT NULL)::INT AS n_promoted,
  MAX(vi.data_corte) AS last_data_corte
FROM public.vertical_imports vi
JOIN public.vertical_registry vr ON vr.slug = vi.vertical_slug
WHERE vi.uf IS NOT NULL
GROUP BY vi.vertical_slug, vr.label, vi.uf;

CREATE OR REPLACE VIEW public.eb_vertical_company_stats AS
SELECT
  vi.id,
  vi.vertical_slug,
  vi.cnpj,
  vi.razao_social,
  vi.uf,
  vi.municipio,
  vi.cnae,
  vi.category,
  vi.metric_1,
  vi.metric_2,
  vi.data_corte,
  vi.source_url,
  (vi.promoted_at IS NOT NULL) AS promoted,
  vi.promoted_at,
  ROW_NUMBER() OVER (PARTITION BY vi.vertical_slug, vi.uf ORDER BY vi.metric_1 DESC NULLS LAST) AS rank_uf,
  ROW_NUMBER() OVER (PARTITION BY vi.vertical_slug ORDER BY vi.metric_1 DESC NULLS LAST) AS rank_global
FROM public.vertical_imports vi;

CREATE OR REPLACE FUNCTION public.fn_promote_vertical_lead(p_import_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, equity_brain
AS $$
DECLARE
  v_import public.vertical_imports;
  v_existing_cnpj TEXT;
BEGIN
  IF NOT (has_role(auth.uid(),'admin'::app_role) OR has_role(auth.uid(),'advisor'::app_role)) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT * INTO v_import FROM public.vertical_imports WHERE id = p_import_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'import not found'; END IF;

  IF v_import.promoted_at IS NOT NULL THEN
    RETURN v_import.promoted_company_cnpj;
  END IF;

  SELECT cnpj INTO v_existing_cnpj FROM equity_brain.companies WHERE cnpj = v_import.cnpj;

  IF v_existing_cnpj IS NULL THEN
    INSERT INTO equity_brain.companies (
      cnpj, razao_social, uf, municipio, cnae_principal,
      source, promoted_from, promoted_at, qualification_source, raw_data
    ) VALUES (
      v_import.cnpj,
      COALESCE(v_import.razao_social, '(' || v_import.vertical_slug || ' lead)'),
      v_import.uf,
      v_import.municipio,
      v_import.cnae,
      'vertical:' || v_import.vertical_slug,
      'vertical:' || v_import.vertical_slug,
      now(),
      'vertical_import',
      jsonb_build_object(
        'import_id', v_import.id,
        'metric_1', v_import.metric_1,
        'metric_2', v_import.metric_2,
        'category', v_import.category,
        'source_url', v_import.source_url
      )
    );
  END IF;

  UPDATE public.vertical_imports
  SET promoted_at = now(),
      promoted_company_cnpj = v_import.cnpj
  WHERE id = p_import_id;

  RETURN v_import.cnpj;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_promote_vertical_lead(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_promote_vertical_lead(UUID) TO authenticated;

INSERT INTO public.vertical_registry (slug, label, short_description, cnae_prefixes, metric_1_label, metric_1_unit, color, icon, source_name, source_url, market_page_path, position)
VALUES
  ('isp', 'ISP / Banda Larga', 'Provedores de internet fixa (Anatel SCM)', ARRAY['6110','6190'], 'Acessos', 'un', 'emerald', 'Wifi', 'Anatel SCM', 'https://www.anatel.gov.br/dados/acessos-banda-larga-fixa', '/equity-brain/isp/mercado', 1),
  ('saude', 'Saúde / Clínicas', 'Estabelecimentos de saúde, clínicas e hospitais', ARRAY['8610','8630','8650','8690'], 'Leitos', 'un', 'rose', 'Heart', 'CNES / DataSUS', 'https://cnes.datasus.gov.br', NULL, 2),
  ('educacao', 'Educação privada', 'IES e escolas privadas (e-MEC, INEP)', ARRAY['8511','8512','8513','8520','8531','8532','8533'], 'Alunos', 'un', 'sky', 'GraduationCap', 'INEP / e-MEC', 'https://emec.mec.gov.br', NULL, 3),
  ('energia', 'Energia / GD', 'Geração distribuída e energia renovável', ARRAY['3511','3512','3513','3514','4321'], 'Potência instalada', 'kW', 'amber', 'Zap', 'ANEEL', 'https://dados.gov.br/dados/conjuntos-dados/relacao-de-empreendimentos-de-geracao-distribuida', NULL, 4),
  ('tecnologia', 'Tecnologia / SaaS', 'Empresas de tecnologia, software e SaaS', ARRAY['6201','6202','6203','6204','6209','6311','6319'], 'Headcount tech', 'un', 'violet', 'Cpu', 'RAIS / RFB', NULL, NULL, 5),
  ('cyberseguranca', 'Cybersegurança', 'Empresas de segurança da informação e ciberdefesa', ARRAY['6204','6209','8011','8020'], 'Receita estimada', 'BRL', 'red', 'ShieldCheck', 'RFB + curadoria', NULL, NULL, 6)
ON CONFLICT (slug) DO UPDATE SET
  label = EXCLUDED.label,
  short_description = EXCLUDED.short_description,
  cnae_prefixes = EXCLUDED.cnae_prefixes,
  metric_1_label = EXCLUDED.metric_1_label,
  metric_1_unit = EXCLUDED.metric_1_unit,
  color = EXCLUDED.color,
  icon = EXCLUDED.icon,
  source_name = EXCLUDED.source_name,
  source_url = EXCLUDED.source_url,
  market_page_path = EXCLUDED.market_page_path,
  position = EXCLUDED.position,
  updated_at = now();
