## Objetivo

Hoje a ficha do match (`/equity-brain/match/:matchId`) só mostra 4 barrinhas (Setor / Geografia / Porte / Tese) sem revelar **por que** o motor sugeriu aquele match nem **quais pesos** cada análise teve. O motor v2 (`match-company-v2`) já calcula e persiste tudo isso em `equity_brain.matches`, mas os campos não estão sendo lidos pela UI.

Vamos puxar e exibir, em uma seção "**Por que esse match?**" reformulada, **todas as evidências** que o motor produziu.

## O que já existe no banco (e está sendo ignorado pela UI)

Colunas presentes em `equity_brain.matches`:

- `feature_contributions` (jsonb) — array `{feature, weight, value, contribution}` estilo SHAP, cobrindo: setor, geografia, tamanho, tese, financeiro, semantic_fit, seller_intent, wave_pressure, timing, horizonte, governanca, recorrencia, regulatorio etc.
- `reasons` (jsonb) — top razões já ranqueadas por contribuição absoluta.
- `counterfactual` (text) — frases tipo "Se UF compatível, score subiria ~15pts".
- `comparables` (jsonb) — deals/comps usados de referência.
- `ai_thesis_summary`, `ai_pitch`, `ai_confidence` — narrativa gerada por IA.
- `p_close_12m` + `p_close_ci_lower/upper` — probabilidade de fechar com IC.
- `ev_p10/p50/p90`, `multiple_p10/p50/p90` — bandas de valor esperado.
- `buyer_archetype` — qual arquétipo do comprador disparou o casamento.
- `sector_cycle_phase`, `data_confidence`, `abstain`, `abstain_reason`.
- `engine_version` — `v1` ou `v2` (importa para decidir o que mostrar).

## Mudanças

### 1. `src/hooks/useMatchById.ts` — trazer todas as colunas ricas

Ampliar o `select` para incluir: `reasons, ai_thesis_summary, ai_pitch, ai_confidence, p_close_12m, p_close_ci_lower, p_close_ci_upper, ev_p10, ev_p50, ev_p90, multiple_p10, multiple_p50, multiple_p90, data_confidence, abstain, abstain_reason, buyer_archetype, sector_cycle_phase, counterfactual, comparables, feature_contributions, engine_version, ma_score_emp`.

Estender o `MatchInboxRow` (em `useMatchInbox.ts`) com esses campos como opcionais, para reuso pela página de detalhe sem quebrar a inbox.

### 2. Novo componente `src/components/equity-brain/match/MatchWhyCard.tsx`

Renderiza, em uma única seção rica, três blocos:

**a) Narrativa (topo)**
- `ai_thesis_summary` em destaque + badge `ai_confidence`.
- Linha de contexto: arquétipo do comprador, fase do ciclo do setor, `engine_version` (v2 / v1) e `data_confidence`.
- Se `abstain = true`, banner âmbar com `abstain_reason` ("motor se absteve por...").

**b) Decomposição SHAP-like (centro) — o coração do "por que"**
- Lista ordenada por `|contribution|` desc, lendo `feature_contributions`.
- Cada linha: nome legível da feature (mapa pt-BR), barra colorida com largura proporcional a `|contribution|/max`, números crus `v=… · w=… · Δ=…` em mono pequeno.
- Reaproveita paleta do `MatchExplainabilityCard` (setor=violet, geografia=sky, tamanho=amber, tese=fuchsia, financeiro=emerald, semantic_fit=cyan, seller_intent=rose, wave_pressure=teal, timing=yellow…).
- Tooltip (i) por feature explicando em 1 frase o que aquela dimensão significa, usando o padrão `ebTooltips.ts`.
- Total no rodapé: `Σ(weight·value) → score final = X`.
- Fallback: se `feature_contributions` vazio (matches v1 antigos), usa as 4 barras atuais (setor/geografia/porte/tese) com aviso "Match calculado pelo motor legado v1 — explicabilidade limitada".

**c) Sinais & cenários (rodapé)**
- Cards laterais em grid 1×3:
  - **Probabilidade de fechar 12m** = `p_close_12m` com IC (CI_lower–CI_upper).
  - **Banda de valor (EV)** = `ev_p10` / `ev_p50` / `ev_p90` formatado em `brl(..., {compact:true})`, idem para múltiplos.
  - **Tese acionada** = `thesis_key` + `ma_score_emp`.
