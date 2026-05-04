---
name: Mari Lead Tracking
description: Fase 5 — leads originados em /mari são rastreados em public.mari_leads, com badge no /painel e card no /equity-brain/hoje.
type: feature
---
- Tabela `public.mari_leads` (UNIQUE user_id+cnpj): cnpj, razao_social, uf, cidade, cnae, porte, window_base, listing_id, status (`signup` | `listed` | `contacted`).
- RLS: dono lê/insert/update; admin+advisor lê/update tudo.
- `src/lib/mariLeadTracking.ts`: `logMariLead(prefill, userId)` (upsert no signup) e `logMariListing(prefill, listingId, userId)` (marca `listed` quando publica).
- `src/hooks/useMariLeads.ts`: `useMyMariLead()` (vendedor, 30d) e `useRecentMariLeads(limit)` (advisor/admin, 7d).
- `MariOriginBadge` (componente em /painel) — badge Volt "Você veio da Calculadora Mari · janela X% · há Yd · status"; dismiss via localStorage `mari_origin_badge_dismissed_v1`.
- `MariLeadCard` (em /equity-brain/hoje, abaixo do MariInsightsSection) — lista até 5 leads recentes com botão WhatsApp e link pro listing publicado.
- `Auth.tsx` chama `logMariLead` após signup quando role=seller e prefill existe; força redirect `/vender`.
- `NewListingWizard` injeta prefixo "Origem: Calculadora Mari (janela X%)" em `additional_info` e chama `logMariListing` ao publicar.
- Zero uso da `equity_brain.crm_activities` (kind enum fechado).
