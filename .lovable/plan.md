# Equity Brain Jarvis — Evolução do Grafo

Transformar o grafo atual (`react-force-graph-2d`, canvas HUD, congelamento físico, foco top-12) em um **cérebro de IA vivo e funcional para decisão de M&A**. O 2D não morre — vira o "modo leve". O modo Jarvis é 3D, narrativo e responde a comandos.

---

## Estado atual (o que já temos e mantemos)

- `StrategicGraph.tsx` (2D, force-directed, freeze após 6s, top-12 focus)
- `equityGraphBuilder.ts` (sellers/buyers/teses/platforms/assets/strategies + 14 edge types)
- `equityGraphScoring.ts` (`SCORE_WEIGHTS`, `EDGE_COLORS`, `NODE_COLORS`, `EDGE_LAYERS`)
- `equityGraphClusters.ts` (5 tipos de cluster)
- `NodeDetailPanel.tsx`, `GraphFilterSidebar.tsx`, `GraphLegend.tsx`
- `GrafoPage.tsx` com modo apresentação

**Nada disso é jogado fora.** O 3D **reusa** o builder, scoring e clusters via um **adapter**.

---

## Fases — entrega incremental

### Fase 1 — Jarvis Visual 3D (foco desta aprovação)

Salto visual imediato. Sem mexer em lógica de negócio.

**Stack nova (versões fixas para Vite/React 18):**
- `react-force-graph-3d`
- `three@>=0.133`
- `three-spritetext`
- `d3-force-3d`
- `postprocessing` (UnrealBloomPass para glow)

**Arquivos a criar:**
```
src/pages/equity-brain/GrafoJarvisPage.tsx
src/components/equity-brain/jarvis/
  JarvisGraph3D.tsx
  JarvisHUD.tsx
  JarvisLegend.tsx
src/lib/equityGraphJarvisAdapter.ts
```

**Arquivos a editar:**
- `src/App.tsx` — adicionar rota `/equity-brain/grafo-jarvis`
- `src/components/equity-brain/EBSidebar.tsx` — link "Grafo 3D (Jarvis)"
- `src/pages/equity-brain/GrafoPage.tsx` — botão toggle "Modo Jarvis 3D"

**O que entra no 3D:**
- Esferas tipadas por papel: seller (verde+núcleo pulsante), buyer_strategic (cyan+anel orbital), buyer_financial (azul+halo capital), thesis (violeta+órbita), platform (âmbar grande+satélites), asset (cinza metálico), strategy (rose+anéis concêntricos).
- Glow aditivo (`AdditiveBlending`) com intensidade = `heat = f(score, degree, strongDegree)`.
- Anéis orbitais para `buyer_strategic` e `platform`.
- Labels via `SpriteText` apenas quando `hot || score>=75 || degree>=5` (evita poluição).
- Câmera inicial em z=850, rotação automática lenta enquanto sem foco.
- Background dark (`#08090b`) com nebulosa radial reaproveitando o atual.

**Arestas vivas com regra anti-ruído:**
Partículas direcionais **só** se: hover ativo OU foco ativo OU `weight>=0.75` OU tipo ∈ {`buyer_acquires_seller`, `platform_addon`, `valuation_arbitrage`}.
- `linkDirectionalParticles`: 3 quando ativa
- `linkDirectionalParticleSpeed`: `0.002 + weight*0.006`
- `linkOpacity`: focado → 0.95, vizinho de hover → 0.9, idle forte → 0.18, demais → 0.04

**Adapter (`equityGraphJarvisAdapter.ts`):**
Recebe `{nodes, edges}` do builder atual + filtros e devolve `JarvisGraphData` enriquecido com `degree`, `strongDegree`, `hot`, `heat`, `visualRadius`, `showLabel`, `strategicRole` (acquirer/target/platform/capital_provider/thesis/asset).

**Performance:**
- `cooldownTicks={120}`, `d3VelocityDecay=0.35`
- Mesmo padrão de freeze (`fx/fy/fz`) após estabilizar
- Mobile: continua mostrando fallback "apenas desktop"

---

### Fase 2 — Foco inteligente (após Fase 1 aprovada e validada)

