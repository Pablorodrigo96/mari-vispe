-- =========================================================
-- Fase 3 — Permissões + Tarefas + Chat Mari + Temperatura
-- =========================================================

-- 1. Permissões: dono por registro
ALTER TABLE equity_brain.contacts
  ADD COLUMN IF NOT EXISTS owner_user_id uuid;

CREATE INDEX IF NOT EXISTS idx_eb_mandates_responsavel ON equity_brain.mandates(responsavel_id);
CREATE INDEX IF NOT EXISTS idx_eb_contacts_owner ON equity_brain.contacts(owner_user_id);

-- Backfill: primeiro admin como dono dos registros sem responsável
DO $$
DECLARE first_admin uuid;
BEGIN
  SELECT user_id INTO first_admin FROM public.user_roles WHERE role='admin' ORDER BY created_at LIMIT 1;
  IF first_admin IS NOT NULL THEN
    UPDATE equity_brain.mandates SET responsavel_id = first_admin WHERE responsavel_id IS NULL;
    UPDATE equity_brain.contacts SET owner_user_id = first_admin WHERE owner_user_id IS NULL;
  END IF;
END $$;

-- 2. Temperatura
ALTER TABLE equity_brain.contacts
  ADD COLUMN IF NOT EXISTS temperature text DEFAULT 'cold',
  ADD COLUMN IF NOT EXISTS temperature_reason text,
  ADD COLUMN IF NOT EXISTS temperature_updated_at timestamptz;

ALTER TABLE equity_brain.mandates
  ADD COLUMN IF NOT EXISTS temperature text DEFAULT 'cold',
  ADD COLUMN IF NOT EXISTS temperature_reason text,
  ADD COLUMN IF NOT EXISTS temperature_updated_at timestamptz;

-- Validação simples
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname='eb_contacts_temperature_chk'
  ) THEN
    ALTER TABLE equity_brain.contacts ADD CONSTRAINT eb_contacts_temperature_chk
      CHECK (temperature IN ('hot','warm','cold'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname='eb_mandates_temperature_chk'
  ) THEN
    ALTER TABLE equity_brain.mandates ADD CONSTRAINT eb_mandates_temperature_chk
      CHECK (temperature IN ('hot','warm','cold'));
  END IF;
END $$;

-- 3. Tarefas
CREATE TABLE IF NOT EXISTS equity_brain.crm_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  due_date date,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','done','dismissed')),
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','ai')),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  entity_type text CHECK (entity_type IN ('mandate','buyer')),
  entity_id uuid,
  assignee_id uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_eb_tasks_assignee ON equity_brain.crm_tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_eb_tasks_entity ON equity_brain.crm_tasks(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_eb_tasks_status ON equity_brain.crm_tasks(status);

ALTER TABLE equity_brain.crm_tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tasks_admin_all" ON equity_brain.crm_tasks;
CREATE POLICY "tasks_admin_all" ON equity_brain.crm_tasks
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(),'admin'::public.app_role));

DROP POLICY IF EXISTS "tasks_owner_view" ON equity_brain.crm_tasks;
CREATE POLICY "tasks_owner_view" ON equity_brain.crm_tasks
  FOR SELECT TO authenticated
  USING (assignee_id = auth.uid() OR created_by = auth.uid());

DROP POLICY IF EXISTS "tasks_owner_insert" ON equity_brain.crm_tasks;
CREATE POLICY "tasks_owner_insert" ON equity_brain.crm_tasks
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() OR public.has_role(auth.uid(),'advisor'::public.app_role));

DROP POLICY IF EXISTS "tasks_owner_update" ON equity_brain.crm_tasks;
CREATE POLICY "tasks_owner_update" ON equity_brain.crm_tasks
  FOR UPDATE TO authenticated
  USING (assignee_id = auth.uid() OR created_by = auth.uid());

-- 4. Mari Chat
CREATE TABLE IF NOT EXISTS equity_brain.mari_chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  entity_type text CHECK (entity_type IN ('mandate','buyer','hub')),
  entity_id uuid,
  role text NOT NULL CHECK (role IN ('user','assistant','system')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_eb_mari_chat_user ON equity_brain.mari_chat_messages(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_eb_mari_chat_entity ON equity_brain.mari_chat_messages(entity_type, entity_id);

ALTER TABLE equity_brain.mari_chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mari_chat_self" ON equity_brain.mari_chat_messages;
CREATE POLICY "mari_chat_self" ON equity_brain.mari_chat_messages
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'::public.app_role));

DROP POLICY IF EXISTS "mari_chat_insert" ON equity_brain.mari_chat_messages;
CREATE POLICY "mari_chat_insert" ON equity_brain.mari_chat_messages
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 5. Access logs
CREATE TABLE IF NOT EXISTS equity_brain.access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  entity_type text,
  entity_id uuid,
  action text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_eb_access_logs_entity ON equity_brain.access_logs(entity_type, entity_id, created_at DESC);

ALTER TABLE equity_brain.access_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "access_logs_admin_view" ON equity_brain.access_logs;
CREATE POLICY "access_logs_admin_view" ON equity_brain.access_logs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'::public.app_role));

DROP POLICY IF EXISTS "access_logs_self_insert" ON equity_brain.access_logs;
CREATE POLICY "access_logs_self_insert" ON equity_brain.access_logs
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 6. Reforço RLS de mandates/contacts (advisor vê apenas seus; admin vê tudo)
DROP POLICY IF EXISTS "eb_mandates_advisor_select" ON equity_brain.mandates;
CREATE POLICY "eb_mandates_advisor_select" ON equity_brain.mandates
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(),'admin'::public.app_role)
    OR responsavel_id = auth.uid()
    OR created_by = auth.uid()
  );

DROP POLICY IF EXISTS "eb_mandates_admin_write" ON equity_brain.mandates;
CREATE POLICY "eb_mandates_admin_write" ON equity_brain.mandates
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(),'admin'::public.app_role)
    OR responsavel_id = auth.uid()
  );

DROP POLICY IF EXISTS "eb_contacts_advisor_select" ON equity_brain.contacts;
CREATE POLICY "eb_contacts_advisor_select" ON equity_brain.contacts
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(),'admin'::public.app_role)
    OR owner_user_id = auth.uid()
    OR created_by = auth.uid()
  );

DROP POLICY IF EXISTS "eb_contacts_advisor_write" ON equity_brain.contacts;
CREATE POLICY "eb_contacts_advisor_write" ON equity_brain.contacts
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(),'admin'::public.app_role)
    OR owner_user_id = auth.uid()
  );