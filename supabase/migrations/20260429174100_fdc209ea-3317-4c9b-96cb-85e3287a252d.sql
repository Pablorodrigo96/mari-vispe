-- =========================================================
-- Fase 4.A — Schema financeiro M&A (modelo Monday completo)
-- =========================================================

-- 1) ENUMs
DO $$ BEGIN
  CREATE TYPE equity_brain.deal_type AS ENUM
    ('buyside','sellside','spa','due_diligence','cisao','fusao','nbo','match');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE equity_brain.pipeline_stage AS ENUM
    ('match','nbo','due_diligence','spa','closing','closed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE equity_brain.deal_outcome AS ENUM
    ('em_andamento','concluido','cancelado','vencido','vendeu_sozinho');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) Colunas novas
ALTER TABLE equity_brain.mandates
  ADD COLUMN IF NOT EXISTS deal_type        equity_brain.deal_type        DEFAULT 'sellside',
  ADD COLUMN IF NOT EXISTS pipeline_stage   equity_brain.pipeline_stage   DEFAULT 'match',
  ADD COLUMN IF NOT EXISTS outcome          equity_brain.deal_outcome     DEFAULT 'em_andamento',
  ADD COLUMN IF NOT EXISTS valor_operacao   numeric(15,2),
  ADD COLUMN IF NOT EXISTS faturamento_vispe numeric(15,2),
  ADD COLUMN IF NOT EXISTS data_inicio      date,
  ADD COLUMN IF NOT EXISTS data_fechamento  date,
  ADD COLUMN IF NOT EXISTS regiao           text,
  ADD COLUMN IF NOT EXISTS uf               char(2),
  ADD COLUMN IF NOT EXISTS setor            text,
  ADD COLUMN IF NOT EXISTS contato_nome     text,
  ADD COLUMN IF NOT EXISTS contato_telefone text,
  ADD COLUMN IF NOT EXISTS contato_email    text,
  ADD COLUMN IF NOT EXISTS stage_changed_at timestamptz DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_mandates_deal_type ON equity_brain.mandates(deal_type);
CREATE INDEX IF NOT EXISTS idx_mandates_pipeline_stage ON equity_brain.mandates(pipeline_stage);
CREATE INDEX IF NOT EXISTS idx_mandates_outcome ON equity_brain.mandates(outcome);
CREATE INDEX IF NOT EXISTS idx_mandates_uf ON equity_brain.mandates(uf);
CREATE INDEX IF NOT EXISTS idx_mandates_setor ON equity_brain.mandates(setor);

-- 3) Trigger de mudança de estágio
CREATE OR REPLACE FUNCTION equity_brain.tg_track_stage_change()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.pipeline_stage IS DISTINCT FROM OLD.pipeline_stage THEN
    NEW.stage_changed_at := now();
    INSERT INTO equity_brain.crm_activities
      (entity_type, entity_id, activity_type, title, body, created_by)
    VALUES
      ('mandate', NEW.id, 'stage_change',
       'Pipeline: '||COALESCE(OLD.pipeline_stage::text,'-')||' → '||NEW.pipeline_stage::text,
       'Mudança automática de estágio', auth.uid());
  END IF;
  IF NEW.outcome IS DISTINCT FROM OLD.outcome THEN
    INSERT INTO equity_brain.crm_activities
      (entity_type, entity_id, activity_type, title, body, created_by)
    VALUES
      ('mandate', NEW.id, 'outcome_change',
       'Status: '||COALESCE(OLD.outcome::text,'-')||' → '||NEW.outcome::text,
       'Resultado atualizado', auth.uid());
    IF NEW.outcome = 'concluido' AND NEW.data_fechamento IS NULL THEN
      NEW.data_fechamento := CURRENT_DATE;
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_mandate_stage_change ON equity_brain.mandates;
CREATE TRIGGER trg_mandate_stage_change
  BEFORE UPDATE ON equity_brain.mandates
  FOR EACH ROW EXECUTE FUNCTION equity_brain.tg_track_stage_change();

