
# Avaliação do plano Oráculo v3 e proposta faseada

## O que faz sentido manter, ajustar ou descartar

| Módulo do plano original | Veredito | Razão |
|---|---|---|
| **M1 — Motor de Intenção (sinais estruturais Receita)** | **Executar JÁ** | 100% dos dados existem (`socios_pf`, `data_abertura`, `qtd_socios`, `company_partners.idade_estimada`). Custo zero, ROI imediato. |
| **M6 — Loop closer (OUTCOMES → revealed_thetas)** | **Já existe parcialmente** | `update-buyer-revealed-thetas` já faz update bayesiano com decay. Falta o **trigger automático** em `deal_events` e expor no UI. Não reescrever — só plugar. |
| **MatchDecisionCard com counterfactual exposto** | **Executar JÁ** | `feature_contributions` já são calculadas e gravadas em `matches`. É só renderizar. Componente existe (`src/components/equity-brain/MatchDecisionCard.tsx`). |
| **M4 — Wave Detection setorial** | **Onda 2** | Depende de `canonical_transactions` ter volume mínimo. Verificar antes. |
| **M5 — Embeddings semânticos (pgvector)** | **Onda 2** | Já existe `embed-signal` e coluna `embedding` em `company_signals`. Estender para `companies` + `buyers` é incremental. |
| **M3 — Hazard model (Cox/heurístico)** | **Onda 3** | Heurística simples vale, mas só faz sentido depois que M1 estiver materializado e estável. |
| **M2 — Enriquecimento externo (News, PJe, CADIN, LinkedIn)** | **Onda 3+** | Maior moat **e** maior custo (Serper/Apify/ProxyCurl + crons + auditoria). Requer decisão de orçamento. Não bloqueia ondas 1–2. |
| **Painel "Próximos a Vender"** | **Onda 2** | Só faz sentido depois que `seller_intent_score` estiver populado (M1). |
| **Feed "O que mudou hoje"** | **Onda 4** | Depende de M2 (enrichment_log). Cosmético até lá. |
| **Composite `deal_quality` (motor v3)** | **Onda 3** | Substituir ranking só faz sentido com hazard + waves prontos. Manter `match_score` v2 até lá. |

### Premissas que rejeito do plano original
- **"Reescrever update-buyer-revealed-thetas"** — não. A função atual já implementa o loop bayesiano com decay e penalização por rejeição. Basta automatizar o disparo.
- **"Substituir os 5 placeholders 0.5 já no Sprint 1"** — fazer só os que têm substituto real **na mesma sprint** (ex.: `horizonte` ← `tempo_atividade`). Os demais ficam para quando a feature substituta existir, senão troca-se ruído por ruído.

---

## Etapa 1 — Despertar dados dormentes (esta execução)

Escopo enxuto, 100% executável com dados já existentes em `equity_brain.companies` + `equity_brain.company_partners`. Sem APIs externas, sem custo.

### Estado atual confirmado
- `equity_brain.companies`: 116 empresas, 81 com `data_abertura`, 116 com `socios_pf`.
- `equity_brain.company_partners` já tem `idade_estimada` e `is_provavel_fundador` populados.
- `company_signals` hoje só tem 5 sinais ativos (`intencao_venda_explicita`, `geografia_premium`, `idade_empresa_10_a_15`, `porte_atrativo_ma`, `empresa_ativa_situacao_regular`) — todos derivados de listing, não de Receita.

### Entregas da Etapa 1

**1. Migration: 4 sinais novos materializados em `company_signals`**

```text
socio_idade_max          ← max(idade_estimada) dos sócios PF com qualificação de admin/sócio
tempo_atividade_anos     ← extract(year from age(data_abertura))
unipessoal_fundador_55+  ← qtd_socios=1 AND socio_idade_max>=55  (binário)
sweet_spot_fadiga        ← tempo_atividade entre 8 e 20 anos       (binário)
```

Cada um vira linha em `company_signals` com `signal_key`, `signal_value`, `weight`, `confidence`, `p_true`, `evidence_strength='strong'` (são fatos da Receita, não inferência).

