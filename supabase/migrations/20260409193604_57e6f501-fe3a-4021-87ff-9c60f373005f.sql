
-- 1. Enrich capital_requests
ALTER TABLE public.capital_requests
  ADD COLUMN IF NOT EXISTS company_age_months integer,
  ADD COLUMN IF NOT EXISTS lead_score integer,
  ADD COLUMN IF NOT EXISTS success_fee_pct numeric DEFAULT 3,
  ADD COLUMN IF NOT EXISTS estimated_rate_min numeric,
  ADD COLUMN IF NOT EXISTS estimated_rate_max numeric,
  ADD COLUMN IF NOT EXISTS estimated_approval integer,
  ADD COLUMN IF NOT EXISTS matched_providers_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS assigned_admin_id uuid,
  ADD COLUMN IF NOT EXISTS sla_deadline timestamptz,
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS utm_source text,
  ADD COLUMN IF NOT EXISTS utm_medium text,
  ADD COLUMN IF NOT EXISTS utm_campaign text;

-- 2. capital_providers
CREATE TABLE public.capital_providers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  type text NOT NULL,
  ticket_min numeric,
  ticket_max numeric,
  sectors text[] DEFAULT '{}',
  regions text[] DEFAULT '{}',
  instruments text[] DEFAULT '{}',
  contact_email text,
  webhook_url text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.capital_providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active providers"
  ON public.capital_providers FOR SELECT
  USING (active = true);

CREATE POLICY "Admins can manage providers"
  ON public.capital_providers FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 3. capital_matches
CREATE TABLE public.capital_matches (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id uuid NOT NULL REFERENCES public.capital_requests(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES public.capital_providers(id) ON DELETE CASCADE,
  match_score integer,
  status text DEFAULT 'suggested',
  notified_at timestamptz,
  responded_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.capital_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view own matches"
  ON public.capital_matches FOR SELECT
  TO authenticated
  USING (request_id IN (SELECT id FROM public.capital_requests WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage matches"
  ON public.capital_matches FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 4. capital_documents
CREATE TABLE public.capital_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id uuid NOT NULL REFERENCES public.capital_requests(id) ON DELETE CASCADE,
  doc_type text NOT NULL,
  file_url text NOT NULL,
  status text DEFAULT 'pending',
  uploaded_by uuid,
  uploaded_at timestamptz DEFAULT now()
);

ALTER TABLE public.capital_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view own documents"
  ON public.capital_documents FOR SELECT
  TO authenticated
  USING (request_id IN (SELECT id FROM public.capital_requests WHERE user_id = auth.uid()));

CREATE POLICY "Owners can insert own documents"
  ON public.capital_documents FOR INSERT
  TO authenticated
  WITH CHECK (request_id IN (SELECT id FROM public.capital_requests WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage documents"
  ON public.capital_documents FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 5. capital_timeline
CREATE TABLE public.capital_timeline (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id uuid NOT NULL REFERENCES public.capital_requests(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  description text,
  actor_id uuid,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.capital_timeline ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view own timeline"
  ON public.capital_timeline FOR SELECT
  TO authenticated
  USING (request_id IN (SELECT id FROM public.capital_requests WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage timeline"
  ON public.capital_timeline FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 6. capital_messages
CREATE TABLE public.capital_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id uuid NOT NULL REFERENCES public.capital_requests(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  message text NOT NULL,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.capital_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view messages"
  ON public.capital_messages FOR SELECT
  TO authenticated
  USING (
    request_id IN (SELECT id FROM public.capital_requests WHERE user_id = auth.uid())
    OR request_id IN (SELECT id FROM public.capital_requests WHERE assigned_admin_id = auth.uid())
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Participants can insert messages"
  ON public.capital_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND (
      request_id IN (SELECT id FROM public.capital_requests WHERE user_id = auth.uid())
      OR request_id IN (SELECT id FROM public.capital_requests WHERE assigned_admin_id = auth.uid())
      OR public.has_role(auth.uid(), 'admin')
    )
  );

-- 7. Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.capital_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.capital_timeline;
