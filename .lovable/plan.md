# Plano: Conectar TODOS os cadastros ao Equity Brain (Brain + Motor de Matching)

## Diagnóstico

Auditei o banco e descobri o seguinte:

- ✅ As tabelas-mestre seguem intactas em `public.*` (86 listings, 1 buyer_profile, 29 valuations, etc.). Nada foi deletado.
- ✅ O schema `equity_brain` tem 86 companies e 105 buyers (importações externas + cópia das 86 listings).
- ❌ **Os triggers de sincronização foram desanexados** em algum momento. As funções `public.sync_listing_bootstrap_eb()` e `equity_brain.trg_sync_listing_to_eb()` existem, mas **nenhum trigger está apontando para elas em `public.listings`**. Hoje a sincronização só acontece quando alguém chama manualmente a Edge Function `sync-listings-to-equity-brain` (admin only).
- ❌ Não existe trigger nenhum que copie `public.buyer_profiles`, `public.capital_requests`, `public.valuation_history` ou `public.profiles` para o Brain.

**Resultado prático:** novos cadastros feitos por usuários, parceiros, assessores, contadores ou leads NÃO chegam ao Brain em tempo real — só entram se um admin rodar o sync manualmente. Isso explica porque o motor de matching parece "cego" para cadastros recentes.

## O que vou construir

Princípio: **copiar, nunca recortar**. O dado mestre fica em `public.*` (frontend continua usando isso). O Brain recebe um espelho automático em `equity_brain.*` para correlação e matching.

### 1. Reconectar trigger de listings → companies
Anexar trigger `AFTER INSERT OR UPDATE` em `public.listings` chamando `public.sync_listing_bootstrap_eb()` (que já existe e roda toda a cascata: upsert company → recalcula signals → recalcula scores). Faz backfill de quaisquer listings que estejam fora de sincronia.

### 2. Novo trigger buyer_profiles → equity_brain.buyers
Criar função `equity_brain.upsert_buyer_from_profile(buyer_profile_id)` que mapeia:
- `buyer_name/company_name` → `nome`
- `categories` → `setores_interesse` (via `category_to_setor`)
- `state` → `ufs_interesse`
- `city` → `municipios_interesse`
- `min_budget/max_budget` → `ticket_min/ticket_max`
- `description` → `observacoes`
- `source = 'marketplace_buyer_profile'`
- `status = 'active' | 'paused'` conforme o profile

Anexar trigger `AFTER INSERT OR UPDATE` em `public.buyer_profiles`. Backfill imediato do buyer existente.

### 3. Novo trigger capital_requests → company_signals
Toda solicitação de captação vira sinal de "intenção" no Brain:
- Função `equity_brain.ingest_capital_request(request_id)` que faz upsert em `equity_brain.companies` (gerando CNPJ sintético via `cnpj_for_listing` se necessário) e insere signals (`intencao_captacao`, `porte_atrativo_ma`, `geografia_premium`).
- Trigger `AFTER INSERT OR UPDATE` em `public.capital_requests`.

### 4. Novo trigger valuation_history → company_signals
Cada valuation gerado é evidência de interesse/preparo:
- Função `equity_brain.ingest_valuation(valuation_id)` que extrai `inputs->>cnpj` ou `inputs->>company_name`, faz upsert em companies e adiciona signal `valuation_realizado` (peso 8) com o múltiplo/valor calculado em `signal_value`.
- Trigger `AFTER INSERT` em `public.valuation_history`.

### 5. Trigger profiles/user_roles → buyer/advisor enriquecimento
Quando um usuário com role `buyer`, `advisor`, `franchisee` ou `seller` for criado/atualizado, registrar metadata mínima no Brain (sem PII) para o motor saber que existe um ator naquela região/setor. Implementação leve: trigger em `public.user_roles` que apenas garante a entrada do `responsavel_id` correto em `equity_brain.buyers` quando role = `buyer`.

### 6. Backfill único
Após anexar os triggers, rodar uma migration de backfill que invoca:
- `equity_brain.bootstrap_all_listings()` (já existe)
- Loop em `buyer_profiles`, `capital_requests` e `valuation_history` para popular tudo que ficou fora.

### 7. Painel de saúde no Equity Brain (admin)
Adicionar card no painel admin do Brain mostrando: contagem `public.listings` vs `equity_brain.companies`, `buyer_profiles` vs `eb_buyers`, última sincronização, e botão "Forçar resync" — para nunca mais ter divergência silenciosa.

## Garantias

- **Nenhum dado é movido**: triggers fazem `INSERT … ON CONFLICT DO UPDATE` no schema `equity_brain` mantendo o registro original em `public`.
- **Marketplace e mapa continuam puxando de `public.listings`** (sem mudanças no front).
- **RLS preservada**: triggers rodam com `SECURITY DEFINER` e não alteram permissões das tabelas públicas.
- **Idempotente**: backfill pode rodar quantas vezes for necessário.

## Arquivos previstos

- 1 migration SQL: cria as 4 funções de ingestão novas + 5 triggers + backfill final.
- `src/components/equity-brain/SyncHealthCard.tsx`: card de saúde no painel admin do Brain.
- Pequena edição no `EquityBrainAdmin` (ou painel equivalente) para incluir o card.

## Pergunta antes de implementar

Posso prosseguir com este plano, ou você quer ajustar a lista de fontes (por exemplo: incluir/excluir `messages`, `interest_logs`, ou tratar `capital_requests` apenas quando lead_score ≥ X)?