- Lista de **`reasons`** em bullets curtos (até 5).
- Lista de **`counterfactual`** em bullets cinza ("E se…?") — leitura tipo "o que mudaria o score".
- Bloco **Comparáveis** se `comparables` não vazio: até 3 deals com sector/multiple/EV.

### 3. `src/pages/equity-brain/MatchDetailPage.tsx`

Substituir o bloco atual "Por que esse match" (linhas 259–275, só com 4 `FitBar`) pelo novo `<MatchWhyCard match={row} />`. Manter o restante da página (header, vendedor, comprador, contatos, histórico) intacto.

### 4. `src/components/equity-brain/match/MatchInboxRow.tsx` (e `DealCard`/preview)

Adicionar uma microlinha "Top 3 razões" usando `reasons` (já calculadas) ou, se ausente, derivando das top 3 de `feature_contributions`. Mantém o card compacto, só ajuda a entender o ranking sem entrar na página.

### 5. `src/components/equity-brain/match/MatchDetailDrawer.tsx`

Mesmo tratamento do drawer lateral: incluir o novo `<MatchWhyCard />` (versão compacta — sem comparáveis) para que a justificativa também apareça no preview rápido.

### 6. `src/lib/ebTooltips.ts`

Adicionar entradas para cada feature do motor (setor, geografia, tamanho, tese, financeiro, semantic_fit, seller_intent, wave_pressure, timing, horizonte, governanca, recorrencia, contratos_longos, verticalizacao, regulatorio, densidade_local, vertical_fit) com 1 frase explicando como o motor calcula aquela dimensão. Usado pelos tooltips (i) do `MatchWhyCard`.

## Layout final da seção "Por que esse match" (ASCII)

```text
┌───────────────────────────────────────────────────────────────┐
│ ✨ Por que esse match                          engine v2 · 87%│
│ "Comprador estratégico do setor X com tese de roll-up regional│
│  e timing alinhado ao mandato vigente."                        │
│ ─────────────────────────────────────────────────────────────  │
│ Decomposição (ordenado por impacto):                           │
│ Setor          ████████████████  v=1.00 · w=0.30 · Δ=+0.300    │
│ Tese (roll-up) ███████████       v=0.80 · w=0.20 · Δ=+0.160    │
│ Semantic fit   ████████          v=0.74 · w=0.05 · Δ=+0.037    │
│ Geografia      ███               v=0.50 · w=0.20 · Δ=+0.100    │
│ Wave pressure  ██                v=0.41 · w=0.05 · Δ=+0.020    │
│ Seller intent  ▌(negativo)       v=0.18 · w=0.10 · Δ=−0.018    │
│ … total = 73 → score 73                                        │
│ ─────────────────────────────────────────────────────────────  │
│ p(close 12m) 42% [31–55]   EV 18M / 24M / 31M   Tese: ROLL_UP  │
│ Razões: • Setor exato • UF prioritária • Mandato vigente …     │
│ E se…: • UF compatível → +15pts • Mandato confirmado → +20pts  │
│ Comparáveis: ABC SaaS 4.2x EV/EBITDA · …                        │
└───────────────────────────────────────────────────────────────┘
```

## Notas técnicas

- Sem migração de schema — todas as colunas já existem.
- `reasons`, `comparables`, `feature_contributions` são `jsonb`; tratar como `unknown` e validar shape antes de renderizar (defensivo, evita quebra em matches v1 onde podem vir `null`).
- Formatadores de valor: usar `brl(..., {compact:true})` já existente; porcentagens via `Math.round(x*100)`.
- Nada bloqueia a tela de carregar se algum desses campos vier `null` — cada bloco tem fallback gracioso.
- Não toca em RLS, edge functions, nem no motor de cálculo. Apenas leitura + UI.

## Arquivos tocados

- `src/hooks/useMatchById.ts` (ampliar select + tipos)
- `src/hooks/useMatchInbox.ts` (estender `MatchInboxRow` com campos opcionais)
- `src/components/equity-brain/match/MatchWhyCard.tsx` (**novo**)
- `src/pages/equity-brain/MatchDetailPage.tsx` (substituir bloco atual)
- `src/components/equity-brain/match/MatchDetailDrawer.tsx` (incluir card compacto)
- `src/components/equity-brain/match/MatchInboxRow.tsx` (microlinha top 3 razões)
- `src/lib/ebTooltips.ts` (textos de cada feature)
