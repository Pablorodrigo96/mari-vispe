# Plano — Grafo Estratégico do Equity Brain (Knowledge Graph)

## Diagnóstico atual

- `/equity-brain/grafo` usa **ReactFlow + Dagre** com layout `LR` (esquerda → direita) → parece um **organograma hierárquico**, não um cérebro.
- Apenas **3 tipos de node** (`company`, `thesis`, `buyer`) e **1 lógica de edge** (cnpj→tese→buyer + direct).
- Sem peso real, sem confidence, sem painel lateral, sem clusters, sem layers.
- Banco hoje: 86 companies · 105 buyers · 29 theses · 114 buyer_theses · **0 matches** (precisa popular).
- Dados ricos disponíveis em `equity_brain.*`: `setor_ma`, `uf`, `municipio`, `faturamento_estimado`, `ebitda_estimado`, `ma_score`, `setores_interesse[]`, `ufs_interesse[]`, `sinergias_chave[]`, `ticket_min/max`, `tipo` (PE/strategic), etc.

---

## 1. Modelo de dados (camada lógica, sem migrations destrutivas)

Usar **uma view materializada virtual no front** (montada client-side) que normaliza os dados existentes em **nodes + edges tipadas** — sem mexer no schema do equity_brain.

### 1.1 Tipos de Node (7)
| type | origem | label | size por |
|---|---|---|---|
| `seller` | `eb_companies` (empresas alvo) | razão social | `ma_score` |
| `buyer_strategic` | `eb_buyers` WHERE tipo='strategic' | nome | deals_realizados + score |
| `buyer_financial` | `eb_buyers` WHERE tipo IN ('pe','vc','family_office') | nome | ticket_max |
| `thesis` | `eb_investment_theses` | display_name | nº de matches |
| `platform` | derivado: buyers com >=3 deals_realizados na mesma vertical | nome+vertical | deals |
| `asset` | derivado de `sinergias_chave[]` + `cnae_descricao` (ex: "Base 30k clientes SP", "Licença ANATEL", "ERP próprio") | label do ativo | frequência |
| `strategy` | derivado das `theses.category` (rollup, vertical_consolidation, etc) | nome estratégia | nº edges |

Cada node carrega: `id, label, type, vertical, uf, municipio, valuation_band, strategic_score (0-100), opportunity_stage, metadata{}`.

### 1.2 Tipos de Edge (14)
Calculadas client-side a partir de cruzamentos:
- **buyer_acquires_seller** — buyer.setores_interesse ∩ seller.setor_ma + ufs_interesse ∩ uf + ticket fit
- **seller_acquires_seller** — mesma vertical + mesma região + um com receita 3x+ do outro
- **seller_merges_with_seller** — mesma vertical + receita comparável (±30%) + UFs adjacentes
- **buyer_funds_seller** — buyer financial + seller com ma_score>60
- **platform_addon** — platform-node + seller mesma vertical e região
- **strategic_synergy** — sellers que compartilham sinergia_chave
- **cross_sell** — sellers de verticais complementares (mapeado por CNAE)
- **cost_synergy** — mesma vertical + mesma UF (overhead compartilhável)
- **geographic_expansion** — buyer sem presença na UF + seller na UF
- **tech_stack_match** — sellers com mesmo asset técnico (ERP/tecnologia)
- **channel_synergy** — sellers com mesmo asset de canal (ex: "Canal indireto B2B")
- **valuation_arbitrage** — seller com EBITDA>0 e ma_score alto mas sem listagem ativa
- **capital_match** — buyer financial + seller dentro do ticket_min/max
- **thesis_fit** — seller atende `required_signals` da thesis

Cada edge: `{source, target, edge_type, strategy, weight (0-1), confidence (0-1), explanation, scores{rollup, cross_sell, cost_synergy, valuation_arbitrage, execution_risk, ...}}`.

