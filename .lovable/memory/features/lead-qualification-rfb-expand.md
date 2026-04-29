---
name: Lead Qualification & RFB Expand
description: Sistema qualified/unqualified em equity_brain.companies + buyers, com expansão sob demanda da base RFB (5M CNPJs)
type: feature
---

## Modelo
- ENUM `equity_brain.qualification_status` = `qualified | unqualified`
- Colunas em `equity_brain.companies` E `equity_brain.buyers`: `qualification_status` (default `unqualified`), `qualified_at`, `qualified_by`, `qualification_source`
- Backfill aplicado: companies com listing/mandato → qualified; buyers com source != 'rfb_expand' → qualified
- View `public.eb_companies` recriada para expor as novas colunas

## Edge function
`expand-companies-from-rfb` (admin OR advisor): consulta EXTERNAL_DB_URL filtrando por setores/UFs/capital/idade do buyer, exclui CNPJs já no EB, faz UPSERT com `source='rfb_expand'` + `qualification_status='unqualified'`, dispara `match-buyer` automaticamente. Suporta `dry_run`.

## RPC
`public.qualify_lead(entity_type, entity_id, source, notes)` — admin/advisor only — promove lead para qualified.

## UI
- `<QualificationBadge />` — badge verde/cinza
- `<QualifyLeadButton />` — popover com 5 origens de qualificação
- `<ExpandRFBDialog />` — modal de filtros (setores, UFs, capital min, idade min, limit até 200)
- `MatchesPanel` ganhou tabs `Qualificados | Todos | Base RFB` + botão de expansão (só no modo buyer)

## Próximos passos pendentes
- Adicionar suporte a `include_unqualified` em `match-buyer` / `match-company-v2` para que matches de empresas RFB apareçam imediatamente sem reprocessar
- Replicar botão "Expandir buyers" em `MandateDetailPage` (apenas relaxar filtros, não importa buyers novos)
- Coluna "Qualificação" em `BuyersTable` e `MandatesTable`