- Clique no nó: câmera anima até o nó (`cameraPosition` com lookAt) em 900ms.
- Top-12 conexões mais fortes acendem, demais escurecem para opacidade 0.04 (já temos a lógica em 2D — portamos).
- `JarvisInsightPanel` substitui `NodeDetailPanel` no modo 3D, com:
  - **Para seller:** melhores compradores ranqueados com motivo, teses de valor aplicáveis, próximos movimentos comerciais.
  - **Para buyer:** targets recomendados, movimento ideal (plataforma + add-ons), tese dominante.
  - **Para thesis:** sellers que cumprem os sinais + buyers alinhados.
- Cluster shells: cascas translúcidas 3D (`SphereGeometry` semi-transparente) ao redor dos cluster ids já produzidos por `detectClusters`.

---

### Fase 3 — Motor de oportunidades

Novo arquivo `src/lib/equityGraphInsights.ts`:
- `rankJarvisOpportunities(graph)` → top 20 deals ordenados por:
  ```
  score = weight*35 + confidence*15 + sourceScore*0.15 + targetScore*0.15
        + synergyScore*20 + urgencyScore*10 + valuationArbitrage*10
  ```
- Rankings filtráveis: global / por buyer / por seller / por tese / por vertical-UF.
- Painel "Top Movimentos" no HUD lateral, clicar → highlight no grafo.

---

### Fase 4 — Simulação de M&A

Novo arquivo `src/lib/equityGraphSimulations.ts`:
- `simulateAcquisition`, `simulateRollup`, `simulateMerger`, `simulateCapitalInjection`, `simulateValuationArbitrage`.
- Saída `DealSimulation` com receita combinada, sinergias, EBITDA expansion, múltiplo atual vs pós-deal, **equity criado**, riscos, próximos passos.
- HUD overlay "WAR ROOM" mostrando o número grande de equity criado e a tese.
- Visual: nós envolvidos acendem, casca de cluster temporária aparece, partículas máximas nas arestas da simulação.

---

### Fase 5 — Comando natural ("Jarvis" de fato)

`JarvisCommandPanel.tsx` com input estilo terminal + parser:
- Intents: `focus_company`, `find_rollups`, `find_arbitrage`, `simulate_deal`, `rank_opportunities`, `explain_connection`, `find_buyers`, `find_synergies`.
- Parser local primeiro (regex/keywords). Depois, opção de chamar **Lovable AI Gateway** (`google/gemini-2.5-flash`) para classificação de intent + extração de filtros, sem custo extra de API key.
- Resposta visual: filtros aplicados automaticamente + zoom/foco + texto explicativo no painel.

---

## Modos de operação (HUD)

| Modo | Quando | UI |
|---|---|---|
| `explore` | Default analista | Sidebar filtros + legend + insight panel |
| `focus` | Após clique em nó | Câmera centrada, top-12 vivas, demais dimmed |
| `war_room` | Apresentação cliente | Sidebar/header escondidos (já temos), sequência scriptada de takes |

---

## Detalhes técnicos relevantes

- **Versões fixas obrigatórias** (Vite + React 18): `three@^0.158`, `react-force-graph-3d@^1.24`, `three-spritetext@^1.8`, `d3-force-3d@^3.0`, `postprocessing@^6.35`.
- `vite.config.ts`: adicionar `three`, `react-force-graph-3d` em `optimizeDeps.include` para evitar re-bundles lentos no dev.
- WebGL: o 3D usa GPU, então o canvas atual e o canvas 3D são alternados via rota — nunca renderizados juntos.
- Reusa 100% das queries Supabase já existentes (`eb_companies`, `eb_buyers`, `eb_matches`, `eb_investment_theses`, `eb_buyer_theses`).
- Sem migrations no banco para Fases 1–4. Fase 5 pode opcionalmente persistir comandos em `eb_jarvis_commands` (decidir depois).

---

## Ordem que vou executar

Aprovando este plano, **executo apenas a Fase 1** e te entrego para validar visualmente. Fases 2–5 cada uma vira aprovação separada para evitar entrega gigante e quebrar nada do que já está em produção.