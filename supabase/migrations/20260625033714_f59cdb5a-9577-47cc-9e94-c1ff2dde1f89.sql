
-- company_follows
CREATE TABLE public.company_follows (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_id uuid NOT NULL REFERENCES public.tokens(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, token_id)
);
GRANT SELECT, INSERT, DELETE ON public.company_follows TO authenticated;
GRANT SELECT ON public.company_follows TO anon;
GRANT ALL ON public.company_follows TO service_role;
ALTER TABLE public.company_follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read follows" ON public.company_follows FOR SELECT USING (true);
CREATE POLICY "own follow insert" ON public.company_follows FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "own follow delete" ON public.company_follows FOR DELETE TO authenticated USING (user_id = auth.uid());

-- company_posts (Diário, Stories, Lives)
CREATE TABLE public.company_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id uuid NOT NULL REFERENCES public.tokens(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('story','diario','live')),
  category text,
  title text,
  body text,
  media_url text,
  metrics jsonb,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_company_posts_token_created ON public.company_posts(token_id, created_at DESC);
CREATE INDEX idx_company_posts_kind ON public.company_posts(kind, created_at DESC);
GRANT SELECT ON public.company_posts TO anon, authenticated;
GRANT ALL ON public.company_posts TO service_role;
ALTER TABLE public.company_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read posts" ON public.company_posts FOR SELECT USING (true);
CREATE POLICY "admin write posts" ON public.company_posts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- company_comments
CREATE TABLE public.company_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id uuid NOT NULL REFERENCES public.tokens(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  parent_id uuid REFERENCES public.company_comments(id) ON DELETE CASCADE,
  is_founder boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_company_comments_token ON public.company_comments(token_id, created_at DESC);
GRANT SELECT ON public.company_comments TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.company_comments TO authenticated;
GRANT ALL ON public.company_comments TO service_role;
ALTER TABLE public.company_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read comments" ON public.company_comments FOR SELECT USING (true);
CREATE POLICY "write own comment" ON public.company_comments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "edit own comment" ON public.company_comments FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY "delete own comment" ON public.company_comments FOR DELETE TO authenticated USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

-- mari_social_xp
CREATE TABLE public.mari_social_xp (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  xp int NOT NULL DEFAULT 0,
  level text NOT NULL DEFAULT 'bronze',
  streak_days int NOT NULL DEFAULT 0,
  last_activity_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.mari_social_xp TO authenticated;
GRANT ALL ON public.mari_social_xp TO service_role;
ALTER TABLE public.mari_social_xp ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own xp select" ON public.mari_social_xp FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "own xp upsert" ON public.mari_social_xp FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "own xp update" ON public.mari_social_xp FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- mari_company_summaries (cache de resumos IA)
CREATE TABLE public.mari_company_summaries (
  token_id uuid PRIMARY KEY REFERENCES public.tokens(id) ON DELETE CASCADE,
  summary text NOT NULL,
  bullets jsonb,
  generated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.mari_company_summaries TO anon, authenticated;
GRANT ALL ON public.mari_company_summaries TO service_role;
ALTER TABLE public.mari_company_summaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read summaries" ON public.mari_company_summaries FOR SELECT USING (true);
