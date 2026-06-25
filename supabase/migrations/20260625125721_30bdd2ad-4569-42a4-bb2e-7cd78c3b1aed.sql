
-- company_stories: stories importados manualmente pelos fundadores/advisors
CREATE TABLE public.company_stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id uuid NOT NULL REFERENCES public.tokens(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slide_order int NOT NULL DEFAULT 0,
  media_type text NOT NULL CHECK (media_type IN ('image','video','instagram_embed')),
  media_url text NOT NULL,
  caption text,
  source text NOT NULL DEFAULT 'manual_upload' CHECK (source IN ('manual_upload','instagram_link')),
  source_url text,
  published_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_company_stories_token_active ON public.company_stories (token_id, expires_at DESC);
CREATE INDEX idx_company_stories_author ON public.company_stories (author_id);

GRANT SELECT ON public.company_stories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.company_stories TO authenticated;
GRANT ALL ON public.company_stories TO service_role;

ALTER TABLE public.company_stories ENABLE ROW LEVEL SECURITY;

-- SELECT público apenas para slides não expirados
CREATE POLICY "stories_public_read_active"
  ON public.company_stories FOR SELECT
  USING (expires_at > now());

-- Helper: usuário pode gerenciar stories do token se for dono do listing ou advisor/admin
CREATE OR REPLACE FUNCTION public.can_manage_company_stories(_token_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.tokens t
    JOIN public.listings l ON l.id = t.listing_id
    WHERE t.id = _token_id AND l.user_id = _user_id
  ) OR public.has_role(_user_id, 'admin')
    OR public.has_role(_user_id, 'advisor');
$$;

CREATE POLICY "stories_owner_insert"
  ON public.company_stories FOR INSERT
  TO authenticated
  WITH CHECK (author_id = auth.uid() AND public.can_manage_company_stories(token_id, auth.uid()));

CREATE POLICY "stories_owner_update"
  ON public.company_stories FOR UPDATE
  TO authenticated
  USING (public.can_manage_company_stories(token_id, auth.uid()))
  WITH CHECK (public.can_manage_company_stories(token_id, auth.uid()));

CREATE POLICY "stories_owner_delete"
  ON public.company_stories FOR DELETE
  TO authenticated
  USING (public.can_manage_company_stories(token_id, auth.uid()));

-- updated_at trigger
CREATE TRIGGER trg_company_stories_updated
  BEFORE UPDATE ON public.company_stories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
