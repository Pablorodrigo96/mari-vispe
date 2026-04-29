---
name: Identity Reveal & Document Unification
description: Advisor/admin reveal de identidade real, agregação de docs CRM+VDR+Cadastro e botão Blind Teaser no 360 do EB com log LGPD.
type: feature
---

No 360 do Equity Brain (`MandateDetailPage`, `BuyerDetailPage`):

- **IdentityRevealCard** (`src/components/equity-brain/IdentityRevealCard.tsx`): renderiza só quando `eb_can_view_identity = true`. Cada expansão grava `action='identity_reveal'` em `equity_brain.access_logs`.
- **BlindTeaserButton** (`src/components/equity-brain/BlindTeaserButton.tsx`): resolve a listing pelo CNPJ via `useCompanyListing(cnpj)` e abre `/teaser/:ticker`. Submenu: abrir, copiar link, WhatsApp. Cada ação grava em `access_logs` (`teaser_view | teaser_share_copy | teaser_share_whatsapp`); `teaser_view` também insere em `public.teaser_views` para os analytics do vendedor.
- **DocumentsPanel multi-source**: aceita `companyContext={cnpj}`. Agrega 3 fontes em paralelo:
  - `equity_brain.crm_documents` (sempre)
  - `public.vdr_documents` (filtro `listing_id`)
  - `public.listing_financial_docs` (filtro `listing_id`)
  Filtros por origem (chips), badges coloridas por fonte, upload novo continua indo para `crm_documents`.

Hooks novos:
- `useCompanyListing(cnpj)` — bridge CNPJ → listing.
- `useTeaserAccessLog()` — wrapper de log para LGPD.

Sem migrations: tudo usa `equity_brain.access_logs` e `public.teaser_views` existentes. RLS de admin já cobre SELECT em `listings`, `vdr_documents`, `listing_financial_docs`.
