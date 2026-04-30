-- Trigger de proteção: ISP Anatel só muda qualification_status via eb-promote-cold-isp
-- (que grava em isp_promotion_log antes do UPDATE, dentro de janela de 5s).

CREATE OR REPLACE FUNCTION equity_brain.guard_isp_promotion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.source = 'ANATEL_BANDA_LARGA_FIXA'
     AND OLD.qualification_status IS DISTINCT FROM NEW.qualification_status
     AND NOT EXISTS (
       SELECT 1
         FROM equity_brain.isp_promotion_log
        WHERE cnpj = NEW.cnpj
          AND to_status = NEW.qualification_status
          AND promoted_at > now() - interval '5 seconds'
     )
  THEN
    RAISE EXCEPTION
      'ISP Anatel: mudança de qualification_status só via eb-promote-cold-isp (cnpj=%, from=%, to=%)',
      NEW.cnpj, OLD.qualification_status, NEW.qualification_status;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_isp_promotion ON equity_brain.companies;

CREATE TRIGGER trg_guard_isp_promotion
  BEFORE UPDATE OF qualification_status
  ON equity_brain.companies
  FOR EACH ROW
  EXECUTE FUNCTION equity_brain.guard_isp_promotion();

COMMENT ON FUNCTION equity_brain.guard_isp_promotion() IS
  'Bloqueia UPDATE direto em qualification_status para companies ANATEL_BANDA_LARGA_FIXA. Promoção legítima passa pela edge function eb-promote-cold-isp, que insere em isp_promotion_log dentro de 5s antes do UPDATE.';