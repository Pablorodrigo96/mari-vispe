
ALTER TABLE equity_brain.deal_events
  DROP CONSTRAINT IF EXISTS deal_events_event_type_check;

ALTER TABLE equity_brain.deal_events
  ADD CONSTRAINT deal_events_event_type_check
  CHECK (event_type IN (
    -- legados (mantidos)
    'rejected','contacted','reply_received','nda_signed',
    'loi_received','term_sheet','closed','dropped',
    -- novos canais de comunicação
    'whatsapp_outbound','whatsapp_inbound',
    'call_outbound','call_inbound',
    'email','note','meeting_held'
  ));

COMMENT ON CONSTRAINT deal_events_event_type_check ON equity_brain.deal_events IS
  'Tipos permitidos: legados (rejected/contacted/reply_received/nda_signed/loi_received/term_sheet/closed/dropped) + canais (whatsapp_outbound/whatsapp_inbound/call_outbound/call_inbound/email/note/meeting_held).';
