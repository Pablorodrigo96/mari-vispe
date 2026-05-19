-- Realtime Authorization: restringir subscribe a tópicos whatsapp_messages*
-- Apenas admins ou advisors com config de WhatsApp podem se inscrever.
-- Requer que o cliente use { config: { private: true } } no supabase.channel().

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='realtime' AND tablename='messages') THEN
    EXECUTE 'ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY';
  END IF;
END$$;

DROP POLICY IF EXISTS "wa_realtime_subscribe_admin_or_advisor" ON realtime.messages;

CREATE POLICY "wa_realtime_subscribe_admin_or_advisor"
ON realtime.messages
FOR SELECT
TO authenticated
USING (
  (realtime.topic() LIKE 'whatsapp_messages%')
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR EXISTS (
      SELECT 1 FROM public.advisor_whatsapp_config
      WHERE advisor_id = auth.uid()
    )
  )
);