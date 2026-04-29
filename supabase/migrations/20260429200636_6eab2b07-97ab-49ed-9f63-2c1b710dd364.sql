
-- Phase 1: Lead qualification system for Equity Brain
-- Adds qualification_status to companies and buyers (independent from existing engagement_status enum)

CREATE TYPE equity_brain.qualification_status AS ENUM ('qualified', 'unqualified');

-- ============== COMPANIES ==============
ALTER TABLE equity_brain.companies
  ADD COLUMN IF NOT EXISTS qualification_status equity_brain.qualification_status NOT NULL DEFAULT 'unqualified',
  ADD COLUMN IF NOT EXISTS qualified_at timestamptz,
  ADD COLUMN IF NOT EXISTS qualified_by uuid,
  ADD COLUMN IF NOT EXISTS qualification_source text;

CREATE INDEX IF NOT EXISTS idx_companies_qualification ON equity_brain.companies(qualification_status);
CREATE INDEX IF NOT EXISTS idx_companies_source_qual ON equity_brain.companies(source, qualification_status);

-- ============== BUYERS ==============
ALTER TABLE equity_brain.buyers
  ADD COLUMN IF NOT EXISTS qualification_status equity_brain.qualification_status NOT NULL DEFAULT 'unqualified',
  ADD COLUMN IF NOT EXISTS qualified_at timestamptz,
  ADD COLUMN IF NOT EXISTS qualified_by uuid,
  ADD COLUMN IF NOT EXISTS qualification_source text;

CREATE INDEX IF NOT EXISTS idx_buyers_qualification ON equity_brain.buyers(qualification_status);

-- ============== BACKFILL: COMPANIES ==============
-- Companies that have a listing on the platform → qualified (inbound_listing)
UPDATE equity_brain.companies SET
  qualification_status = 'qualified',
  qualified_at = COALESCE(qualified_at, now()),
  qualification_source = COALESCE(qualification_source, 'inbound_listing')
WHERE has_listing = true;

-- Companies referenced by an active mandate → qualified (existing_relationship)
UPDATE equity_brain.companies c SET
  qualification_status = 'qualified',
  qualified_at = COALESCE(qualified_at, now()),
  qualification_source = COALESCE(qualification_source, 'existing_relationship')
WHERE EXISTS (SELECT 1 FROM equity_brain.mandates m WHERE m.company_cnpj = c.cnpj)
  AND qualification_status = 'unqualified';

-- Companies with capital_requests in public → qualified (existing_relationship)
UPDATE equity_brain.companies c SET
  qualification_status = 'qualified',
  qualified_at = COALESCE(qualified_at, now()),
  qualification_source = COALESCE(qualification_source, 'existing_relationship')
WHERE EXISTS (
  SELECT 1 FROM public.listings l
  JOIN public.capital_requests cr ON cr.user_id = l.user_id
  WHERE l.cnpj = c.cnpj
) AND qualification_status = 'unqualified';

-- ============== BACKFILL: BUYERS ==============
-- Any buyer NOT created via RFB expansion is considered an existing relationship → qualified
UPDATE equity_brain.buyers SET
  qualification_status = 'qualified',
  qualified_at = COALESCE(qualified_at, now()),
  qualification_source = COALESCE(qualification_source, 'existing_relationship')
WHERE COALESCE(source, '') NOT IN ('rfb_expand');

-- Buyers tied to a paying buyer_profile → qualified
UPDATE equity_brain.buyers b SET
  qualification_status = 'qualified',
  qualified_at = COALESCE(qualified_at, now()),
  qualification_source = COALESCE(qualification_source, 'existing_relationship')
WHERE EXISTS (SELECT 1 FROM public.buyer_profiles bp WHERE bp.source_eb_buyer_id = b.id)
  AND qualification_status = 'unqualified';

-- ============== Helper RPC: qualify_lead ==============
CREATE OR REPLACE FUNCTION public.qualify_lead(
  p_entity_type text,
  p_entity_id text,
  p_source text DEFAULT 'cold_outreach',
  p_notes text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, equity_brain
AS $$
DECLARE
  v_user uuid := auth.uid();
BEGIN
  IF NOT (public.has_role(v_user, 'admin'::app_role) OR public.has_role(v_user, 'advisor'::app_role)) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF p_entity_type = 'company' THEN
    UPDATE equity_brain.companies
       SET qualification_status = 'qualified',
           qualified_at = now(),
           qualified_by = v_user,
           qualification_source = COALESCE(p_source, 'cold_outreach')
     WHERE cnpj = p_entity_id;
  ELSIF p_entity_type = 'buyer' THEN
    UPDATE equity_brain.buyers
       SET qualification_status = 'qualified',
           qualified_at = now(),
           qualified_by = v_user,
           qualification_source = COALESCE(p_source, 'cold_outreach')
     WHERE id = p_entity_id::uuid;
  ELSE
    RAISE EXCEPTION 'invalid entity_type: %', p_entity_type;
  END IF;

  RETURN jsonb_build_object('ok', true, 'entity_type', p_entity_type, 'entity_id', p_entity_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.qualify_lead(text, text, text, text) TO authenticated;

-- ============== Refresh public views to expose new columns ==============
DROP VIEW IF EXISTS public.eb_companies CASCADE;
CREATE VIEW public.eb_companies AS
  SELECT * FROM equity_brain.companies;

GRANT SELECT ON public.eb_companies TO anon, authenticated;
