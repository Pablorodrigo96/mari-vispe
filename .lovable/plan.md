# Equity Brain v2 — Fase 4: Loop Adaptativo

Fechar o ciclo: cada `deal_event` (rejeição, NDA, fechamento) registrado pelo BDR alimenta um motor Bayesiano que ajusta os pesos por buyer em `equity_brain.buyer_revealed_thetas`. O `match-company-v2` já consome essa tabela via `blendWeights` (Fase 2), então não precisa mexer no motor de matching.

## O que será criado

### 1. Edge Function `update-buyer-revealed-thetas`

Arquivo: `supabase/functions/update-buyer-revealed-thetas/index.ts`

- Auth: admin only via `getClaims()` + `user_roles`.
- Body: `{ buyer_id?: string, since_days?: number (default 365), dry_run?: boolean }`
- Lê eventos de `equity_brain.deal_events` (com `match_id` para extrair `feature_contributions`).
- Para cada evento atribui um sinal alvo:
  - `closed`: +1.0 · `term_sheet`: +0.85 · `loi_received`: +0.7 · `nda_signed`: +0.4
  - `reply_received`: +0.2 · `contacted`: 0
  - `rejected`: -0.7 · `dropped`: -0.5
- Penalidade extra por motivo de rejeição (mapeia para features específicas):
  - `geo_fora_radar` → penaliza `geografia`, `densidade_local`
  - `tamanho_*` → penaliza `tamanho`, `financeiro`
  - `setor_secundario` → penaliza `setor`, `vertical_fit`
  - `governanca_problema` → penaliza `governanca` · etc.
- Decay temporal (half-life 90 dias): eventos antigos pesam menos.
- Bayesian online update tipo Welford: `mean += w·(obs − mean)/(n+w)`, std cai como `1/√n`.
- Peso por feature proporcional à contribuição que o feature teve no match (features que mais influenciaram a recomendação aprendem mais).
- Upsert em chunks de 200 em `buyer_revealed_thetas (buyer_id, feature_name)`.
- Retorna summary por buyer (eventos processados, features atualizadas) + amostra de thetas.

### 2. UI: nova aba "Aprendizado" em `/equity-brain/shadow`

Arquivo: `src/pages/equity-brain/ShadowPage.tsx` (editar)

- Adicionar `<TabsTrigger value="learning">` com ícone `Brain`.
- Conteúdo:
  - **Botões**: "Treinar todos os buyers", "Dry-run (preview)" — invocam `update-buyer-revealed-thetas`.
  - **Card de eventos recentes**: lista os últimos 20 `deal_events` (tipo, motivo, timestamp, buyer).
  - **Tabela de thetas top**: top 30 entradas de `buyer_revealed_thetas` ordenadas por `n_observations`, com coluna delta vs default.
- Carrega via PostgREST direto no schema `equity_brain` (já exposto na Fase 2).

### 3. Validação end-to-end

- Curl `update-buyer-revealed-thetas` com `dry_run: true` para confirmar que processa eventos sem efeitos colaterais.
- Em seguida, rodar sem `dry_run` para popular a tabela (se houver eventos).
- Re-executar `match-company-v2` para confirmar que os scores se ajustam ao consumir os novos thetas.

## O que NÃO entra

- Trigger DB automático que enfileira buyers a cada novo evento (decisão: fica para uma fase futura quando volume justificar — por enquanto basta o botão manual + execução agendada via cron externa).
- Reescrita do match v2: ele já lê `buyer_revealed_thetas` via `blendWeights` (Fase 2 entregou isso).

## Arquitetura do loop

```text
BDR registra outcome
        │
        ▼
deal_events (RPC eb_log_deal_event — Fase 3)
        │
        ▼
update-buyer-revealed-thetas (Fase 4 — manual ou cron)
        │
        ▼
buyer_revealed_thetas (mean/std/n por buyer×feature)
        │
        ▼
match-company-v2 → blendWeights(default, revealed)
        │
        ▼
Novos matches refletem o que aquele buyer realmente fechou
```

## Como o peso é ajustado (resumo técnico)

Para um evento `closed` em um match cujo `feature_contributions` tinha `geografia` com contribuição alta:
1. observation = +1.0
2. weight = decay × (0.3 + contrib_normalizada)  → ~0.9 se evento recente e geografia foi top contributor
3. posterior_mean da feature `geografia` para esse buyer sobe em direção a +1
4. n_observations += weight, std cai

Próxima rodada de matching para esse buyer aumenta o peso de `geografia` via `blendWeights`.

## Plano de execução

1. Criar `supabase/functions/update-buyer-revealed-thetas/index.ts` (já implementado no draft acima).
2. Editar `ShadowPage.tsx`: adicionar imports `Brain`, novo state `learning`, nova `TabsTrigger`+`TabsContent`, fetch de `deal_events` e `buyer_revealed_thetas`.
3. Deploy da edge function (automático).
4. Curl smoke test com `dry_run: true`.
5. Atualizar memória `mem://features/equity-brain-v2-decision` para incluir o loop adaptativo.
