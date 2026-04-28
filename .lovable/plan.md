
# Próxima etapa — 1.5 (consertos + plug-in no scoring) + 2 (embeddings)

Antes de avançar, a auditoria do estado atual revelou 3 pontos que precisam ser tratados juntos:

| Achado | Impacto |
|---|---|
| `socio_idade_max` **não foi materializado** (0 linhas em `company_signals`) | `unipessoal_fundador_55plus` ficou 100% zero — bug silencioso da Etapa 1 |
| `seller_intent_score` médio = **0.19** (esperado ~0.35) | Score subdimensionado por causa do bug acima |
| `current_matches = 0` | UI de counterfactual da Etapa 1 não tem o que renderizar até rodar `match-batch` |
| `canonical_transactions = 21` | **Confirma**: Wave Detection (Onda 3) ainda não tem volume — não fazer agora |

A Etapa 2 do plano original (embeddings) faz sentido executar **agora** porque:
- `embed-signal` já existe e funciona.
- Lovable AI Gateway provê `text-embedding-3-small` sem API key extra.
- Dá para preencher 1 dos placeholders restantes do `match-company-v2` (`sinergia_movel` → `semantic_fit`).

---

## Escopo desta execução

### Bloco A — Conserto da Etapa 1 (obrigatório, 30min)

**A1.** Edge function `compute-seller-intent`: corrigir o cálculo de `socio_idade_max` para escrever a linha em `company_signals` (hoje só calcula em memória mas não faz upsert do próprio sinal). Re-rodar para as 116 empresas.

**A2.** Após A1, recalcular `unipessoal_fundador_55plus` e `seller_intent_score` (que dependem dele). Validar: distribuição esperada ≥ 5% das empresas com `unipessoal_fundador_55plus=1`.

**A3.** Disparar `match-batch` 1x para popular `matches.is_current=true` com `feature_contributions`, para o UI de counterfactual ter dados reais.

### Bloco B — Etapa 1.5: Plug-in de 2 features reais no `match-company-v2`

Substituir 2 dos 5 placeholders constantes (0.5) por features derivadas de sinais reais. Os outros 3 (`marca_regional`, `verticalizacao`, `regulatorio`) permanecem em 0.5 — não há substituto fiel ainda, trocar por ruído pioraria.

| Linha atual em `match-company-v2/index.ts` | Substituir por |
|---|---|
| `let financeiro = 0.5;` (linha 62) | Derivar de `sweet_spot_fadiga` + `tempo_atividade_anos` normalizado: empresas no sweet spot 8-20a recebem 0.7; <3a → 0.3; >25a → 0.4 |
| `const sinergia_movel = 0.5;` (linha 94) | **Será preenchido pelo Bloco C** (embeddings) — placeholder mantido até Bloco C entregar |

Adicionar feature **nova** ao vetor de scoring:
- `seller_intent` (peso 0.10, redistribuído de `match_score`): lê direto `seller_intent_score` da company. Empresas com intent > 0.5 ganham boost; < 0.2 sofrem leve penalidade.

Ajuste de pesos será documentado em comentário no arquivo. Recalcular matches (`match-batch`) ao final.

### Bloco C — Etapa 2: Embeddings semânticos (`semantic_fit`)

**C1.** Migration: adicionar coluna `embedding vector(1536)` em `equity_brain.companies` e `equity_brain.buyers` (se ainda não existir). Index HNSW em ambas.

**C2.** Edge function nova: `compute-semantic-embeddings`
- Admin-only.
- Para `companies`: gera embedding de `concat(razao_social, cnae_descricao, setor_ma, subsetor_ma)`.
- Para `buyers`: gera embedding de `concat(nome, sinergias_chave, tese_descricao)`.
- Usa Lovable AI Gateway (`google/text-embedding-004` ou `openai/text-embedding-3-small` — verificar qual está disponível; fallback para o que `embed-signal` já usa).
- Batch de 50, idempotente (só recalcula se `updated_at > embedding_computed_at`).
- Registra em `engine_runs`.

**C3.** Plugar no `match-company-v2`:
- Substituir `sinergia_movel = 0.5` por `semantic_fit = 1 - cosine_distance(company.embedding, buyer.embedding)`.
- Quando algum dos lados não tiver embedding, fallback para 0.5 (preserva comportamento atual).

**C4.** Card UI no `/equity-brain` (ShadowPage): `SemanticEmbeddingsCard` — total de companies/buyers com embedding, último run, botão "Recalcular".

### Critério de aceite

- Bloco A: `unipessoal_fundador_55plus` com pelo menos 5 empresas marcadas; `current_matches > 0`.
- Bloco B: Feature `seller_intent` aparece em `feature_contributions` de matches recém-gerados; `financeiro` tem variância (não é mais constante 0.5).
- Bloco C: ≥ 100 companies e ≥ 200 buyers com embedding; pelo menos 1 match com `semantic_fit ≠ 0.5`.

### Fora desta etapa (para discutir depois)

- **Wave Detection** (canonical_transactions = 21, volume insuficiente — adiar até atingir ≥ 100 deals).
- **Hazard model** (depende de Bloco B estabilizado por ≥ 2 semanas com dados de `deal_events`).
- **Enriquecimento externo** (News/PJe/LinkedIn — requer decisão de orçamento Serper/Apify/ProxyCurl).
- **Substituir os outros 3 placeholders** (`marca_regional`, `verticalizacao`, `regulatorio`) — sem substituto fiel hoje.

---

Aprovando, executo os 3 blocos sequencialmente em uma única passagem.
