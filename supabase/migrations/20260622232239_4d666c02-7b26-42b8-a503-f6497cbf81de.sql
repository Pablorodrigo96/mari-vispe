
-- ============================================================
-- Fase 1: Plataforma /investir — Tokenização de empresas
-- ============================================================

-- 1. Estende app_role com 'investor'
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'investor';

-- 2. Marca listings que viram ativos tokenizados
ALTER TABLE public.listings
  ADD COLUMN IF NOT EXISTS is_tokenizable boolean NOT NULL DEFAULT false;

-- ============================================================
-- 3. tokens — catálogo de ativos tokenizados
-- ============================================================
CREATE TABLE IF NOT EXISTS public.tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid REFERENCES public.listings(id) ON DELETE SET NULL,
  symbol text NOT NULL UNIQUE,
  name text NOT NULL,
  instrument_type text NOT NULL DEFAULT 'equity', -- equity | debt | cic | receivable | revenue_share
  total_supply numeric(20,8) NOT NULL DEFAULT 0,
  circulating_supply numeric(20,8) NOT NULL DEFAULT 0,
  initial_price numeric(15,2) NOT NULL DEFAULT 0,
  current_reference_price numeric(15,2),
  min_ticket numeric(15,2) NOT NULL DEFAULT 100,
  total_offering_amount numeric(20,2),
  amount_raised numeric(20,2) NOT NULL DEFAULT 0,
  economic_rights text,
  political_rights text,
  transfer_rules text,
  eligibility_restrictions text,
  blockchain_network text,
  smart_contract_address text,
  token_standard text,
  legal_instrument text,
  risk_level text DEFAULT 'medium', -- low | medium | high
  expected_liquidity text DEFAULT 'low',
  offering_opens_at timestamptz,
  offering_closes_at timestamptz,
  issued_at timestamptz,
  status text NOT NULL DEFAULT 'structuring',
  -- structuring | legal_review | approved | issued | primary_open | primary_closed | secondary_open | suspended | closed
  documents jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.tokens TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tokens TO authenticated;
GRANT ALL ON public.tokens TO service_role;
ALTER TABLE public.tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tokens are public to read"
  ON public.tokens FOR SELECT
  USING (true);

CREATE POLICY "Admins manage tokens"
  ON public.tokens FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_tokens_status ON public.tokens(status);
CREATE INDEX IF NOT EXISTS idx_tokens_listing ON public.tokens(listing_id);

-- ============================================================
-- 4. investor_kyc
-- ============================================================
CREATE TABLE IF NOT EXISTS public.investor_kyc (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  status text NOT NULL DEFAULT 'pending', -- pending | in_review | approved | rejected | expired
  full_name text,
  cpf text,
  birth_date date,
  phone text,
  address jsonb DEFAULT '{}'::jsonb,
  documents jsonb DEFAULT '[]'::jsonb,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.investor_kyc TO authenticated;
GRANT ALL ON public.investor_kyc TO service_role;
ALTER TABLE public.investor_kyc ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Investor reads own kyc"
  ON public.investor_kyc FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Investor inserts own kyc"
  ON public.investor_kyc FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Investor updates own kyc when not approved"
  ON public.investor_kyc FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id AND status IN ('pending','rejected'))
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins manage all kyc"
  ON public.investor_kyc FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 5. investor_suitability
-- ============================================================
CREATE TABLE IF NOT EXISTS public.investor_suitability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile text NOT NULL, -- conservador | moderado | agressivo | qualificado | profissional
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  score integer NOT NULL DEFAULT 0,
  valid_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.investor_suitability TO authenticated;
GRANT ALL ON public.investor_suitability TO service_role;
ALTER TABLE public.investor_suitability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Investor manages own suitability"
  ON public.investor_suitability FOR ALL
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_suitability_user ON public.investor_suitability(user_id);

-- ============================================================
-- 6. investor_terms_acceptances
-- ============================================================
CREATE TABLE IF NOT EXISTS public.investor_terms_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  term_type text NOT NULL, -- risk | adhesion | privacy | aml
  version text NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  ip_address text,
  user_agent text
);
GRANT SELECT, INSERT ON public.investor_terms_acceptances TO authenticated;
GRANT ALL ON public.investor_terms_acceptances TO service_role;
ALTER TABLE public.investor_terms_acceptances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Investor reads own term acceptances"
  ON public.investor_terms_acceptances FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Investor inserts own term acceptances"
  ON public.investor_terms_acceptances FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ============================================================