**2. Edge Function nova: `compute-seller-intent-signals`**
- Admin-only (mesmo padrão das demais).
- Lê `companies` + `company_partners`, calcula os 4 sinais, faz upsert em `company_signals`.
- Calcula um agregado `seller_intent_score ∈ [0,1]` = soma ponderada (idade 0.35, tempo 0.25, unipessoal+idade 0.25, sweet spot 0.15) — também gravado como sinal.
- Registra execução em `engine_runs`.
- Suporta `dry_run` e batch por UF/setor.

**3. Cron diário** (via `setup-equity-brain-crons` ou pg_cron direto): roda 1x/dia às 04:00.

**4. Trigger automático: `deal_events` → `update-buyer-revealed-thetas`**
- Trigger SQL `AFTER INSERT ON equity_brain.deal_events` que faz `pg_net.http_post` chamando a edge function existente com `{ buyer_id }`.
- A função já existe e funciona — só estamos plugando o disparo automático que faltava.
- Idempotente (a função tolera re-execução).

**5. UI: counterfactual + feature contributions no MatchDecisionCard**
- Ler `matches.feature_contributions` (já gravado).
- Renderizar:
  - Top 5 features que contribuíram (barras horizontais com sinal +/−).
  - Bloco "O que mudaria o jogo": pega a feature com maior `gap = peso − contribuição_atual` e mostra "Se confirmássemos `<feature>`, o score subiria de X para Y" + pergunta sugerida (mapa estático `feature → pergunta`).

**6. Card de monitoramento no `/equity-brain`**
- Reusa padrão do `BackfillHistoryCard`: status do último run de `compute-seller-intent-signals`, contagem de sinais materializados, botão "Recalcular agora".

### O que NÃO faz parte da Etapa 1
- Painel "Próximos a Vender" (depende de score estável + price_bands — Onda 2).
- Substituição dos 5 placeholders no scoring do `match-company-v2` (faremos em Etapa 1.5 só os 2 que têm substituto direto: `horizonte` ← `tempo_atividade_anos`, `marca_regional` ← `unipessoal_fundador_55+`). Adiei pra não misturar duas mudanças sensíveis na mesma execução.
- Hazard predictions, embeddings novos, wave detection.
- Qualquer enriquecimento externo.

### Critério de aceite da Etapa 1
- 116 empresas com `seller_intent_score` em `company_signals`.
- Distribuição do score visível no card de monitoramento (histograma simples top 10/median/bottom 10).
- 1 `deal_event` de teste dispara update em `buyer_revealed_thetas` automaticamente.
- MatchDecisionCard de qualquer match real mostra contribuições + counterfactual.

### Detalhes técnicos
- **Schema**: zero alterações estruturais. Tudo cabe no schema atual de `company_signals` (que já tem `signal_value`, `weight`, `p_true`, `evidence_strength`, `confidence`).
- **Backfill**: a edge function processa todas as 116 empresas no primeiro run (lote de 50, sequencial — volume baixo).
- **Trigger pg_net**: requer extensão `pg_net` (verificar; se ausente, fallback é cron de 5 min varrendo eventos novos — menos elegante mas funciona).
- **Frontend**: alterações isoladas em `src/components/equity-brain/MatchDecisionCard.tsx` + 1 componente novo `SellerIntentMonitorCard.tsx` em `src/components/equity-brain/`.

### Próximas etapas (após validação da 1)
- **Etapa 1.5** (mesma onda, 1 dia): substituir os 2 placeholders no scoring v2 e calibrar.
- **Etapa 2**: pgvector + embeddings de `companies.cnae_descricao` e `buyers.sinergias_chave` → feature `semantic_fit`.
- **Etapa 3**: Wave detection (depende de validar volume de `canonical_transactions`).
- **Etapa 4**: Hazard heurístico (Fase A do M3).
- **Etapa 5+**: discutir orçamento de enriquecimento externo (Serper, PJe, CADIN, LinkedIn).

---

Aprovando, executo apenas a **Etapa 1** acima. As demais ficam aguardando validação antes de iniciar.
