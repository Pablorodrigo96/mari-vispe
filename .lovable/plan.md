

## Plano: Corrigir Exposição de CNPJ — Usar View Pública em Todas as Queries Públicas

### Problema

A tabela `listings` tem uma política RLS "Public can view active listings" que permite acesso anônimo a TODAS as colunas, incluindo `cnpj`, `user_id`, `cep`, `street`. A view `public_listings` já existe e exclui esses campos sensíveis, mas várias páginas públicas consultam `listings` diretamente em vez da view.

### Solução

Trocar `from('listings')` por `from('public_listings')` em todas as páginas de acesso público. Manter `from('listings')` apenas onde o usuário é dono ou admin (já protegido por RLS com `auth.uid()`).

### Mudanças

| Arquivo | Mudança |
|---|---|
| `src/pages/Marketplace.tsx` | `from('listings')` → `from('public_listings')` |
| `src/pages/MapView.tsx` | `from('listings')` → `from('public_listings')` para listagens |
| `src/pages/Index.tsx` | `from('listings')` → `from('public_listings')` (vitrine master) |
| `src/pages/ListingDetail.tsx` | `from('listings')` → `from('public_listings')` para visitantes; manter `listings` para owner/admin |

Páginas que devem continuar usando `listings` (acesso autenticado do owner):
- `MyListings.tsx`, `EditListing.tsx`, `NewListingWizard.tsx`, `AdminListings.tsx`, `AdminDashboard.tsx`, `PortfolioPotential.tsx`, `MatchingBuyers.tsx`, `AdminPartnerships.tsx`

### Ajuste de tipo

As queries com `public_listings` retornam um tipo sem `cnpj`, `user_id`, `cep`, `street`, `show_address`, `video_url`, `verified`. Os componentes `ListingCard` e `BusinessMap` precisarão aceitar esse tipo parcial (ou usar `Partial<Listing>`). Campos ausentes serão tratados com fallback.

### Migração SQL

Nenhuma necessária — a view `public_listings` e a RLS já existem. A política pública em `listings` já é restrita por `status = 'active'`, e os campos sensíveis ficam ocultos via view.

Opcionalmente: restringir a política pública da tabela `listings` para negar SELECT anônimo direto e forçar uso da view. Isso quebraria queries legadas, então será feito com cuidado.

