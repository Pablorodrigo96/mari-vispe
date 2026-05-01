-- Fase 1/4 — Paridade Monday

-- 1. Campos novos em equity_brain.mandates
ALTER TABLE equity_brain.mandates
  ADD COLUMN IF NOT EXISTS padrinho_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cross_sell_flags text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS monday_item_id text,
  ADD COLUMN IF NOT EXISTS imported_from text,
  ADD COLUMN IF NOT EXISTS imported_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'mandates_monday_item_id_key'
      AND conrelid = 'equity_brain.mandates'::regclass
  ) THEN
    ALTER TABLE equity_brain.mandates
      ADD CONSTRAINT mandates_monday_item_id_key UNIQUE (monday_item_id);
  END IF;
END $$;

COMMENT ON COLUMN equity_brain.mandates.padrinho_id IS
  'Advisor secundário (executivo padrinho do Monday Buyside)';
COMMENT ON COLUMN equity_brain.mandates.cross_sell_flags IS
  'Flags de cross-sell (ex: valuation, captacao, sucessao)';
COMMENT ON COLUMN equity_brain.mandates.monday_item_id IS
  'Item ID original do Monday — usado em re-imports incrementais';
COMMENT ON COLUMN equity_brain.mandates.imported_from IS
  'Origem do import (ex: monday_buyside, monday_sellside)';
COMMENT ON COLUMN equity_brain.mandates.imported_at IS
  'Timestamp do último import incremental';

CREATE INDEX IF NOT EXISTS idx_mandates_padrinho
  ON equity_brain.mandates(padrinho_id) WHERE padrinho_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mandates_monday_id
  ON equity_brain.mandates(monday_item_id) WHERE monday_item_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_mandates_imported
  ON equity_brain.mandates(imported_from, imported_at)
  WHERE imported_from IS NOT NULL;

-- 2. Tabela mandate_subtasks (subelementos do Monday)
CREATE TABLE IF NOT EXISTS equity_brain.mandate_subtasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mandate_id uuid NOT NULL REFERENCES equity_brain.mandates(id) ON DELETE CASCADE,
  name text NOT NULL,
  etapa text,
  responsavel_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente','em_andamento','concluido','cancelado','bloqueado')),
  data_entrega date,
  arquivos_url text[] DEFAULT '{}',
  anotacoes text,
  monday_subitem_id text,
  ordem int DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mandate_subtasks_mandate
  ON equity_brain.mandate_subtasks(mandate_id);
CREATE INDEX IF NOT EXISTS idx_mandate_subtasks_responsavel
  ON equity_brain.mandate_subtasks(responsavel_id);
CREATE INDEX IF NOT EXISTS idx_mandate_subtasks_monday
  ON equity_brain.mandate_subtasks(monday_subitem_id)
  WHERE monday_subitem_id IS NOT NULL;

ALTER TABLE equity_brain.mandate_subtasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subtasks_select_by_mandate_access" ON equity_brain.mandate_subtasks;
CREATE POLICY "subtasks_select_by_mandate_access"
  ON equity_brain.mandate_subtasks FOR SELECT
  USING (
    mandate_id IN (
      SELECT id FROM equity_brain.mandates
      WHERE responsavel_id = auth.uid()
        OR padrinho_id = auth.uid()
        OR origin_advisor_id = auth.uid()
        OR auth.uid() = ANY(co_advisor_ids)
    )
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );

DROP POLICY IF EXISTS "subtasks_insert_by_mandate_owner" ON equity_brain.mandate_subtasks;
CREATE POLICY "subtasks_insert_by_mandate_owner"
  ON equity_brain.mandate_subtasks FOR INSERT
  WITH CHECK (
    mandate_id IN (
      SELECT id FROM equity_brain.mandates
      WHERE responsavel_id = auth.uid() OR padrinho_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );

DROP POLICY IF EXISTS "subtasks_update_by_owner_or_responsavel" ON equity_brain.mandate_subtasks;
CREATE POLICY "subtasks_update_by_owner_or_responsavel"
  ON equity_brain.mandate_subtasks FOR UPDATE
  USING (
    responsavel_id = auth.uid()
    OR mandate_id IN (
      SELECT id FROM equity_brain.mandates
      WHERE responsavel_id = auth.uid() OR padrinho_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
  );

DROP POLICY IF EXISTS "subtasks_delete_by_admin_only" ON equity_brain.mandate_subtasks;
CREATE POLICY "subtasks_delete_by_admin_only"
  ON equity_brain.mandate_subtasks FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE OR REPLACE FUNCTION equity_brain.tg_subtasks_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_subtasks_updated_at ON equity_brain.mandate_subtasks;
CREATE TRIGGER trg_subtasks_updated_at
  BEFORE UPDATE ON equity_brain.mandate_subtasks
  FOR EACH ROW EXECUTE FUNCTION equity_brain.tg_subtasks_updated_at();

-- 3. Tabela advisors_pending_mapping
CREATE TABLE IF NOT EXISTS equity_brain.advisors_pending_mapping (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  monday_name text NOT NULL UNIQUE,
  occurrences int NOT NULL DEFAULT 1,
  resolved_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  resolved_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE equity_brain.advisors_pending_mapping ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "advisor_mapping_admin_only" ON equity_brain.advisors_pending_mapping;
CREATE POLICY "advisor_mapping_admin_only"
  ON equity_brain.advisors_pending_mapping FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 4. mari_ops já existe (Fase 0). Apenas log informativo.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='mari_ops' AND table_name='health_check') THEN
    RAISE NOTICE 'mari_ops.health_check ja existe — skip';
  END IF;
END $$;