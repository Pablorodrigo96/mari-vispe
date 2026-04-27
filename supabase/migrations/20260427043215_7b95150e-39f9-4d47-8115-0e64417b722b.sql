-- Permitir que admins/advisors criem e editem buyers e teses pelo cockpit
DROP POLICY IF EXISTS "buyers_write_admins_advisors" ON equity_brain.buyers;
CREATE POLICY "buyers_write_admins_advisors"
ON equity_brain.buyers FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'advisor')
)
WITH CHECK (
  public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'advisor')
);

DROP POLICY IF EXISTS "buyer_theses_write_admins_advisors" ON equity_brain.buyer_theses;
CREATE POLICY "buyer_theses_write_admins_advisors"
ON equity_brain.buyer_theses FOR ALL TO authenticated
USING (
  public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'advisor')
)
WITH CHECK (
  public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'advisor')
);