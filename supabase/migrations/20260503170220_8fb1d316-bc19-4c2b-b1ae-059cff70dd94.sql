-- Phase F1.1: Recreate eb_buyers_enriched with new buyer fields
DROP VIEW IF EXISTS public.eb_buyers_enriched CASCADE;

CREATE VIEW public.eb_buyers_enriched WITH (security_invoker=on) AS
SELECT
  b.id, b.nome, b.tipo, b.cnpj, b.website,
  b.ticket_min, b.ticket_max, b.porte_alvo,
  b.setores_interesse, b.subsetores_interesse,
  b.ufs_interesse, b.municipios_interesse, b.sinergias_chave,
  b.status, b.ultimo_contato_em, b.observacoes,
  b.deals_realizados, b.responsavel_id, b.source, b.raw_data,
  b.created_at, b.updated_at,
  b.prioridade_global, b.vertical_principal,
  b.cautela_flag, b.cautela_motivo, b.archetype_id, b.pause_signal,
  b.deals_last_12m, b.pe_sponsor_name, b.pe_sponsor_entry_date,
  b.recent_capital_raise_brl, b.recent_capital_raise_date,
  b.avg_multiple_paid_recent, b.median_target_size_recent,
  b.embedding, b.embedding_computed_at, b.embedding_text_hash,
  b.tipo_comprador, b.engagement_status, b.qualification_status,
  -- Phase F1 new fields
  b.tese_text, b.criterios_exclusao, b.notas_estrategicas,
  b.linkedin_url, b.email_contato_principal, b.telefone_contato,
  ( SELECT row_to_json(ct.*) FROM equity_brain.contacts ct
    WHERE ct.entity_type = 'buyer'::equity_brain.crm_entity_type
      AND ct.entity_id = b.id AND ct.is_primary = true
    ORDER BY ct.created_at LIMIT 1) AS primary_contact,
  ( SELECT count(*) FROM equity_brain.matches mt
    WHERE mt.buyer_id = b.id AND mt.is_current = true) AS active_matches_count
FROM equity_brain.buyers b;

GRANT SELECT ON public.eb_buyers_enriched TO authenticated;

-- Public exposure of mandate pins (with geocoded company coords)
DROP VIEW IF EXISTS public.eb_v_mandate_pins CASCADE;
CREATE VIEW public.eb_v_mandate_pins WITH (security_invoker=on) AS
SELECT
  m.id,
  m.deal_phase AS fase,
  m.status::text AS status,
  m.company_cnpj,
  c.razao_social,
  c.municipio,
  c.uf,
  c.latitude,
  c.longitude
FROM equity_brain.mandates m
JOIN equity_brain.companies c ON c.cnpj = m.company_cnpj
WHERE c.latitude IS NOT NULL AND c.longitude IS NOT NULL;

GRANT SELECT ON public.eb_v_mandate_pins TO authenticated;