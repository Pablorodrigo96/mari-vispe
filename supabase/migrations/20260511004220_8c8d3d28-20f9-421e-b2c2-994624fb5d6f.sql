-- Sub-tarefa 4: Restringir policies abertas em equity_brain.deals
-- Substitui USING(true) por policies role-based (admin / advisor / owner)

DROP POLICY IF EXISTS deals_authenticated_select ON equity_brain.deals;
DROP POLICY IF EXISTS deals_authenticated_insert ON equity_brain.deals;
DROP POLICY IF EXISTS deals_authenticated_update ON equity_brain.deals;

-- SELECT: admin, advisor (CRM ops) ou dono do deal
CREATE POLICY deals_select_role_based ON equity_brain.deals
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'advisor'::public.app_role)
    OR owner_user_id = auth.uid()
  );

-- INSERT: admin ou advisor; owner_user_id deve ser o próprio caller quando setado
CREATE POLICY deals_insert_role_based ON equity_brain.deals
  FOR INSERT TO authenticated
  WITH CHECK (
    (
      public.has_role(auth.uid(), 'admin'::public.app_role)
      OR public.has_role(auth.uid(), 'advisor'::public.app_role)
    )
    AND (owner_user_id IS NULL OR owner_user_id = auth.uid())
  );

-- UPDATE: admin, advisor ou dono
CREATE POLICY deals_update_role_based ON equity_brain.deals
  FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'advisor'::public.app_role)
    OR owner_user_id = auth.uid()
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'advisor'::public.app_role)
    OR owner_user_id = auth.uid()
  );
