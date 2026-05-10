---
name: Entity Notes (Knowledge Base)
description: Núcleo de Conhecimento Mari - notas markdown polimórficas em Mandato/Buyer M&A/Empresa
type: feature
---
Fase 6 Bloco 2 entregue. Tabela `equity_brain.entity_notes` (entity_type enum: mandate/buyer_ma/company; entity_id text — buyer/mandate=uuid, company=cnpj) com markdown body_md, tags, pinned, visibility (internal/public), tsvector PT-BR pra Bloco 7. View pública `public.eb_entity_notes` (security_invoker). RLS: advisor+admin escrevem; autor edita próprio; admin apaga qualquer; internal só advisor/admin; public lê quem autenticado.

Hook: `useEntityNotes/useCreateNote/useUpdateNote/useDeleteNote` em `src/hooks/useEntityNotes.ts`.
Componente: `<EntityNotes entityType entityId allowedVisibilities />` em `src/components/equity-brain/notes/EntityNotes.tsx` (editor markdown textarea + react-markdown render, search, pin/unpin, edit, delete).

Integração:
- MandateDetailPage → tab "Notas" (6ª aba)
- BuyerDetailPage → tab "Notas" (allowedVisibilities=['internal'] apenas)
- DealDetailPage (`/equity-brain/empresa/:cnpj`) → tabs Visão/Notas, usa cnpj como entity_id

Seed legacy idempotente migrou `mandates.observacoes`, `buyers.observacoes`+`cautela_motivo`, `companies.raw_data->>'notas'` como 1 nota pinada "internal" tag=['legado'] com autor=primeiro admin.

Próximos blocos: 1 (gaps front×back), 3 (@mentions/backlinks), 4 (Daily Notes /diario), 5 (templates), 6 (tags hierárquicas), 7 (pgvector semantic).
