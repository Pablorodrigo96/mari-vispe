
-- ============================================================================
-- FASE 2 — INGESTÃO ISP ANATEL (corrigida com nomes reais das colunas)
-- ============================================================================

-- 1) Bucket privado --------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('isp-anatel', 'isp-anatel', false)
ON CONFLICT (id) DO NOTHING;

-- 2) Storage policies ------------------------------------------------------
DROP POLICY IF EXISTS "ISP Anatel: admins read"   ON storage.objects;
DROP POLICY IF EXISTS "ISP Anatel: admins upload" ON storage.objects;
DROP POLICY IF EXISTS "ISP Anatel: admins delete" ON storage.objects;

CREATE POLICY "ISP Anatel: admins read"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'isp-anatel'
  AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'advisor'))
);

CREATE POLICY "ISP Anatel: admins upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'isp-anatel'
  AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'advisor'))
);

CREATE POLICY "ISP Anatel: admins delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'isp-anatel'
  AND public.has_role(auth.uid(),'admin')
);

-- 3) RLS nas tabelas isp_* -------------------------------------------------
ALTER TABLE equity_brain.isp_anatel_imports       ENABLE ROW LEVEL SECURITY;
ALTER TABLE equity_brain.isp_market_entries       ENABLE ROW LEVEL SECURITY;
ALTER TABLE equity_brain.isp_city_market_stats    ENABLE ROW LEVEL SECURITY;
ALTER TABLE equity_brain.isp_company_market_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE equity_brain.isp_thesis_link          ENABLE ROW LEVEL SECURITY;
ALTER TABLE equity_brain.isp_promotion_log        ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'isp_anatel_imports','isp_market_entries','isp_city_market_stats',
    'isp_company_market_stats','isp_thesis_link','isp_promotion_log'
  ]) LOOP
    EXECUTE format('DROP POLICY IF EXISTS "ISP read admin" ON equity_brain.%I', t);
    EXECUTE format($p$
      CREATE POLICY "ISP read admin" ON equity_brain.%I
      FOR SELECT TO authenticated
      USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'advisor'))
    $p$, t);

    EXECUTE format('DROP POLICY IF EXISTS "ISP write admin" ON equity_brain.%I', t);
    EXECUTE format($p$
      CREATE POLICY "ISP write admin" ON equity_brain.%I
      FOR ALL TO authenticated
      USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'advisor'))
      WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'advisor'))
    $p$, t);
  END LOOP;
END $$;

-- 4) Índice único de dedup -------------------------------------------------
-- Coalesce em ibge_code/technology (NULLs viram '0' / 'NA') para evitar duplicatas
CREATE UNIQUE INDEX IF NOT EXISTS uq_isp_market_entry_dedupe
  ON equity_brain.isp_market_entries (
    cnpj,
    COALESCE(ibge_code, '0'),
    period_ref,
    COALESCE(technology, 'NA')
  );
