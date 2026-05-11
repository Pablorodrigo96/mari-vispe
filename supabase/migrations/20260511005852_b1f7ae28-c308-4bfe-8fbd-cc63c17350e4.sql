-- Performance indexes on FK/status columns frequently filtered in queries.
-- All idempotent via IF NOT EXISTS. No data changes.

CREATE INDEX IF NOT EXISTS idx_valuation_history_user_id ON public.valuation_history(user_id);
CREATE INDEX IF NOT EXISTS idx_valuation_history_created_at ON public.valuation_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_valuation_purchases_user_id ON public.valuation_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_valuation_purchases_status ON public.valuation_purchases(status);

CREATE INDEX IF NOT EXISTS idx_capital_requests_user_id ON public.capital_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_capital_requests_status ON public.capital_requests(status);
CREATE INDEX IF NOT EXISTS idx_capital_requests_user_status ON public.capital_requests(user_id, status);
CREATE INDEX IF NOT EXISTS idx_capital_requests_assigned_admin ON public.capital_requests(assigned_admin_id);

CREATE INDEX IF NOT EXISTS idx_capital_matches_request_id ON public.capital_matches(request_id);
CREATE INDEX IF NOT EXISTS idx_capital_matches_provider_id ON public.capital_matches(provider_id);

CREATE INDEX IF NOT EXISTS idx_capital_messages_request_id ON public.capital_messages(request_id);
CREATE INDEX IF NOT EXISTS idx_capital_messages_sender_id ON public.capital_messages(sender_id);

CREATE INDEX IF NOT EXISTS idx_capital_timeline_request_id ON public.capital_timeline(request_id);

CREATE INDEX IF NOT EXISTS idx_capital_providers_active ON public.capital_providers(active);

CREATE INDEX IF NOT EXISTS idx_interest_logs_listing_id ON public.interest_logs(listing_id);
CREATE INDEX IF NOT EXISTS idx_interest_logs_user_id ON public.interest_logs(user_id);

CREATE INDEX IF NOT EXISTS idx_messages_listing_id ON public.messages(listing_id);

CREATE INDEX IF NOT EXISTS idx_partner_activities_partner_user_id ON public.partner_activities(partner_user_id);

CREATE INDEX IF NOT EXISTS idx_franchisee_regions_user_id ON public.franchisee_regions(user_id);
CREATE INDEX IF NOT EXISTS idx_franchisee_requests_user_id ON public.franchisee_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_franchisee_requests_status ON public.franchisee_requests(status);

CREATE INDEX IF NOT EXISTS idx_advisor_requests_user_id ON public.advisor_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_advisor_requests_status ON public.advisor_requests(status);