-- 4) View executiva (diferença de datas em meses via dias/30.44)
CREATE OR REPLACE VIEW equity_brain.v_deal_metrics AS
SELECT
  m.id,
  m.company_cnpj,
  c.razao_social AS company_name,
  m.deal_type,
  m.pipeline_stage,
  m.outcome,
  m.status,
  m.exclusividade,
  m.valor_operacao,
  m.faturamento_vispe,
  m.commission_pct,
  m.valor_pedido,
  m.data_inicio,
  m.data_fechamento,
  m.data_assinatura,
  m.data_vencimento,
  m.uf,
  m.regiao,
  m.setor,
  m.responsavel_id,
  m.temperature,
  m.probability,
  EXTRACT(YEAR FROM COALESCE(m.data_inicio, m.created_at::date))::int AS year_started,
  CASE
    WHEN m.outcome = 'concluido' AND m.data_fechamento IS NOT NULL AND m.data_inicio IS NOT NULL
    THEN ROUND(((m.data_fechamento - m.data_inicio)::numeric / 30.44), 1)
    ELSE NULL
  END AS months_to_close,
  m.created_at,
  m.updated_at
FROM equity_brain.mandates m
LEFT JOIN equity_brain.companies c ON c.cnpj = m.company_cnpj;

GRANT SELECT ON equity_brain.v_deal_metrics TO authenticated;

-- 5) RPC de KPIs do dashboard
CREATE OR REPLACE FUNCTION equity_brain.dashboard_kpis()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, equity_brain AS $$
  SELECT jsonb_build_object(
    'total_operations', (SELECT count(*) FROM equity_brain.mandates),
    'buyside',          (SELECT count(*) FROM equity_brain.mandates WHERE deal_type='buyside'),
    'sellside',         (SELECT count(*) FROM equity_brain.mandates WHERE deal_type='sellside'),
    'em_andamento',     (SELECT count(*) FROM equity_brain.mandates WHERE outcome='em_andamento'),
    'concluido',        (SELECT count(*) FROM equity_brain.mandates WHERE outcome='concluido'),
    'cancelado',        (SELECT count(*) FROM equity_brain.mandates WHERE outcome='cancelado'),
    'vencido',          (SELECT count(*) FROM equity_brain.mandates WHERE outcome='vencido'),
    'total_value',      (SELECT COALESCE(sum(valor_operacao),0) FROM equity_brain.mandates WHERE outcome='concluido'),
    'total_commission', (SELECT COALESCE(sum(faturamento_vispe),0) FROM equity_brain.mandates WHERE outcome='concluido'),
    'avg_ticket',       (SELECT COALESCE(avg(valor_operacao),0) FROM equity_brain.mandates WHERE outcome='concluido' AND valor_operacao > 0),
    'exclusividade_pct',(SELECT ROUND(100.0*count(*) FILTER (WHERE exclusividade)/NULLIF(count(*),0),1) FROM equity_brain.mandates),
    'avg_months_close', (SELECT ROUND(AVG((data_fechamento - data_inicio)::numeric / 30.44), 1)
                         FROM equity_brain.mandates
                         WHERE outcome='concluido' AND data_fechamento IS NOT NULL AND data_inicio IS NOT NULL)
  )
$$;

GRANT EXECUTE ON FUNCTION equity_brain.dashboard_kpis() TO authenticated;

-- 6) Cruzamento oferta×demanda
CREATE OR REPLACE FUNCTION equity_brain.match_crosstab(dim text DEFAULT 'uf')
RETURNS TABLE(label text, mandates_count int, buyers_count int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, equity_brain AS $$
  WITH m AS (
    SELECT
      CASE WHEN dim='uf'     THEN uf
           WHEN dim='regiao' THEN regiao
           WHEN dim='setor'  THEN setor
      END AS lbl
    FROM equity_brain.mandates
    WHERE outcome = 'em_andamento' OR status = 'vigente'
  ),
  b AS (
    SELECT unnest(
      CASE WHEN dim='uf'     THEN ufs_interesse
           WHEN dim='regiao' THEN ufs_interesse
           WHEN dim='setor'  THEN setores_interesse
      END
    ) AS lbl
    FROM equity_brain.buyers
    WHERE status = 'ativo'
  )
  SELECT
    COALESCE(m.lbl, b.lbl)::text AS label,
    COUNT(m.lbl)::int AS mandates_count,
    COUNT(b.lbl)::int AS buyers_count
  FROM m FULL OUTER JOIN b ON m.lbl = b.lbl
  WHERE COALESCE(m.lbl, b.lbl) IS NOT NULL
  GROUP BY COALESCE(m.lbl, b.lbl)
  ORDER BY (COUNT(m.lbl) + COUNT(b.lbl)) DESC;
$$;

GRANT EXECUTE ON FUNCTION equity_brain.match_crosstab(text) TO authenticated;