## Auditoria — O que está pronto vs. o que falta

Comparei o estado real do banco/edge functions com o blueprint completo do Equity Brain v3.

### Estado atual (números reais)

```text
companies          116    buyers              212
signals            873    canonical_tx         21
current_matches  17.389   market_waves        580
deal_events           1   revealed_thetas       0  ← vazio
company_partners      0   drift_snapshots       0  ← vazio
```

### Status por fase

```text
Fase 1 — Ingestão & Schema           ✅ COMPLETO
Fase 2 — Sinais determinísticos      ✅ COMPLETO (873 sinais)
Fase 3 — Embeddings semânticos       ✅ COMPLETO (semantic_fit ativo)
Fase 3.5 — Market Waves              ✅ COMPLETO (580 células)
Fase 4 — Match Engine v2             ✅ COMPLETO (17.389 matches v2)
Fase 5 — Loop adaptativo (Bayes)     ⚠️  PARCIAL — código pronto, sem dados
Fase 6 — Drift / Observabilidade     ⚠️  PARCIAL — função existe, 0 snapshots
Fase 7 — UI/Operação BDR             ⚠️  PARCIAL — falta workflow operacional
```

---

## O que falta (priorizado)

### 🔴 Bloco 1 — Ativar o loop de aprendizado (crítico)
O motor v2 está funcionando, mas **não aprende** porque faltam dois insumos:

1. **Backfill de `deal_events`** — só 1 evento existe. A função `backfill-deal-events-from-history` foi deployada mas nunca executada em massa. Precisa rodar para gerar eventos sintéticos a partir de `interest_logs`, `messages`, `partner_lead_reservations`, `capital_timeline`.
2. **Executar `update-buyer-revealed-thetas`** — `buyer_revealed_thetas` está zerado. Após o backfill, rodar o update Bayesiano para popular preferências reveladas dos 212 buyers.
3. **Cron diário** — agendar `update-buyer-revealed-thetas` em `setup-equity-brain-crons` para rodar automaticamente.

### 🔴 Bloco 2 — Ativar sinais demográficos (QSA)
- `company_partners` está **vazio** (0 registros). Sem isso, sinais como `unipessoal_55plus`, `sucessao_familiar`, `socio_unico` ficam mortos.
- Precisa popular via `sync-companies-from-cnpj` (já existe) puxando QSA da Receita para os 116 CNPJs ativos.
- Após popular, recomputar `company_signals` para reativar features demográficas no score.

### 🟡 Bloco 3 — Observabilidade (drift)
- `drift_snapshots` está **vazio**. A função `compute-drift-snapshot` existe mas nunca foi chamada.
- Faltam: execução inicial + cron semanal + card no `ShadowPage` mostrando histórico v1 vs v2 (KS distance, score drift, top movers).

### 🟡 Bloco 4 — Workflow operacional BDR
O motor produz 17k matches mas falta a camada de execução:
- **Match → Ação**: hoje não há fluxo "transformar match em deal_event" pela UI. O BDR precisa de um botão `Marcar como contatado / Rejeitado / Resposta recebida` em cada match (alimenta o loop Bayes).
- **Fila de prioridade**: `OportunidadesPage` mostra empresas, mas falta uma fila ranqueada por `score × wave_pressure × seller_intent` filtrada por SLA.
- **DealDetailPage** já existe — verificar se expõe a timeline de eventos e o `MatchExplainabilityCard` para o match selecionado.

### 🟢 Bloco 5 — Hazard models (timing)
Adiar até ter ≥100 deal_events com transição de estágio. Hoje (1 evento) é estatisticamente impossível. Após Bloco 1, reavaliar.

### 🟢 Bloco 6 — Polimentos
- `wave_score` como heatmap no `MapaPage` (Deal Flow).
- Expor `MatchQualityCard` também no Dashboard admin (hoje só no Shadow).
- Documentação/onboarding do BDR no `GrafoJarvisGuiaPage`.

---

## Plano de execução proposto (ordem)

```text
1. Backfill deal_events em massa            (Bloco 1.1)
2. Rodar update-buyer-revealed-thetas       (Bloco 1.2)
3. Agendar cron diário do passo 2           (Bloco 1.3)
4. Popular company_partners via QSA         (Bloco 2)
5. Rodar compute-drift-snapshot + cron      (Bloco 3)
6. UI: botões de feedback no match          (Bloco 4.1)
7. UI: fila priorizada SLA                  (Bloco 4.2)
8. Polimentos (Bloco 6) — opcional
```

Hazard models (Bloco 5) ficam adiados até massa de eventos > 100.

---

## Resumo direto

**Não falta arquitetura — falta dado e ativação.** Todas as funções existem e o schema está completo. O que está parado é:
- O loop adaptativo nunca foi "ligado" (sem deal_events, sem thetas).
- Sinais demográficos estão dormentes (sem QSA).
- Observabilidade (drift) nunca rodou.
- UI do BDR não fecha o ciclo (não consegue gerar feedback).

**Quer que eu execute os Blocos 1 → 2 → 3 → 4 nessa ordem?** São ~4 etapas independentes, cada uma destrava uma camada do motor.
