
ALTER TABLE public.listings ADD COLUMN verified boolean DEFAULT false;
ALTER TABLE public.listings ADD COLUMN video_url text;
