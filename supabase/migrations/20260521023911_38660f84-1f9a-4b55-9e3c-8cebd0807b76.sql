
CREATE TABLE IF NOT EXISTS public.prospect_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_advisor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  side TEXT NOT NULL CHECK (side IN ('buy', 'sell')),

  contact_name TEXT NOT NULL,
  contact_first_name TEXT GENERATED ALWAYS AS (split_part(contact_name, ' ', 1)) STORED,
  company_name TEXT NOT NULL,
  cnpj TEXT NULL,
  city TEXT NOT NULL,
  state CHAR(2) NOT NULL,
  sector TEXT NOT NULL,

  email TEXT NULL,
  phone TEXT NULL,
  whatsapp TEXT NULL,
  postal_address TEXT NULL,
  postal_zipcode TEXT NULL,

  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN (
    'new','letter_queued','letter_sent','letter_delivered','contacted',
    'meeting_scheduled','mandate_signed','no_response','declined','archived'
  )),

  source TEXT NOT NULL DEFAULT 'outbound' CHECK (source IN (
    'outbound','cfo_referral','partner_referral','inbound','event','other'
  )),
  source_notes TEXT NULL,

  -- Sem FK porque equity_brain.mandates está em outro schema; valida via app
  converted_to_mandate_id UUID NULL,
  converted_at TIMESTAMPTZ NULL,

  notes TEXT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  last_contact_at TIMESTAMPTZ NULL,
  next_followup_at TIMESTAMPTZ NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_prospect_contacts_updated_at
  BEFORE UPDATE ON public.prospect_contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_prospect_contacts_owner
  ON public.prospect_contacts(owner_advisor_id);
CREATE INDEX IF NOT EXISTS idx_prospect_contacts_status
  ON public.prospect_contacts(status)
  WHERE status NOT IN ('archived', 'mandate_signed');
CREATE INDEX IF NOT EXISTS idx_prospect_contacts_side
  ON public.prospect_contacts(side);
CREATE INDEX IF NOT EXISTS idx_prospect_contacts_followup
  ON public.prospect_contacts(next_followup_at)
  WHERE next_followup_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_prospect_contacts_state
  ON public.prospect_contacts(state);

ALTER TABLE public.prospect_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY prospect_owner_all
  ON public.prospect_contacts FOR ALL TO authenticated
  USING (owner_advisor_id = auth.uid())
  WITH CHECK (owner_advisor_id = auth.uid());

CREATE POLICY prospect_admin_all
  ON public.prospect_contacts FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY prospect_franchisee_read
  ON public.prospect_contacts FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'franchisee'::app_role)
    AND EXISTS (
      SELECT 1 FROM public.franchisee_regions fr
      WHERE fr.user_id = auth.uid()
        AND public.prospect_contacts.state = ANY (fr.states)
    )
  );
