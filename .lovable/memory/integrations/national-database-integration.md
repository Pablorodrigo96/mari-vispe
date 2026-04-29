---
name: National Database Integration
description: CNPJ autocomplete via Edge Function, external Postgres DB + BrasilAPI fallback for QSA/Simples
type: feature
---

CNPJ autocomplete in sell wizard via `national-search` edge function.

## Sources (in priority order)
1. **External Postgres DB** (`EXTERNAL_DB_URL`) — base mensal Receita Federal:
   - `empresas`, `estabelecimentos`, `cnaes`, view `estabelecimentos_detalhados`
   - **NÃO contém**: `socios` (QSA), `simples` (regime tributário/MEI), `municipios`, `naturezas_juridicas`, `paises`
2. **BrasilAPI fallback** (`https://brasilapi.com.br/api/cnpj/v1/{cnpj}`) — gratuito, sem API key:
   - Enriquece com `socios` (QSA) e `regime_tributario` (Simples/MEI) quando ausentes localmente
   - Timeout 3s; falha graceful (retorna sem enriquecimento)
   - Toggle via `integrations_config` key=`brasilapi_fallback_enabled`
3. **Cache** `cnpj_cache` (jsonb, TTL 30 dias) — absorve picos e evita rate limit

## Quando o fornecedor entregar `socios`+`simples`
1. Atualizar JOIN no SQL local em `national-search/index.ts`
2. Setar `integrations_config.brasilapi_fallback_enabled = 'false'` (sem deploy)

## Display
`StepBasicFinancial.tsx` mostra: razão social, fantasia, natureza jurídica, porte, idade, CNAE, endereço, regime tributário (badge MEI/Simples/Lucro Real) e quadro societário (até 10 visíveis).