-- 7. financial_wallets
-- ============================================================
CREATE TABLE IF NOT EXISTS public.financial_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  available_balance numeric(20,2) NOT NULL DEFAULT 0,
  blocked_balance numeric(20,2) NOT NULL DEFAULT 0,
  pending_settlement_balance numeric(20,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'BRL',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.financial_wallets TO authenticated;
GRANT ALL ON public.financial_wallets TO service_role;
ALTER TABLE public.financial_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Investor reads own wallet"
  ON public.financial_wallets FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage wallets"
  ON public.financial_wallets FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 8. financial_ledger
-- ============================================================
CREATE TABLE IF NOT EXISTS public.financial_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL, -- deposit | withdrawal | reservation_block | reservation_release | allocation_debit | fee | adjustment
  amount numeric(20,2) NOT NULL,
  balance_before numeric(20,2) NOT NULL,
  balance_after numeric(20,2) NOT NULL,
  reference_type text,
  reference_id uuid,
  status text NOT NULL DEFAULT 'completed',
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.financial_ledger TO authenticated;
GRANT ALL ON public.financial_ledger TO service_role;
ALTER TABLE public.financial_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Investor reads own ledger"
  ON public.financial_ledger FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_ledger_user_created ON public.financial_ledger(user_id, created_at DESC);

-- ============================================================
-- 9. token_positions
-- ============================================================
CREATE TABLE IF NOT EXISTS public.token_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_id uuid NOT NULL REFERENCES public.tokens(id) ON DELETE CASCADE,
  quantity numeric(20,8) NOT NULL DEFAULT 0,
  locked_quantity numeric(20,8) NOT NULL DEFAULT 0,
  average_price numeric(15,2) NOT NULL DEFAULT 0,
  amount_invested numeric(20,2) NOT NULL DEFAULT 0,
  custody_type text NOT NULL DEFAULT 'platform_custodial',
  wallet_address text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, token_id)
);
GRANT SELECT, INSERT, UPDATE ON public.token_positions TO authenticated;
GRANT ALL ON public.token_positions TO service_role;
ALTER TABLE public.token_positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Investor reads own positions"
  ON public.token_positions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage positions"
  ON public.token_positions FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 10. primary_reservations
-- ============================================================
CREATE TABLE IF NOT EXISTS public.primary_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_id uuid NOT NULL REFERENCES public.tokens(id) ON DELETE CASCADE,
  quantity numeric(20,8) NOT NULL,
  unit_price numeric(15,2) NOT NULL,
  total_amount numeric(20,2) NOT NULL,
  status text NOT NULL DEFAULT 'pending_payment',
  -- pending_payment | confirmed | allocated | refunded | cancelled
  compliance_check_id uuid,
  notes text,
  allocated_at timestamptz,
  allocated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.primary_reservations TO authenticated;
GRANT ALL ON public.primary_reservations TO service_role;
ALTER TABLE public.primary_reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Investor reads own reservations"
  ON public.primary_reservations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Investor inserts own reservations"
  ON public.primary_reservations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins manage reservations"
  ON public.primary_reservations FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX IF NOT EXISTS idx_reservations_user ON public.primary_reservations(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reservations_token ON public.primary_reservations(token_id);

-- ============================================================
-- 11. compliance_checks
-- ============================================================
CREATE TABLE IF NOT EXISTS public.compliance_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type text,
  entity_id uuid,
  check_type text NOT NULL, -- kyc | suitability | eligibility | limits | aml
  status text NOT NULL, -- passed | failed | pending
  reason text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.compliance_checks TO authenticated;
GRANT ALL ON public.compliance_checks TO service_role;
ALTER TABLE public.compliance_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Investor reads own checks"
  ON public.compliance_checks FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage checks"
  ON public.compliance_checks FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 12. audit_logs
-- ============================================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  ip_address text,
  user_agent text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read audit logs"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated insert own audit logs"
  ON public.audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id IS NULL OR auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_audit_user ON public.audit_logs(user_id, created_at DESC);

-- ============================================================
-- 13. Trigger updated_at em todas as novas tabelas
-- ============================================================
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'tokens','investor_kyc','investor_suitability','financial_wallets',
    'token_positions','primary_reservations'
  ])
  LOOP
    EXECUTE format($f$
      DROP TRIGGER IF EXISTS trg_%1$s_updated_at ON public.%1$s;
      CREATE TRIGGER trg_%1$s_updated_at
      BEFORE UPDATE ON public.%1$s
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    $f$, t);
  END LOOP;
