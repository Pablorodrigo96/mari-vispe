CREATE OR REPLACE VIEW public.eb_contact_last_letter
WITH (security_invoker = true) AS
SELECT DISTINCT ON (lbi.prospect_contact_id)
  lbi.prospect_contact_id AS contact_id,
  lbi.batch_id,
  b.created_at AS sent_at,
  b.status AS batch_status,
  b.advisor_id,
  lt.name AS template_name
FROM public.letter_batch_items lbi
JOIN public.letter_batches b ON b.id = lbi.batch_id
LEFT JOIN public.letter_templates lt ON lt.id = b.template_id
WHERE lbi.prospect_contact_id IS NOT NULL
ORDER BY lbi.prospect_contact_id, b.created_at DESC;

GRANT SELECT ON public.eb_contact_last_letter TO authenticated;