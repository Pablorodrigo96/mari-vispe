---
name: RFB Hub
description: /equity-brain/admin/rfb hub para Base Receita Federal (5M CNPJs) — status, busca livre, fila e fallback BrasilAPI
type: feature
---

## Páginas e componentes
- `/equity-brain/admin/rfb` (RfbHubPage) — admin/advisor: status `cnpj-db-inspect`, ExpandRFBDialog (target=companies E target=buyers), worker manual, histórico de imports, toggle BrasilAPI.
- Sidebar EB → "Base Nacional (RFB)" no grupo Admin.
- `EnrichCompanyButton` (companies) e `EnrichBuyerButton` (buyers) — enriquecimento via RFB/IA.

## Edge functions
- `expand-companies-from-rfb` — agora aceita `target: 'companies' | 'buyers'` e `mandate_id`. Quando `target=buyers`, importa em `equity_brain.buyers` (estratégico cego) e dispara `match-company-v2`.
- `process-match-queue` — worker que drena `equity_brain.match_queue`, chama `match-buyer`/`match-company-v2`. Cron `process-match-queue-every-5min` a cada 5 min.
- `enrich-company-via-rfb` — dado CNPJ, faz lookup `national-search` e atualiza `equity_brain.companies`.

## MatchesPanel
ExpandRFBDialog renderizado em ambos modos: buyer → busca companies; mandate → busca buyers.