### 1.3 Fórmula de peso final (configurável)
```ts
final_weight =
  0.25 * strategic_fit      // ma_score + setor match
+ 0.20 * revenue_synergy    // complementaridade
+ 0.15 * cost_synergy       // overlap geográfico/operacional
+ 0.15 * financial_capacity // ticket fit / receita do adquirente
+ 0.10 * execution_ease     // mesma UF, mesmo porte
+ 0.10 * deal_urgency       // listing ativo, expiração reserva
+ 0.05 * valuation_arbitrage
```
Pesos expostos em `src/lib/equityGraphScoring.ts` para tuning futuro.

---

## 2. Render visual — força-direcionado (cérebro)

**Substituir ReactFlow + Dagre por `react-force-graph-2d`** (Canvas, GPU-friendly, orgânico, suporta milhares de nodes com pulse/glow).

### Por que trocar:
- ReactFlow é DOM/SVG → trava com >300 elementos e força grid hierárquico.
- `react-force-graph-2d` (baseado em d3-force) faz simulação física natural → **clusters emergem sozinhos**, linhas curvas, pan/zoom suave, glow nativo.

### Características visuais:
- **Background**: gradiente radial `from-zinc-950 via-black to-zinc-950` + grid sutil.
- **Nodes**:
  - Tamanho proporcional ao `strategic_score` (raio 4–18 px).
  - Cor por type: seller=emerald, buyer_strategic=cyan, buyer_financial=blue, thesis=violet, platform=amber, asset=zinc, strategy=rose.
  - **Glow pulsante** nos top-10 (oportunidades quentes) usando `requestAnimationFrame` + canvas shadowBlur animado.
  - Halo branco quando hover.
- **Edges**:
  - **Linhas curvas Bezier** (`linkCurvature: 0.15`).
  - **Espessura** = `weight * 4 + 0.3`.
  - **Opacidade** = `confidence * 0.8 + 0.1`.
  - **Cor por edge_type** (paleta de 14 cores HSL distintas, todas com alpha).
  - **Animação de partícula** (`linkDirectionalParticles`) nas top-30 edges (>0.7 weight).
- **Forças d3**: `forceManyBody(-80)`, `forceLink(distance ∝ 1/weight)`, `forceCollide(radius+2)`, `forceCenter`.

---

## 3. Interações

### Click em node → painel lateral direito (Sheet de 380px):
- Header: avatar/cor do type, label, vertical, UF, score grande.
- Tabs: **Conexões** | **Estratégias** | **Top Matches** | **Por que importa**.
- Botão "Focar" (centraliza + isola subgrafo) e "Abrir no detalhe" (rota /equity-brain/deal/:cnpj).

### Click em edge → popover central:
- Tipo + estratégia + scores radar (mini gráfico) + explanation + CTA "Gerar tese de M&A com IA" (futuro).

### Hover:
- Highlight dos vizinhos diretos, dim dos demais (`opacity 0.12`).
- Tooltip com label + type + score.

---

## 4. Filtros (sidebar esquerda colapsável, 240px)

- **Verticais** (chips multi-select dos `setor_ma` distintos)
- **UF** (chips)
- **Tipo de node** (toggles)
- **Tipo de edge** (toggles, agrupados por categoria: M&A direto / Synergias / Capital / Tese)
- **Peso mínimo** (slider 0–1)
- **Confidence mínima** (slider 0–1)
- **Tese** (select)
- **Buyer** (select)
- **Layers** (toggles) — atalhos:
  - 🎯 M&A direto
  - 🔄 Roll-up seller-seller
  - ⚙️ Sinergia operacional
  - 💼 Sinergia comercial
  - 💸 Arbitragem de valuation
  - 💰 Capital/funding
  - 🧠 Fit com tese

Filtros aplicam à simulação em tempo real (re-roda d3-force).

---

## 5. Clusters

