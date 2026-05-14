
ALTER FUNCTION equity_brain.bucket_employees(integer) SET search_path = equity_brain, public, pg_temp;
ALTER FUNCTION equity_brain.bucket_revenue(numeric) SET search_path = equity_brain, public, pg_temp;
ALTER FUNCTION equity_brain.category_to_cnae(text) SET search_path = equity_brain, public, pg_temp;
ALTER FUNCTION equity_brain.category_to_setor(text) SET search_path = equity_brain, public, pg_temp;
ALTER FUNCTION equity_brain.cnpj_for_listing(uuid, text) SET search_path = equity_brain, public, pg_temp;
ALTER FUNCTION equity_brain.derive_codename_prefix(text) SET search_path = equity_brain, public, pg_temp;
ALTER FUNCTION equity_brain.entity_notes_touch() SET search_path = equity_brain, public, pg_temp;
ALTER FUNCTION equity_brain.margin_score(numeric, numeric) SET search_path = equity_brain, public, pg_temp;
ALTER FUNCTION equity_brain.next_codename(text) SET search_path = equity_brain, public, pg_temp;
ALTER FUNCTION equity_brain.porte_from_revenue(numeric) SET search_path = equity_brain, public, pg_temp;
ALTER FUNCTION equity_brain.revenue_tier_score(numeric) SET search_path = equity_brain, public, pg_temp;
ALTER FUNCTION equity_brain.set_company_codename() SET search_path = equity_brain, public, pg_temp;
ALTER FUNCTION equity_brain.set_updated_at() SET search_path = equity_brain, public, pg_temp;
ALTER FUNCTION equity_brain.tg_bump_mandate_last_activity() SET search_path = equity_brain, public, pg_temp;
ALTER FUNCTION equity_brain.tg_sector_research_updated_at() SET search_path = equity_brain, public, pg_temp;
ALTER FUNCTION equity_brain.tg_set_updated_at() SET search_path = equity_brain, public, pg_temp;
ALTER FUNCTION equity_brain.touch_deals_updated_at() SET search_path = equity_brain, public, pg_temp;

ALTER FUNCTION public.buyer_neutral_description(text[], text[], numeric, numeric) SET search_path = public, pg_temp;
ALTER FUNCTION public.buyer_pseudonym(uuid, text) SET search_path = public, pg_temp;
ALTER FUNCTION public.eb_pipeline_stages_set_updated_at() SET search_path = public, pg_temp;

DROP POLICY IF EXISTS "Avatars readable by authenticated (list)" ON storage.objects;
DROP POLICY IF EXISTS "Listing images readable by authenticated (list)" ON storage.objects;
