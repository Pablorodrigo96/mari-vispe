---
name: EB Bulk Imports
description: Página /equity-brain/crm/imports espelhando Exports — sobe .xlsx/.csv para popular companies/mandates/buyers/contacts/activities; auto-recálculo de matches/scores/market waves.
type: feature
---

Espelho do Exports. Permite advisors/admins subirem planilhas para popular o Equity Brain em massa.

## Fluxo
1. Usuário acessa `/equity-brain/crm/imports` (RequireRole admin|advisor).
2. Escolhe entidade: companies, mandates (deals), buyers, contacts, activities, OU bundle (.xlsx multi-aba).
3. `ImportDialog` baixa modelo, faz parse local com `xlsx` lib, mostra preview.
4. Toggle Dry-run (default ON) → chama `eb-import` edge function só validando.
5. Usuário desliga Dry-run e clica "Importar N linhas" → grava + dispara recálculos.

## Edge function `eb-import`
- Valida JWT + role (admin|advisor) via `user_roles`.
- Upserts em `equity_brain.{companies,mandates,buyers,contacts,crm_activities}` usando service-role client.
- Chaves naturais: `companies.cnpj`, `mandates.id`, `buyers.id`. Reimport = upsert (sem duplicar).
- Mandates importam com company stub auto-criado se CNPJ não existe.
- Aliases pt-BR ↔ snake_case via `pick()` helper. Listas aceitam `|`, `,` ou `;`.
- Datas aceitam serial Excel, dd/mm/aaaa, ISO.
- Fire-and-forget: dispara `match-batch`, `calculate-scores`, `compute-mandate-active-proba`, `compute-market-waves`.
- Loga `event_type='bulk_import'` em `equity_brain.deal_events`.

## Arquivos
- `src/pages/equity-brain/ImportsPage.tsx` — landing com 6 cards.
- `src/components/equity-brain/crm/ImportDialog.tsx` — modal com preview + dry-run.
- `src/lib/ebImportTemplates.ts` — gerador de modelos .xlsx + parser.
- `supabase/functions/eb-import/index.ts` — backend.
- Rotas em `src/App.tsx`, links em `CrmHubPage.tsx` e `ExportsPage.tsx`.

## Idempotência e segurança
- CNPJs validados (14 dígitos).
- Erros parciais: linha-a-linha; uma ruim não bloqueia as outras.
- Imports não criam roles nem mexem em auth.