Detecção via **community detection leve** (Louvain ou simples por modularidade de edge_type+vertical). Renderizar cada cluster como **convex hull translúcido** atrás dos nodes (cores: `from-emerald-950/20 via-transparent`).

5 clusters predefinidos:
- 🌎 Consolidação regional (mesma UF + vertical)
- 🏢 Buyer estratégico + addons
- 💡 Por tese
- 🏷️ Por vertical
- 🔥 Hotspots (nodes com >5 edges de weight>0.6)

Cada cluster: expandir / colapsar (vira super-node) / destacar.

---

## 6. Toolbar superior

- Toggle: **Grafo / Mapa** (mantém botão atual)
- **Modo apresentação** (mantém)
- **Snapshot PNG** (canvas → blob)
- **Reset layout** (re-runa simulação)
- Indicador: `N nodes · M edges · X clusters`

---

## 7. Seed mínimo para o grafo ter o que mostrar

Como `eb_matches` está com 0 hoje, vou:
1. Rodar `compute-signals` + `match-batch` (edge functions já existem) **OU**
2. Inserir seed direto: ~150 matches sintéticos cruzando companies × buyers × theses com scores variados (40–95) para validar visualmente.

Recomendo (2) para teste imediato, depois rodar (1) para dados reais.

---

## 8. Arquivos a criar / editar

### Novos:
- `src/components/equity-brain/graph/StrategicGraph.tsx` — render principal com react-force-graph-2d
- `src/components/equity-brain/graph/GraphFilterSidebar.tsx`
- `src/components/equity-brain/graph/NodeDetailPanel.tsx` (Sheet lateral)
- `src/components/equity-brain/graph/EdgeDetailPopover.tsx`
- `src/components/equity-brain/graph/GraphLegend.tsx` (canto inferior esquerdo)
- `src/lib/equityGraphBuilder.ts` — transforma dados Supabase em `{nodes, edges}`
- `src/lib/equityGraphScoring.ts` — fórmulas de peso e confidence
- `src/lib/equityGraphClusters.ts` — detecção de clusters

### Editar:
- `src/pages/equity-brain/GrafoPage.tsx` — trocar `<DealGraph>` por `<StrategicGraph>`, manter modo apresentação
- `package.json` — add `react-force-graph-2d` + `d3-force`

### Migration (única, leve):
- Seed de ~150 `eb_matches` para o grafo nascer "vivo" (scripts INSERT ... SELECT com cruzamento real entre companies/buyers existentes).

### Manter intacto:
- `DealGraph.tsx` (deletar depois que novo estiver validado, ou manter como `LegacyDealGraph` para fallback)
- Layout `EquityBrainLayout` e sidebar
- Rota `/equity-brain/grafo`

---

## 9. Performance

- `react-force-graph-2d` em Canvas: aguenta 1000+ nodes a 60fps.
- Filtros aplicam memoizados (`useMemo` sobre dataset bruto).
- Simulação re-roda só quando dataset muda (não em hover).
- Mobile: continua mostrando tela "apenas desktop" (limite mantido).

---

## 10. Fora de escopo desta entrega (futuro)

- Geração de tese de M&A via IA ao clicar numa edge (placeholder com CTA).
- Export para PDF / pitch deck.
- Histórico de snapshots (versionamento do grafo).
- Salvar layout customizado por usuário.

---

## Resultado esperado

Ao abrir `/equity-brain/grafo` o usuário vê uma **rede orgânica pulsante** — sellers, buyers, teses e ativos flutuando, conectados por linhas coloridas de espessuras variadas, com clusters formando-se naturalmente em "regiões" do canvas. Clicando num node, painel lateral revela conexões, estratégias e top matches. Filtros à esquerda permitem alternar entre "ver tudo" e "só roll-up regional", "só arbitragem de valuation", etc.

**Frase do produto** entregue: deixa de ser um CRM visual hierárquico → vira um **motor de construção de equity** onde cada conexão é uma rota possível de criação de valor.