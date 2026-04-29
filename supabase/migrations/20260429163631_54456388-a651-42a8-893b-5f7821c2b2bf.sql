
DROP VIEW IF EXISTS public.eb_mandates;
CREATE VIEW public.eb_mandates WITH (security_invoker=true) AS
SELECT * FROM equity_brain.mandates;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.eb_mandates TO authenticated;

DROP VIEW IF EXISTS public.eb_contacts;
CREATE VIEW public.eb_contacts WITH (security_invoker=true) AS
SELECT * FROM equity_brain.contacts;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.eb_contacts TO authenticated;

DROP VIEW IF EXISTS public.eb_crm_activities;
CREATE VIEW public.eb_crm_activities WITH (security_invoker=true) AS
SELECT * FROM equity_brain.crm_activities;
GRANT SELECT, INSERT ON public.eb_crm_activities TO authenticated;

DROP VIEW IF EXISTS public.eb_buyer_preferences_history;
CREATE VIEW public.eb_buyer_preferences_history WITH (security_invoker=true) AS
SELECT * FROM equity_brain.buyer_preferences_history;
GRANT SELECT ON public.eb_buyer_preferences_history TO authenticated;
