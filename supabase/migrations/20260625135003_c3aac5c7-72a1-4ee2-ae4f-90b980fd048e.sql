ALTER TABLE public.company_stories DROP CONSTRAINT IF EXISTS company_stories_source_check;
ALTER TABLE public.company_stories
  ADD CONSTRAINT company_stories_source_check
  CHECK (source = ANY (ARRAY['manual_upload'::text, 'instagram_link'::text, 'auto_generated'::text]));

ALTER TABLE public.company_stories ALTER COLUMN author_id DROP NOT NULL;
ALTER TABLE public.company_stories ADD COLUMN IF NOT EXISTS slide_index integer;
ALTER TABLE public.company_stories ADD COLUMN IF NOT EXISTS overlay jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_company_stories_auto_slide
  ON public.company_stories(token_id, slide_index)
  WHERE source = 'auto_generated';