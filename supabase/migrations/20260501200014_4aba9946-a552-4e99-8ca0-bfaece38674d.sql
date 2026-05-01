-- Bucket privado para arquivos importados do Monday
INSERT INTO storage.buckets (id, name, public)
VALUES ('monday-imports', 'monday-imports', false)
ON CONFLICT (id) DO NOTHING;

-- RLS admin-only no objeto
DROP POLICY IF EXISTS "monday_imports_admin_read" ON storage.objects;
CREATE POLICY "monday_imports_admin_read" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'monday-imports' AND public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "monday_imports_admin_write" ON storage.objects;
CREATE POLICY "monday_imports_admin_write" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'monday-imports' AND public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "monday_imports_admin_update" ON storage.objects;
CREATE POLICY "monday_imports_admin_update" ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'monday-imports' AND public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "monday_imports_admin_delete" ON storage.objects;
CREATE POLICY "monday_imports_admin_delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'monday-imports' AND public.has_role(auth.uid(), 'admin'::app_role));