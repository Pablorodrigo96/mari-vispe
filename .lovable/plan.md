## Contexto validado

Inspecionei os dois XLSX que você subiu:

**Sellside (`M_A_Sellside_1777655662.xlsx`)**
- 215 mandatos reais (+ 11 group rows que o parser ignora)
- Σ Valor Operação = R$ 129.436.657 ✅ bate com a spec da Fase 2
- Σ R$ Vispe = R$ 4.512.085 ✅ bate
- Top 3 advisors: Rafael=71, Lucas=34, Marieli=27 ✅ idêntico à spec
- 5 linhas com `Executivo responsável = "Executivo responsável"` (header repetido) → vão cair em advisors_unmapped, ignorar

**Buyside (`M_A_Buyside_1777655780.xlsx`)**
- 40 mandatos (a spec dizia 24 ± 1; sua planilha inclui cancelados/concluídos antigos — vou importar tudo, dashboards filtram por status)
- Σ Valor = R$ 5.200.000 · Σ Vispe = R$ 1.417.285

Headers batem com o que o parser de `eb-import-monday` espera (`Name`, `Fase`, `Status do projeto`, `Valor da Operação`, `R$ Vispe`, `Executivo responsável`, `Item ID (auto generated)`).

## O que vou fazer

### 1. Subir os 2 XLSX para Storage (bucket privado `monday-imports`)
- Migration cria o bucket com RLS admin-only
- Copio `/tmp/sell.xlsx` e `/tmp/buy.xlsx` para o bucket via edge function setup
- Mantém histórico do que foi importado

### 2. Edge function `eb-admin-import-monday-files` (one-shot, service role)
- Lê os 2 XLSX do Storage
- Chama o parser interno do `eb-import-monday` em modo `commit`
- Marca cada mandato com `imported_from='monday'`, `monday_item_id`, `imported_at=now()`
- Registra em `mari_ops.health_check` (sucesso/erro + contagens)
- **Nota de auditoria:** `imported_by=null` (service role). Vou registrar no `mari_ops.health_check` o motivo (`reason='admin-approved bulk import'`).

### 3. Validação de paridade automática
Após o import, rodo via `supabase--read_query`:

```sql
SELECT
  deal_type,
  COUNT(*) AS qtd,
  SUM(valor_operacao) AS soma_valor,
  SUM(faturamento_vispe) AS soma_vispe
FROM equity_brain.mandates
WHERE imported_from='monday'
GROUP BY deal_type;

SELECT m.responsavel_name, COUNT(*) AS qtd
FROM equity_brain.mandates m
WHERE m.imported_from='monday' AND m.deal_type='sellside'
GROUP BY m.responsavel_name
ORDER BY qtd DESC LIMIT 5;
```

**Critérios de aceite (auto-checados):**
- Sellside: 215 ± 5, Σvalor R$ 129.4M ± 1%, Σvispe R$ 4.51M ± 1%
- Buyside: 40 ± 2
- Top 3 = Rafael=71, Lucas=34, Marieli=27

### 4. Refresh das materialized views dos dashboards
`SELECT public.refresh_dashboard_views();` para popular Executivo/Mandato/Match/NBO com dados reais.

### 5. Resolver advisors pendentes
Se houver advisors não mapeados, gero pré-mapeamento automático por **fuzzy match** (similaridade ≥ 0.85) entre `monday_responsavel_name` e `profiles.full_name` dos advisors. Os ambíguos sobram pra você resolver em `/admin/advisors-mapping`.

### 6. Screenshots dos 4 dashboards
Via `browser--navigate_to_sandbox` em `/dashboard/executivo`, `/dashboard/mandato`, `/dashboard/match`, `/dashboard/nbo` com viewport 1516×1091 (igual ao seu).

### 7. Cleanup
- Removo a edge function `eb-admin-import-monday-files` após sucesso
- Mantenho os XLSX no bucket pra histórico

## Detalhes técnicos

**Migration nova:**
- `storage.buckets` insert: `monday-imports` (private)
- RLS: só admin lê/escreve

**Edge function nova (temporária):**
- Path: `supabase/functions/eb-admin-import-monday-files/index.ts`
- Auth: valida `getClaims` + `has_role(uid, 'admin')` → você precisa estar logado pra disparar
- Lê arquivos do Storage com `service_role`, processa em memória
- Reusa lógica do `eb-import-monday` (importa parser como módulo compartilhado OU duplica a função `parseMondayXlsx` — vou duplicar pra não tocar em código existente, conforme regra "NÃO altere edge functions existentes")

**Não vou:**
- Alterar `eb-import-monday`
- Alterar dashboards já criados na Fase 3
- Mexer em RLS de tabelas existentes além do bucket novo
- Avançar sem te confirmar paridade

## Entregáveis

1. ✅ 215 Sellside + 40 Buyside em `equity_brain.mandates` com `imported_from='monday'`
2. ✅ Relatório de paridade (tabela markdown) Monday vs MARI
3. ✅ Lista de advisors auto-mapeados + pendentes pra você resolver
4. ✅ 4 screenshots dos dashboards com dados reais
5. ✅ Confirmação de smoke tests passando (`mari_ops.daily_smoke_tests()`)

Após sua aprovação, executo tudo de uma vez e te trago o relatório completo.