---
name: Legal Documents Library
description: Biblioteca central /equity-brain/legal/biblioteca agrupa deal_documents + crm_documents por cliente (codinome do vendedor ↔ comprador). Toda exibição de doc precisa mostrar cliente.
type: feature
---

Rota: `/equity-brain/legal/biblioteca` (admin/advisor/legal/observer).

Página: `src/pages/equity-brain/LegalLibraryPage.tsx`. Hook: `src/hooks/useLegalLibrary.ts`.

Fontes unificadas read-only (sem migration):
- `deal_documents` (NDA/NBO/TS/SPA gerados por IA) → resolve cliente via `deal_pair_id → deal_pairs → mandates.company_cnpj → companies.codename` + `buyer_profiles`.
- `crm_documents` (uploads de NDA/teaser/infopack) → resolve via `entity_type/entity_id` (mandate ou buyer).

Agrupamento por `client_key` (`pair:<id>` ou `mandate:<id>`). Cabeçalho mostra `MARI-XXX-#### ↔ Buyer` + setor·UF. Filtros: busca, tipo, status, origem, cliente. Preview usa `WordPreview` (markdown A4) carregando `generated_body` sob demanda. Download via signed URL `deal-documents` (TTL 300s).

Atalho no `LegalDocsMenu` (dropdown "Documentos") e item no sidebar grupo "Jurídico".

REGRA: toda UI que liste documentos jurídicos DEVE exibir o cliente (codinome do vendedor + comprador). Respeita `eb_can_view_identity` — usa codinome quando usuário não tem identidade liberada.
