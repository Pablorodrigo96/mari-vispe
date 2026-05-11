
-- Garante o schema equity_brain (já existe, mas idempotente)
CREATE SCHEMA IF NOT EXISTS equity_brain;

-- =====================================================
-- 1. sector_research — cache de pesquisa setorial
-- =====================================================
CREATE TABLE IF NOT EXISTS equity_brain.sector_research (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  setor_slug text NOT NULL UNIQUE,
  setor_nome_completo text NOT NULL,
  periodo_referencia text,
  data_geracao date NOT NULL DEFAULT CURRENT_DATE,
  expires_at timestamptz NOT NULL,
  payload_json jsonb NOT NULL,
  fontes_primarias text[] DEFAULT '{}'::text[],
  custo_geracao_usd numeric(10,4) DEFAULT 0,
  tokens_usados integer DEFAULT 0,
  geracao_status text NOT NULL DEFAULT 'success',
  geracao_erro text,
  geracao_duration_ms integer,
  refresh_count integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sector_research_status_chk
    CHECK (geracao_status IN ('success','partial','failed'))
);

CREATE INDEX IF NOT EXISTS idx_sector_research_slug
  ON equity_brain.sector_research(setor_slug);
CREATE INDEX IF NOT EXISTS idx_sector_research_expires
  ON equity_brain.sector_research(expires_at);

ALTER TABLE equity_brain.sector_research ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sector_research_read_all ON equity_brain.sector_research;
CREATE POLICY sector_research_read_all ON equity_brain.sector_research
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS sector_research_admin_insert ON equity_brain.sector_research;
CREATE POLICY sector_research_admin_insert ON equity_brain.sector_research
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role)
           OR public.has_role(auth.uid(), 'advisor'::public.app_role));

DROP POLICY IF EXISTS sector_research_admin_update ON equity_brain.sector_research;
CREATE POLICY sector_research_admin_update ON equity_brain.sector_research
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'advisor'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role)
           OR public.has_role(auth.uid(), 'advisor'::public.app_role));

DROP POLICY IF EXISTS sector_research_admin_delete ON equity_brain.sector_research;
CREATE POLICY sector_research_admin_delete ON equity_brain.sector_research
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- updated_at trigger
CREATE OR REPLACE FUNCTION equity_brain.tg_sector_research_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_sector_research_updated_at ON equity_brain.sector_research;
CREATE TRIGGER trg_sector_research_updated_at
  BEFORE UPDATE ON equity_brain.sector_research
  FOR EACH ROW EXECUTE FUNCTION equity_brain.tg_sector_research_updated_at();

-- =====================================================
-- 2. cnae_to_sector_mapping
-- =====================================================
CREATE TABLE IF NOT EXISTS equity_brain.cnae_to_sector_mapping (
  cnae text PRIMARY KEY,
  setor_slug text NOT NULL,
  setor_nome text NOT NULL,
  prioridade integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE equity_brain.cnae_to_sector_mapping ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cnae_map_read_all ON equity_brain.cnae_to_sector_mapping;
CREATE POLICY cnae_map_read_all ON equity_brain.cnae_to_sector_mapping
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS cnae_map_admin_write ON equity_brain.cnae_to_sector_mapping;
CREATE POLICY cnae_map_admin_write ON equity_brain.cnae_to_sector_mapping
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Seed inicial (12 CNAEs principais)
INSERT INTO equity_brain.cnae_to_sector_mapping (cnae, setor_slug, setor_nome) VALUES
  ('61.10-8-01', 'isp-banda-larga', 'ISPs de Banda Larga Fixa'),
  ('61.90-6-01', 'isp-banda-larga', 'ISPs de Banda Larga Fixa'),
  ('61.20-5-01', 'telecom-movel', 'Telecom Móvel'),
  ('62.01-5-00', 'tech-saas', 'Tecnologia e SaaS B2B'),
  ('62.04-0-00', 'tech-saas', 'Tecnologia e SaaS B2B'),
  ('86.10-1-01', 'saude-hospitais', 'Hospitais e Saúde'),
  ('86.30-5-01', 'saude-clinicas', 'Clínicas Médicas'),
  ('47.13-0-04', 'varejo-supermercado', 'Varejo Supermercado'),
  ('35.11-5-01', 'energia-eletrica', 'Geração de Energia Elétrica'),
  ('64.10-7-00', 'bancos-digitais', 'Bancos e Fintechs'),
  ('49.30-2-01', 'logistica-rodoviaria', 'Logística Rodoviária'),
  ('85.99-6-04', 'educacao-cursos', 'Educação e Cursos Livres')
ON CONFLICT (cnae) DO NOTHING;

-- =====================================================
-- 3. RPC: get_sector_for_user
-- =====================================================
CREATE OR REPLACE FUNCTION public.get_sector_for_user(_user_id uuid DEFAULT auth.uid())
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, equity_brain
AS $$
DECLARE
  v_cnae text;
  v_slug text;
  v_category text;
BEGIN
  IF _user_id IS NULL THEN
    RETURN 'isp-banda-larga';
  END IF;

  -- 1) CNAE do anúncio mais recente
  SELECT l.cnae INTO v_cnae
  FROM public.listings l
  WHERE l.user_id = _user_id AND l.cnae IS NOT NULL
  ORDER BY l.created_at DESC
  LIMIT 1;

  IF v_cnae IS NOT NULL THEN
    SELECT m.setor_slug INTO v_slug
    FROM equity_brain.cnae_to_sector_mapping m
    WHERE m.cnae = v_cnae
    ORDER BY m.prioridade DESC
    LIMIT 1;
    IF v_slug IS NOT NULL THEN RETURN v_slug; END IF;
  END IF;

  -- 2) Categoria de buyer_profiles
  SELECT (b.categories[1])::text INTO v_category
  FROM public.buyer_profiles b
  WHERE b.user_id = _user_id
    AND b.categories IS NOT NULL
    AND array_length(b.categories, 1) > 0
  ORDER BY b.created_at DESC
  LIMIT 1;

  IF v_category IS NOT NULL THEN
    v_slug := CASE lower(v_category)
      WHEN 'tecnologia' THEN 'tech-saas'
      WHEN 'telecom' THEN 'telecom-movel'
      WHEN 'isp' THEN 'isp-banda-larga'
      WHEN 'saúde' THEN 'saude-clinicas'
      WHEN 'saude' THEN 'saude-clinicas'
      WHEN 'educação' THEN 'educacao-cursos'
      WHEN 'educacao' THEN 'educacao-cursos'
      WHEN 'varejo' THEN 'varejo-supermercado'
      WHEN 'logística' THEN 'logistica-rodoviaria'
      WHEN 'logistica' THEN 'logistica-rodoviaria'
      WHEN 'energia' THEN 'energia-eletrica'
      WHEN 'finanças' THEN 'bancos-digitais'
      WHEN 'financas' THEN 'bancos-digitais'
      ELSE NULL
    END;
    IF v_slug IS NOT NULL THEN RETURN v_slug; END IF;
  END IF;

  -- 3) Fallback
  RETURN 'isp-banda-larga';
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_sector_for_user(uuid) TO authenticated;
