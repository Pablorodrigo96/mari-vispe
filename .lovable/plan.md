# Limpeza de empresas-fantasma e contatos sintéticos

## O que está acontecendo hoje

- **31 empresas-fantasma** (ASAS, OAKEN, HAD, Vispe Capital, JHUH, DAI…) entraram em `equity_brain.companies` a partir de `valuation_history`. Têm CNPJ sintético (`VL…`/`CR…`), `qualification_status='unqualified'`, sem contato, sem financeiros — e mesmo assim aparecem no Match Inbox e CRM.
- **107 buyers sintéticos** (`Comprador Estratégico #A603`, etc.) com `source='marketplace_buyer_profile'` foram semeados em `equity_brain.buyers` sem contato real.
- O motor de match (`match-batch` → `match-company-v2`) lê `equity_brain.companies_scored` **sem filtrar qualificação** → ~9.600 dos ~67k matches envolvem esses registros lixo.

## Plano de execução

### 1. Migração SQL (`20260501150000_eb_cleanup_garbage_companies_buyers.sql`)
- Adicionar `is_synthetic boolean default false` em `equity_brain.buyers`; marcar `true` onde `name ~ '#A\d+'` ou `source='marketplace_buyer_profile'` sem `email`/`whatsapp`.
- Atualizar função `equity_brain.is_company_visible_in_crm(cnpj)`: retornar `false` quando `qualification_status='unqualified'` **e** (`cnpj LIKE 'VL%'` OR `cnpj LIKE 'CR%'`) OR origem `valuation_history`/`capital_request` sem contato.
- Recriar views públicas que dependem de buyers (`public.eb_buyers`, `eb_matches_enriched`, `eb_buyers_enriched`) com `WHERE NOT is_synthetic`.
- Recriar `equity_brain.companies_scored` com `WHERE is_company_visible_in_crm(cnpj)`.
- `DELETE FROM equity_brain.matches WHERE cnpj LIKE 'VL%' OR cnpj LIKE 'CR%' OR buyer_id IN (select id from equity_brain.buyers where is_synthetic)` — limpa ~9.600 matches obsoletos.
- Trigger `trg_guard_valuation_company_insert` em `equity_brain.companies`: se `cnpj ~ '^(VL|CR)'` ou origem é `valuation_history`/`capital_request`, força `qualification_status='unqualified'` no INSERT/UPDATE.
- Trigger de validação no `valuation_history → eb_companies` promotion: rejeita promoção se CNPJ não bater regex de 14 dígitos válidos.

### 2. Reprocessar matches limpos
- Chamar `supabase--curl_edge_functions` em `match-batch` com `{ limit: 2000, chunk_size: 50 }` para regenerar matches só sobre companies qualificadas.
- Chamar `sync-listings-to-equity-brain` (com `run_pipeline:true`) para garantir que listings reais do marketplace estão re-scoredas e elegíveis.

### 3. Validação visual
- Abrir `/equity-brain/match-inbox` e confirmar que ASAS/OAKEN/HAD/JHUH/DAI/Vispe Capital sumiram.
- Abrir `/equity-brain/crm` e contar buyers visíveis (esperado: ~107 a menos).
- `read_query` em `eb_matches_enriched` para confirmar que nenhum match restante referencia CNPJ `VL%`/`CR%` ou buyer sintético.

## Critério de aceite
- Match Inbox sem nenhuma das 6 empresas-fantasma citadas.
- `select count(*) from equity_brain.matches where cnpj like 'VL%' or cnpj like 'CR%'` = 0.
- `select count(*) from public.eb_buyers where name ~ '#A\d+'` = 0.
- Novos valuations anônimos continuam funcionando (não são bloqueados), mas **não vazam** para CRM/Match.

## Riscos
- Views recriadas podem ter dependentes — vou usar `CREATE OR REPLACE` e, se faltar, `DROP CASCADE` controlado dentro da migração.
- `match-batch` em 2k empresas leva ~2-3min; aceitável.
