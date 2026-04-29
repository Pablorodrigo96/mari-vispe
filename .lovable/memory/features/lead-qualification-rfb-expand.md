---
name: Lead Qualification & RFB Expand
description: Sistema qualified/unqualified + dual-role promotion (target↔buyer) em equity_brain.companies/buyers, com expansão sob demanda da base RFB (5M CNPJs)
type: feature
---

## Modelo
- ENUM `equity_brain.qualification_status` = `qualified | unqualified`
- Colunas em `equity_brain.companies` E `equity_brain.buyers`: `qualification_status` (default `unqualified`), `qualified_at`, `qualified_by`, `qualification_source`
- **Promoção dual-role** (companies + buyers): `promoted_from text` ('rfb'|'company'|'buyer'|'manual'), `promoted_at`, `linked_buyer_id` (em companies) / `linked_company_cnpj` (em buyers). Índices únicos parciais previnem duplicatas.
- Tabela `equity_brain.match_queue` enfileira recálculo assíncrono ao qualificar/promover.
- Backfill aplicado: companies com listing/mandato → qualified; buyers com source != 'rfb_expand' → qualified
- View `public.eb_companies` recriada para expor as novas colunas

## Edge function
`expand-companies-from-rfb` (admin OR advisor): consulta EXTERNAL_DB_URL filtrando por setores/UFs/capital/idade, exclui CNPJs já no EB, UPSERT `source='rfb_expand'` + `qualification_status='unqualified'`, dispara `match-buyer`. Suporta `dry_run`.

## RPC `qualify_lead` (estendida)
Assinatura: `(p_entity_type, p_entity_id, p_source, p_notes, p_promote_to_buyer bool, p_promote_to_company bool, p_buyer_profile jsonb, p_company_profile jsonb)`.
- Marca a entidade como qualified e enfileira em `match_queue`.
- Se `p_promote_to_buyer` (origem company): cria buyer espelho com `source='promoted_from_company'`, copia setor/UF, vincula via `linked_buyer_id`/`linked_company_cnpj`. Registra `deal_events.event_type='lead_promoted'`.
- Se `p_promote_to_company` (origem buyer): exige CNPJ; cria ou atualiza company existente, vincula. Registra `deal_events`.
- Idempotente: se já existe contraparte promovida, não duplica.

## UI
- `<QualificationBadge />` — badge verde/cinza
- `<QualifyLeadButton />` — agora **Dialog** com 2 seções: (1) fonte da qualificação, (2) papel no Equity Brain (checkboxes para promover a buyer ou company com mini-form opcional)
- `<RoleBadges />` — chips Target / Buyer / Dual baseados em `qualification_status` + presença em ambas as tabelas
- `<ExpandRFBDialog />` — modal de filtros (setores, UFs, capital min, idade min, limit até 200)
- `MatchesPanel` ganhou tabs `Qualificados | Todos | Base RFB` + botão de expansão

## Aprendizado adaptativo
Cada promoção registra `deal_events('lead_promoted', ..., metadata={direction})` que alimenta o loop Bayesiano (Phase 4 do Equity Brain v2) — buyers promovidos adquirem perfil revelado a partir do primeiro evento.

## Próximos passos pendentes
- Worker que consome `equity_brain.match_queue` (hoje os items ficam acumulando; chamar `match-buyer`/`match-company-v2` é manual).
- Adicionar suporte a `include_unqualified` em `match-buyer` / `match-company-v2`.
- Replicar botão "Expandir" em `MandateDetailPage`.
- Coluna "Qualificação" + `<RoleBadges />` em `BuyersTable` e `MandatesTable`.