END$$;

-- ============================================================
-- 14. Auto-cria wallet quando user vira investidor
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_create_investor_wallet()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'investor' THEN
    INSERT INTO public.financial_wallets (user_id)
    VALUES (NEW.user_id)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_investor_wallet ON public.user_roles;
CREATE TRIGGER trg_create_investor_wallet
AFTER INSERT ON public.user_roles
FOR EACH ROW EXECUTE FUNCTION public.fn_create_investor_wallet();

-- ============================================================
-- 15. RPC: alocar reserva (admin)
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_allocate_reservation(_reservation_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.primary_reservations%ROWTYPE;
  w public.financial_wallets%ROWTYPE;
  existing_qty numeric(20,8);
  existing_avg numeric(15,2);
  existing_inv numeric(20,2);
  new_qty numeric(20,8);
  new_inv numeric(20,2);
  new_avg numeric(15,2);
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can allocate reservations';
  END IF;

  SELECT * INTO r FROM public.primary_reservations WHERE id = _reservation_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Reservation not found'; END IF;
  IF r.status <> 'confirmed' THEN
    RAISE EXCEPTION 'Reservation must be confirmed before allocation (current: %)', r.status;
  END IF;

  SELECT * INTO w FROM public.financial_wallets WHERE user_id = r.user_id FOR UPDATE;
  IF w.blocked_balance < r.total_amount THEN
    RAISE EXCEPTION 'Insufficient blocked balance';
  END IF;

  -- Debita blocked balance
  UPDATE public.financial_wallets
    SET blocked_balance = blocked_balance - r.total_amount,
        updated_at = now()
    WHERE user_id = r.user_id;

  INSERT INTO public.financial_ledger (user_id, type, amount, balance_before, balance_after, reference_type, reference_id, description)
  VALUES (r.user_id, 'allocation_debit', r.total_amount, w.blocked_balance, w.blocked_balance - r.total_amount, 'primary_reservation', r.id, 'Alocação de reserva primária');

  -- Upsert position
  SELECT quantity, average_price, amount_invested INTO existing_qty, existing_avg, existing_inv
    FROM public.token_positions WHERE user_id = r.user_id AND token_id = r.token_id;

  IF NOT FOUND THEN
    INSERT INTO public.token_positions (user_id, token_id, quantity, average_price, amount_invested)
    VALUES (r.user_id, r.token_id, r.quantity, r.unit_price, r.total_amount);
  ELSE
    new_qty := existing_qty + r.quantity;
    new_inv := existing_inv + r.total_amount;
    new_avg := CASE WHEN new_qty > 0 THEN new_inv / new_qty ELSE 0 END;
    UPDATE public.token_positions
      SET quantity = new_qty, average_price = new_avg, amount_invested = new_inv, updated_at = now()
      WHERE user_id = r.user_id AND token_id = r.token_id;
  END IF;

  -- Atualiza supply circulante e amount_raised
  UPDATE public.tokens
    SET circulating_supply = circulating_supply + r.quantity,
        amount_raised = amount_raised + r.total_amount,
        updated_at = now()
    WHERE id = r.token_id;

  UPDATE public.primary_reservations
    SET status = 'allocated', allocated_at = now(), allocated_by = auth.uid(), updated_at = now()
    WHERE id = _reservation_id;

  INSERT INTO public.audit_logs (user_id, admin_id, action, entity_type, entity_id)
  VALUES (r.user_id, auth.uid(), 'reservation.allocated', 'primary_reservation', r.id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_allocate_reservation(uuid) TO authenticated;
