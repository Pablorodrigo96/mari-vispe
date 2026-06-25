
-- Leitura: todo mundo pode ver mídia de stories (URLs não enumeráveis)
CREATE POLICY "stories_bucket_public_read"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'company-stories');

-- Upload: só autenticado, dentro da própria pasta {auth.uid}/...
CREATE POLICY "stories_bucket_owner_insert"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'company-stories'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "stories_bucket_owner_update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'company-stories'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "stories_bucket_owner_delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'company-stories'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
