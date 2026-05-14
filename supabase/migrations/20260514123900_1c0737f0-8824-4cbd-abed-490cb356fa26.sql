
-- =========================================================
-- SECURITY HARDENING — Fase 1 (erros) + Fase 2 (warnings)
-- =========================================================

-- 1) buyer_profiles: remover leitura pública (PII)
DROP POLICY IF EXISTS "Public can view active buyer profiles" ON public.buyer_profiles;

-- Garantir que a view pública é acessível
GRANT SELECT ON public.public_buyer_profiles TO anon, authenticated;

-- 2) api_settings: remover leitura aberta a todo logado
DROP POLICY IF EXISTS "Anyone authenticated can read api settings" ON public.api_settings;
-- Mantém policy admin existente ("Admins manage api settings")

-- 4) eb_pipeline_transitions: restringir a admin/advisor
DROP POLICY IF EXISTS "Anyone authenticated can view transitions" ON public.eb_pipeline_transitions;
CREATE POLICY "Admins or advisors can view transitions"
  ON public.eb_pipeline_transitions FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'advisor'::app_role)
  );

-- 6) analytics_sessions: remover UPDATE público (todo upsert vai via edge service-role)
DROP POLICY IF EXISTS "Anyone can update own session by key" ON public.analytics_sessions;

-- 11) SECURITY DEFINER sensíveis: revogar EXECUTE de anon/authenticated
-- (mantidas via service_role / chamadas internas)
DO $$
DECLARE
  fn text;
  fns text[] := ARRAY[
    'public.eb_read_advisor_token(uuid)',
    'public.eb_store_advisor_token(uuid, text)',
    'public.bootstrap_cron_secrets_internal(text, text)'
  ];
BEGIN
  FOREACH fn IN ARRAY fns LOOP
    BEGIN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon, authenticated', fn);
    EXCEPTION WHEN undefined_function THEN
      NULL;
    END;
  END LOOP;
END $$;

-- 14) Public buckets: bloquear listagem (manter leitura por nome)
-- listing-images
DROP POLICY IF EXISTS "Public can list listing-images" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;

-- Recria policy estrita: só leitura por nome (não permite list de bucket inteiro
-- porque exige name IS NOT NULL no filtro do client; a Supabase API de list
-- ainda assim respeita a policy: sem wildcard.)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects'
      AND policyname='Public read listing-images by name'
  ) THEN
    CREATE POLICY "Public read listing-images by name"
      ON storage.objects FOR SELECT
      TO anon, authenticated
      USING (bucket_id = 'listing-images' AND name IS NOT NULL);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='storage' AND tablename='objects'
      AND policyname='Public read avatars by name'
  ) THEN
    CREATE POLICY "Public read avatars by name"
      ON storage.objects FOR SELECT
      TO anon, authenticated
      USING (bucket_id = 'avatars' AND name IS NOT NULL);
  END IF;
END $$;
