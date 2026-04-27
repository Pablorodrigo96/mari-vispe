-- Mapa categoria do marketplace -> setor M&A do Equity Brain
CREATE OR REPLACE FUNCTION equity_brain.category_to_setor(p_category text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE lower(coalesce(p_category, ''))
    WHEN 'telecom'      THEN 'telecom'
    WHEN 'tech'         THEN 'saas'
    WHEN 'health'       THEN 'saude'
    WHEN 'education'    THEN 'educacao'
    WHEN 'services'     THEN 'servicos_b2b'
    WHEN 'agro'         THEN 'agro'
    WHEN 'energy'       THEN 'energia'
    WHEN 'commerce'     THEN 'varejo'
    WHEN 'food'         THEN 'varejo'
    WHEN 'construction' THEN 'industria'
    WHEN 'industry'     THEN 'industria'
    WHEN 'logistics'    THEN 'servicos_b2b'
    ELSE 'outros'
  END;
$$;

-- Primeiro CNAE típico por categoria (para que o filtro de vertical funcione)
CREATE OR REPLACE FUNCTION equity_brain.category_to_cnae(p_category text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE lower(coalesce(p_category, ''))
    WHEN 'telecom'      THEN '6190601'
    WHEN 'tech'         THEN '6201500'
    WHEN 'health'       THEN '8610101'
    WHEN 'education'    THEN '8513900'
    WHEN 'services'     THEN '8211300'
    WHEN 'agro'         THEN '4623108'
    WHEN 'energy'       THEN '3511500'
    WHEN 'commerce'     THEN '4711301'
    WHEN 'food'         THEN '5611201'
    WHEN 'construction' THEN '4120400'
    WHEN 'industry'     THEN '2829199'
    WHEN 'logistics'    THEN '4930202'
    ELSE NULL
  END;
$$;

-- Porte derivado do faturamento anual
CREATE OR REPLACE FUNCTION equity_brain.porte_from_revenue(p_revenue numeric)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_revenue IS NULL OR p_revenue <= 0 THEN 'ME'
    WHEN p_revenue < 360000      THEN 'ME'
    WHEN p_revenue < 4800000     THEN 'EPP'
    WHEN p_revenue < 300000000   THEN 'MEDIA'
    ELSE 'GRANDE'
  END;
$$;

-- CNPJ "canônico" para um listing: o CNPJ real (só dígitos) ou um sintético LST...
CREATE OR REPLACE FUNCTION equity_brain.cnpj_for_listing(p_listing_id uuid, p_cnpj text)
RETURNS varchar
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  digits text;
  hex_part text;
BEGIN
  digits := regexp_replace(coalesce(p_cnpj, ''), '\D', '', 'g');
  IF length(digits) = 14 THEN
    RETURN digits;
  END IF;
  -- Sintético: LST + 11 dígitos derivados do uuid (estável)
  hex_part := regexp_replace(p_listing_id::text, '\D', '', 'g');
  hex_part := lpad(substr(hex_part, 1, 11), 11, '0');
  RETURN 'LST' || hex_part;
END;
$$;

-- Função que faz UPSERT de uma listing em equity_brain.companies
CREATE OR REPLACE FUNCTION equity_brain.upsert_company_from_listing(p_listing_id uuid)
RETURNS varchar
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, equity_brain
AS $$
DECLARE
  l RECORD;
  v_cnpj varchar;
BEGIN
  SELECT * INTO l FROM public.listings WHERE id = p_listing_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  v_cnpj := equity_brain.cnpj_for_listing(l.id, l.cnpj);

  INSERT INTO equity_brain.companies (
    cnpj, razao_social, nome_fantasia,
    cnae_principal, setor_ma,
    uf, municipio,
    data_abertura, situacao_cadastral,
    capital_social, faturamento_estimado, ebitda_estimado,
    porte,
    has_listing, listing_id,
    source, raw_data, last_enriched_at
  ) VALUES (
    v_cnpj,
    coalesce(l.title, 'Empresa anunciada'),
    l.title,
    equity_brain.category_to_cnae(l.category),
    equity_brain.category_to_setor(l.category),
    l.state,
    l.city,
    CASE WHEN l.foundation_year IS NOT NULL
         THEN make_date(l.foundation_year, 1, 1) END,
    'ATIVA',
    NULL,
    l.annual_revenue,
    l.annual_profit,
    equity_brain.porte_from_revenue(l.annual_revenue),
    true,
    l.id,
    'marketplace_listing',
    jsonb_build_object(
      'listing_id', l.id,
      'title', l.title,
      'category', l.category,
      'plan', l.plan,
      'asking_price', l.asking_price,
      'verified', l.verified
    ),
    now()
  )
  ON CONFLICT (cnpj) DO UPDATE SET
    razao_social         = EXCLUDED.razao_social,
    nome_fantasia        = EXCLUDED.nome_fantasia,
    cnae_principal       = COALESCE(equity_brain.companies.cnae_principal, EXCLUDED.cnae_principal),
    setor_ma             = COALESCE(equity_brain.companies.setor_ma, EXCLUDED.setor_ma),
    uf                   = COALESCE(EXCLUDED.uf, equity_brain.companies.uf),
    municipio            = COALESCE(EXCLUDED.municipio, equity_brain.companies.municipio),
    data_abertura        = COALESCE(equity_brain.companies.data_abertura, EXCLUDED.data_abertura),
    faturamento_estimado = COALESCE(EXCLUDED.faturamento_estimado, equity_brain.companies.faturamento_estimado),
    ebitda_estimado      = COALESCE(EXCLUDED.ebitda_estimado, equity_brain.companies.ebitda_estimado),
    porte                = COALESCE(equity_brain.companies.porte, EXCLUDED.porte),
    has_listing          = true,
    listing_id           = EXCLUDED.listing_id,
    raw_data             = EXCLUDED.raw_data,
    updated_at           = now(),
    last_enriched_at     = now();

  RETURN v_cnpj;
END;
$$;

-- Trigger de sincronização automática
CREATE OR REPLACE FUNCTION equity_brain.trg_sync_listing_to_eb()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, equity_brain
AS $$
BEGIN
  PERFORM equity_brain.upsert_company_from_listing(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_listing_to_equity_brain ON public.listings;
CREATE TRIGGER sync_listing_to_equity_brain
AFTER INSERT OR UPDATE OF title, category, city, state, cnpj, foundation_year, annual_revenue, annual_profit
ON public.listings
FOR EACH ROW
EXECUTE FUNCTION equity_brain.trg_sync_listing_to_eb();

-- Sync inicial de todas as listings já existentes
DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN SELECT id FROM public.listings LOOP
    PERFORM equity_brain.upsert_company_from_listing(r.id);
  END LOOP;
END $$;