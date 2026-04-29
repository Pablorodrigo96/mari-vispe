-- 1) Add 'advisor' to app_role enum if not present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'app_role' AND e.enumlabel = 'advisor'
  ) THEN
    ALTER TYPE public.app_role ADD VALUE 'advisor';
  END IF;
END$$;

-- 2) crm_documents
CREATE TABLE IF NOT EXISTS equity_brain.crm_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL CHECK (entity_type IN ('mandate','buyer')),
  entity_id uuid NOT NULL,
  doc_kind text NOT NULL DEFAULT 'other',
  version int NOT NULL DEFAULT 1,
  file_url text NOT NULL,
  file_name text,
  uploaded_by uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_crm_documents_entity
  ON equity_brain.crm_documents(entity_type, entity_id, created_at DESC);

ALTER TABLE equity_brain.crm_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "crm_docs_admin_all" ON equity_brain.crm_documents;
CREATE POLICY "crm_docs_admin_all" ON equity_brain.crm_documents
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'advisor'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'advisor'));

-- 3) Pipeline financeiro em mandates
ALTER TABLE equity_brain.mandates
  ADD COLUMN IF NOT EXISTS probability int DEFAULT 30,
  ADD COLUMN IF NOT EXISTS expected_close_at date,
  ADD COLUMN IF NOT EXISTS commission_pct numeric DEFAULT 5;

-- 4) match_snapshots
CREATE TABLE IF NOT EXISTS equity_brain.match_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  buyer_id uuid NOT NULL,
  top_mandate_ids uuid[] NOT NULL DEFAULT '{}',
  top_scores numeric[] NOT NULL DEFAULT '{}',
  taken_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_match_snapshots_buyer
  ON equity_brain.match_snapshots(buyer_id, taken_at DESC);

ALTER TABLE equity_brain.match_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "match_snapshots_admin_advisor" ON equity_brain.match_snapshots;
CREATE POLICY "match_snapshots_admin_advisor" ON equity_brain.match_snapshots
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'advisor'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'advisor'));

-- 5) Bucket crm-docs (privado)
INSERT INTO storage.buckets (id, name, public)
VALUES ('crm-docs', 'crm-docs', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "crm_docs_storage_admin_advisor_select" ON storage.objects;
CREATE POLICY "crm_docs_storage_admin_advisor_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'crm-docs'
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'advisor'))
  );

DROP POLICY IF EXISTS "crm_docs_storage_admin_advisor_insert" ON storage.objects;
CREATE POLICY "crm_docs_storage_admin_advisor_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'crm-docs'
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'advisor'))
  );

DROP POLICY IF EXISTS "crm_docs_storage_admin_advisor_delete" ON storage.objects;
CREATE POLICY "crm_docs_storage_admin_advisor_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'crm-docs'
    AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'advisor'))
  );