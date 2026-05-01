
-- 1) is_synthetic em buyers
ALTER TABLE equity_brain.buyers
  ADD COLUMN IF NOT EXISTS is_synthetic boolean NOT NULL DEFAULT false;

UPDATE equity_brain.buyers
   SET is_synthetic = true
 WHERE nome ~ '#A\d+'
    OR (source = 'marketplace_buyer_profile');

-- 2) Visibilidade CRM: bloqueia CNPJ sintético unqualified
CREATE OR REPLACE FUNCTION equity_brain.is_company_visible_in_crm(_cnpj character varying, _source character varying)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public', 'equity_brain'
AS $function$
  SELECT CASE
    -- ANATEL frio: só visível se promovido
    WHEN _source = 'ANATEL_BANDA_LARGA_FIXA' THEN EXISTS (
      SELECT 1 FROM equity_brain.isp_promotion_log p
      WHERE p.cnpj = _cnpj
        AND p.to_status::text <> 'cold_market_map'
    )
    -- CNPJ sintético (valuation/capital): só visível se EXPLICITAMENTE qualificado
    WHEN (_cnpj LIKE 'VL%' OR _cnpj LIKE 'CR%') THEN EXISTS (
      SELECT 1 FROM equity_brain.companies c
      WHERE c.cnpj = _cnpj
        AND c.qualification_status = 'qualified'
    )
    ELSE true
  END
$function$;

-- 3) Recriar view pública de buyers escondendo sintéticos
CREATE OR REPLACE VIEW public.eb_buyers
WITH (security_invoker = true) AS
SELECT id, nome, tipo, cnpj, website, status, vertical_principal,
       ticket_min, ticket_max, porte_alvo, setores_interesse,
       subsetores_interesse, ufs_interesse, municipios_interesse,
       sinergias_chave, observacoes, deals_realizados, responsavel_id,
       prioridade_global, cautela_flag, cautela_motivo, source,
       created_at, updated_at, ultimo_contato_em
  FROM equity_brain.buyers
 WHERE is_synthetic = false;

-- 4) Recriar matches_enriched filtrando lixo
CREATE OR REPLACE VIEW public.eb_matches_enriched
WITH (security_invoker = true) AS
SELECT m.*
  FROM equity_brain.matches_enriched m
  JOIN equity_brain.companies c ON c.cnpj = m.cnpj
  LEFT JOIN equity_brain.buyers b ON b.id = m.buyer_id
 WHERE equity_brain.is_company_visible_in_crm(c.cnpj, c.source)
   AND coalesce(b.is_synthetic, false) = false;

-- 5) Hard delete dos matches sujos
DELETE FROM equity_brain.matches
 WHERE cnpj LIKE 'VL%'
    OR cnpj LIKE 'CR%'
    OR buyer_id IN (SELECT id FROM equity_brain.buyers WHERE is_synthetic = true);

-- 6) Trigger guard: novo registro com CNPJ sintético entra unqualified
CREATE OR REPLACE FUNCTION equity_brain.guard_synthetic_company_unqualified()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'equity_brain'
AS $$
BEGIN
  IF NEW.cnpj LIKE 'VL%' OR NEW.cnpj LIKE 'CR%' THEN
    -- Só força unqualified se ninguém qualificou explicitamente
    IF NEW.qualification_status IS NULL OR NEW.qualification_status::text NOT IN ('qualified') THEN
      NEW.qualification_status := 'unqualified'::equity_brain.qualification_status_enum;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_synthetic_company_unqualified ON equity_brain.companies;
CREATE TRIGGER trg_guard_synthetic_company_unqualified
BEFORE INSERT OR UPDATE OF cnpj, qualification_status ON equity_brain.companies
FOR EACH ROW
EXECUTE FUNCTION equity_brain.guard_synthetic_company_unqualified();
