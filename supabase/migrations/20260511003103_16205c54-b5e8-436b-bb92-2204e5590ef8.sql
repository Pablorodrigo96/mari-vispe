-- Sub-tarefa 2: Enable RLS on public.system_bots
ALTER TABLE public.system_bots ENABLE ROW LEVEL SECURITY;

-- Admin-only SELECT
CREATE POLICY "system_bots_admin_select"
ON public.system_bots
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- No public INSERT/UPDATE/DELETE policies → blocked by default with RLS enabled