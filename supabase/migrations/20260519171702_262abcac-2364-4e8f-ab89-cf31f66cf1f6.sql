
-- equity_brain: lock _service / service_full policies to service_role
DROP POLICY IF EXISTS ai_runs_service ON equity_brain.ai_runs;
CREATE POLICY ai_runs_service ON equity_brain.ai_runs AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS archetypes_service ON equity_brain.buyer_archetypes;
CREATE POLICY archetypes_service ON equity_brain.buyer_archetypes AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS thetas_write_service ON equity_brain.buyer_revealed_thetas;
CREATE POLICY thetas_write_service ON equity_brain.buyer_revealed_thetas AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS buyer_theses_service_full ON equity_brain.buyer_theses;
CREATE POLICY buyer_theses_service_full ON equity_brain.buyer_theses AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS buyers_service_full ON equity_brain.buyers;
CREATE POLICY buyers_service_full ON equity_brain.buyers AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS callfb_service_all ON equity_brain.call_feedback;
CREATE POLICY callfb_service_all ON equity_brain.call_feedback AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS canonical_service ON equity_brain.canonical_transactions;
CREATE POLICY canonical_service ON equity_brain.canonical_transactions AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS companies_write_service_only ON equity_brain.companies;
CREATE POLICY companies_write_service_only ON equity_brain.companies AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role manages news" ON equity_brain.company_news;
CREATE POLICY "Service role manages news" ON equity_brain.company_news AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS partners_write_service ON equity_brain.company_partners;
CREATE POLICY partners_write_service ON equity_brain.company_partners AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS scores_write_service ON equity_brain.company_scores;
CREATE POLICY scores_write_service ON equity_brain.company_scores AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS signals_write_service ON equity_brain.company_signals;
CREATE POLICY signals_write_service ON equity_brain.company_signals AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS deal_events_service ON equity_brain.deal_events;
CREATE POLICY deal_events_service ON equity_brain.deal_events AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS events_service_all ON equity_brain.events;
CREATE POLICY events_service_all ON equity_brain.events AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role manages summaries" ON equity_brain.mandate_summaries;
CREATE POLICY "Service role manages summaries" ON equity_brain.mandate_summaries AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role manages market waves" ON equity_brain.market_waves;
CREATE POLICY "Service role manages market waves" ON equity_brain.market_waves AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS matches_service_full ON equity_brain.matches;
CREATE POLICY matches_service_full ON equity_brain.matches AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS opp_service_full ON equity_brain.opportunities_ready;
CREATE POLICY opp_service_full ON equity_brain.opportunities_ready AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

-- public: lock service-only write policies to service_role
DROP POLICY IF EXISTS "Service role can write cnpj cache" ON public.cnpj_cache;
CREATE POLICY "Service role can write cnpj cache" ON public.cnpj_cache AS PERMISSIVE FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can update financial docs" ON public.listing_financial_docs;
CREATE POLICY "Service role can update financial docs" ON public.listing_financial_docs AS PERMISSIVE FOR UPDATE TO service_role USING (true);

DROP POLICY IF EXISTS "Service role can insert api usage logs" ON public.api_usage_logs;
CREATE POLICY "Service role can insert api usage logs" ON public.api_usage_logs AS PERMISSIVE FOR INSERT TO service_role WITH CHECK (true);

DROP POLICY IF EXISTS "Service role can insert rate limits" ON public.rate_limits;
CREATE POLICY "Service role can insert rate limits" ON public.rate_limits AS PERMISSIVE FOR INSERT TO service_role WITH CHECK (true);
