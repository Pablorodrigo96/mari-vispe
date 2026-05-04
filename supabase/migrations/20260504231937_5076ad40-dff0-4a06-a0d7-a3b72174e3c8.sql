-- 1. Avatars storage bucket (public read)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Public can read all avatars
DROP POLICY IF EXISTS "Avatars publicly readable" ON storage.objects;
CREATE POLICY "Avatars publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- Authenticated users can upload to their own folder (folder = user_id)
DROP POLICY IF EXISTS "Users upload own avatar" ON storage.objects;
CREATE POLICY "Users upload own avatar"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users update own avatar" ON storage.objects;
CREATE POLICY "Users update own avatar"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users delete own avatar" ON storage.objects;
CREATE POLICY "Users delete own avatar"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'avatars'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- 2. New profile fields for gamification & richness
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS website_url text,
  ADD COLUMN IF NOT EXISTS interests text[] DEFAULT '{}'::text[];

-- 3. Profile completion calculator (0–100)
CREATE OR REPLACE FUNCTION public.profile_completion(_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p record;
  total int := 8;
  score int := 0;
  has_listing boolean := false;
BEGIN
  SELECT full_name, phone, cpf_cnpj, cep, city, state, avatar_url, bio, website_url, interests
    INTO p
    FROM public.profiles
   WHERE user_id = _user_id
   LIMIT 1;

  IF p IS NULL THEN
    RETURN 0;
  END IF;

  IF p.full_name IS NOT NULL AND length(trim(p.full_name)) > 1 THEN score := score + 1; END IF;
  IF p.phone IS NOT NULL AND length(trim(p.phone)) >= 10 THEN score := score + 1; END IF;
  IF p.cpf_cnpj IS NOT NULL AND length(trim(p.cpf_cnpj)) >= 11 THEN score := score + 1; END IF;
  IF (p.cep IS NOT NULL AND length(trim(p.cep)) >= 8)
     OR (p.city IS NOT NULL AND p.state IS NOT NULL) THEN score := score + 1; END IF;
  IF p.avatar_url IS NOT NULL AND length(trim(p.avatar_url)) > 0 THEN score := score + 1; END IF;
  IF p.bio IS NOT NULL AND length(trim(p.bio)) >= 20 THEN score := score + 1; END IF;
  IF (p.website_url IS NOT NULL AND length(trim(p.website_url)) > 0)
     OR (p.interests IS NOT NULL AND array_length(p.interests, 1) > 0) THEN score := score + 1; END IF;

  SELECT EXISTS (SELECT 1 FROM public.listings WHERE user_id = _user_id) INTO has_listing;
  IF has_listing THEN score := score + 1; END IF;

  RETURN LEAST(100, (score * 100) / total);
END;
$$;

GRANT EXECUTE ON FUNCTION public.profile_completion(uuid) TO authenticated, anon;