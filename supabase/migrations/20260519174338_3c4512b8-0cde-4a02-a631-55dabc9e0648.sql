-- 1) cnpj_cache: restrict public read to authenticated users only
DROP POLICY IF EXISTS "Anyone can read cnpj cache" ON public.cnpj_cache;
CREATE POLICY "Authenticated can read cnpj cache"
  ON public.cnpj_cache
  FOR SELECT
  TO authenticated
  USING (true);

-- 2) listings: ensure anon cannot read sensitive financial / identifying columns.
-- Revoke any broad SELECT from anon and re-grant only safe columns.
REVOKE SELECT ON public.listings FROM anon;
GRANT SELECT (
  id, user_id, title, category, foundation_year, asking_price, hide_price,
  description, neighborhood, city, state, plan, created_at, updated_at,
  ticker, additional_info, verified, show_address, square_meters, rent_value,
  iptu_value, sale_reason, images, status, equity_score, video_url,
  codename_prefix, codename, vdr_readiness
) ON public.listings TO anon;

-- 3) advisor_whatsapp_setup_pending: let the advisor read their own pending row
CREATE POLICY "wa_pending_select_self"
  ON public.advisor_whatsapp_setup_pending
  FOR SELECT
  TO authenticated
  USING (advisor_id = auth.uid());
