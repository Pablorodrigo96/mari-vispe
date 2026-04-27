
# Fase 9 — Mapa do Brasil + Grafo React Flow

Dois novos cockpits visuais dentro de `/equity-brain/*`: um **mapa interativo do Brasil** com 3 níveis de zoom (choropleth UF → cluster cidade → pin CNPJ) e um **grafo React Flow** mostrando conexões empresa ↔ tese ↔ buyer. Ambos lêem das views/tabelas já criadas nas Fases 1–7 e reutilizam o `<DealCard />` da Fase 8.

## 1. Decisões técnicas vs. prompt original

- **Leaflet, não Mapbox.** O projeto já usa Leaflet vanilla + cartocdn dark tiles (`src/components/map/BusinessMap.tsx`) e existe a regra dura em memória: `Interactive maps MUST use vanilla Leaflet via hooks`. Mapbox exigiria token, configurar CSP e quebraria o padrão. Vou usar Leaflet com a mesma stack já validada, atingindo o mesmo resultado visual (dark, choropleth, cluster, pulse).
- **Tier vem de `ma_score`.** A tabela `opportunities_ready` não tem coluna `tier`. A `OportunidadesPage` já usa thresholds (`>=80 premium`, `60–80 strong`, `<60 standard`). Vou centralizar isso em `src/lib/equityBrain.ts` (helper `tierFromScore`) e usar nas duas novas páginas.
- **Coordenadas reais.** `equity_brain.companies` já tem `latitude`/`longitude` numeric. Para zoom alto, plotamos pin direto com essas coords (filtrando `IS NOT NULL`). Para zoom baixo, agregamos por UF/município via SQL (sem ler 5500 features no front).

## 2. Setup compartilhado

**Nova migration** `equity_brain_geo_aggregations.sql`:
- `CREATE OR REPLACE VIEW equity_brain.v_opportunities_by_uf` — agrega `opportunities_ready` por `uf`: `total`, `premium_count`, `avg_ma_score`, `top_setor`. Usado pelo choropleth.
- `CREATE OR REPLACE VIEW equity_brain.v_opportunities_by_municipio` — agrega por `(uf, municipio)` com `count`, `avg_score`, `lat_centroid`, `lng_centroid` (avg de `companies.latitude/longitude` filtrado). Usado nos clusters de zoom médio.
- Grants: `GRANT SELECT ON ... TO authenticated`. Sem RLS (são views agregadas sem PII).

**Asset estático** `src/lib/brazilStatesGeo.ts`:
- Importa GeoJSON dos 27 estados (~80KB) inline ou via fetch de CDN. Vou usar fetch lazy no client a partir de `https://raw.githubusercontent.com/codeforgermany/click_that_hood/master/public/data/brazil-states.geojson` com cache em `localStorage` (1 dia TTL) — evita aumentar bundle.

**Helpers em `src/lib/equityBrain.ts`** (editar arquivo existente):
- `tierFromScore(score: number): 'premium'|'strong'|'standard'` (≥80, ≥60, resto).
- `tierColor(tier)` → emerald-500/amber-500/zinc-400.
- `choroplethColor(densityPct: number)` → escala emerald (de zinc-900 a emerald-400).

## 3. Sidebar + rotas

**Editar** `src/components/equity-brain/EBSidebar.tsx`:
- Adicionar 2 itens: `{ to: "/equity-brain/mapa", label: "Mapa", Icon: Map }` e `{ to: "/equity-brain/grafo", label: "Grafo", Icon: Network }`.

**Editar** `src/App.tsx`:
- Dentro do bloco já existente do Equity Brain (rotas `/equity-brain/*` sob `RequireRole`), adicionar:
  ```tsx
  <Route path="mapa"  element={<MapaPage />} />
  <Route path="grafo" element={<GrafoPage />} />
  ```

## 4. `<BrasilMap />` — `src/components/equity-brain/BrasilMap.tsx`

Padrão: vanilla Leaflet via `useRef`/`useEffect`, igual `BusinessMap.tsx`.

Estado interno:
- `currentZoom` (controla qual camada renderizar).
- `selectedCnpj` (sobe via callback `onSelectCompany`).

Camadas (toda lógica em `useEffect` que escuta `map.on('zoomend', ...)`):

**Zoom 4–6 — Choropleth UF**
- Carrega GeoJSON estados (lazy) + `v_opportunities_by_uf`.
- `L.geoJSON(features, { style: f => ({ fillColor: choroplethColor(uf.premium_count / uf.total), fillOpacity: 0.65, color: '#27272a', weight: 1 }) })`.
- `onEachFeature`: `bindTooltip` com "RS — 47 premium · score médio 142" e `on('click', () => map.flyTo(centroid, 7))`.

**Zoom 6–9 — Clusters por município**
- Remove geoJSON layer, adiciona `markerClusterGroup` populado a partir de `v_opportunities_by_municipio` filtrado por `latLngBounds` atual do mapa (refetch on `moveend` via React Query com queryKey incluindo bounds arredondados).
- Cluster icon mostra count agregado.

**Zoom 9+ — Pins individuais**
- Query: `opportunities_ready` joined com `companies` (apenas `latitude`/`longitude` not null) limitado por bounding box atual + filtros sidebar. Limite hard de 500 pins.
- Cor pelo `tierFromScore(ma_score)`.
- Pulse para premium: classe CSS `eb-pin-pulse` (animation keyframes em `<style>` inline igual `BusinessMap`).
- `marker.on('click', () => onSelectCompany(cnpj))` → abre drawer com `<DealCard cnpj={...} mode="drawer" />`.

**Sidebar de filtros à direita** (componente `<MapFilters />` interno):
- Mesmos campos da `OportunidadesPage`: UFs, setores, minScore, tier (checkbox), tese top.
- Botão "Mostrar buyers" (toggle) — quando ativo, renderiza pins hexagonais a partir de `equity_brain.buyers` joined com a tabela de localização (se existir; senão usa centroide UF). Buyers só aparecem em zoom ≥ 7.
- Botão "Vincular ao filtro de tabela" — grava filtros em `sessionStorage.eb_global_filters` (lido pela `OportunidadesPage` num `useEffect` para hidratar — implementação leve, sem Zustand novo).

## 5. `<DealGraph />` — `src/components/equity-brain/DealGraph.tsx`

**Dependências novas:** `bun add reactflow dagre`. Sem ELK (dagre é mais leve e suficiente para o nosso volume).

Layout dagre `rankdir: LR` em 3 ranks visuais:
- Rank 0: Empresas (top 50 de `opportunities_ready` por `ma_score`).
- Rank 1: Teses (todas de `equity_brain.investment_theses`).
- Rank 2: Buyers (todos de `equity_brain.buyers`, limitado a 30).

**Nodes customizados:**
- `CompanyNode`: card `bg-zinc-900 border-zinc-800` com `display_name`, `ma_score` colorido, badge `setor_ma`.
- `ThesisNode`: pill `bg-emerald-950/40 border-emerald-900` com `thesis_key` mono.
- `BuyerNode`: card `bg-zinc-900 border-zinc-800` com nome + `buyer_type` badge + `aum` formatado.

**Edges (3 fontes em paralelo via `useQueries`):**
- `companies_scored.score_top_thesis` (ou `best_thesis_key` da view `opportunities_ready`) → edge empresa→tese, animada, `stroke-zinc-700`.
- `equity_brain.buyer_theses` → edge tese→buyer, espessura proporcional a `match_weight`, `stroke-emerald-500/80`.
- `equity_brain.matches` (top 100 por `match_score`) → edge curva empresa→buyer, cor variável.

**Interações:**
- `onNodeClick`: marca `highlightedId`. No render, edges/nodes não conectados ficam `opacity: 0.15`. Reset com click no fundo (`onPaneClick`).
- Tooltip hover via `onNodeMouseEnter` + portal absoluto (sem lib externa).

**Controles React Flow:** `<Controls />`, `<MiniMap />`, `<Background variant="dots" />`. Prop `onlyRenderVisibleElements` ligado.

**Mobile fallback:** se `window.innerWidth < 768`, renderiza placeholder "Grafo disponível apenas no desktop. Acesse de uma tela maior."

## 6. `MapaPage.tsx` — `src/pages/equity-brain/MapaPage.tsx`

Layout 70/30 (mapa esquerda full-height / drawer direita condicional).

Topo: 3 KPIs horizontais (`<EBStatCard>` reutilizado):
1. `UF com mais oportunidades` — top 1 de `v_opportunities_by_uf` por `premium_count`.
2. `Setor mais quente` — agregação client-side de `opportunities_ready` filtrado por `ma_score >= 80`.
3. `Concentração geográfica` — `% premium em top 5 cidades` via `v_opportunities_by_municipio`.

Botão flutuante (canto inferior esquerdo): `<Link to="/equity-brain/grafo">Trocar para Grafo →</Link>` em pill emerald.

Drawer direito: `<Sheet>` controlado por `selectedCnpj` renderizando `<DealCard cnpj={...} mode="drawer" />`.

## 7. `GrafoPage.tsx` — `src/pages/equity-brain/GrafoPage.tsx`

Layout full-screen (`h-[calc(100vh-0px)]`) com `<DealGraph />` ocupando 100%.

Topbar fixa com 4 controles:
- Filtro Tese (Select de `investment_theses`).
- Filtro Buyer (Select de `buyers`).
- Filtro UF (multi-select com `UFS`).
- Toggle "Modo apresentação" — esconde sidebar do EquityBrainLayout via `document.body.classList.add('eb-presentation')` + CSS que oculta `aside`. Restaura no unmount.

Botão flutuante: `<Link to="/equity-brain/mapa">Trocar para Mapa →</Link>`.

## 8. Cuidados implementados

- **Lat/lng faltando**: queries Postgrest sempre incluem `.not('latitude','is',null).not('longitude','is',null)` no nível de pin.
- **5500 municípios travando**: views agregadas no banco + filtro por bounding box do viewport.
- **React Flow em mobile**: fallback explícito.
- **Mapbox e CSP**: contornado escolhendo Leaflet (já aprovado em memória).
- **Performance grafo**: hard caps (50 empresas, 30 buyers, 100 edges empresa-buyer) + `onlyRenderVisibleElements`.
- **Sem Zustand novo**: sincronização tabela↔mapa via `sessionStorage` (mais simples e suficiente para Fase 9).

## 9. Arquivos

**Criar:**
- `supabase/migrations/<timestamp>_equity_brain_geo_aggregations.sql`
- `src/lib/brazilStatesGeo.ts` (loader + cache do GeoJSON)
- `src/components/equity-brain/BrasilMap.tsx`
- `src/components/equity-brain/DealGraph.tsx` (+ nodes internos)
- `src/pages/equity-brain/MapaPage.tsx`
- `src/pages/equity-brain/GrafoPage.tsx`

**Editar:**
- `src/lib/equityBrain.ts` — adicionar `tierFromScore`, `tierColor`, `choroplethColor`.
- `src/components/equity-brain/EBSidebar.tsx` — adicionar links Mapa/Grafo.
- `src/App.tsx` — adicionar 2 rotas filhas em `/equity-brain`.
- `package.json` (via `bun add reactflow dagre`).

## 10. Critérios de aceite

- `/equity-brain/mapa` carrega choropleth UF em <3s e é navegável (zoom troca camadas).
- Click em pin (zoom 9+) abre drawer com `<DealCard />` populado.
- `/equity-brain/grafo` renderiza ≤50 nós + ≤200 edges sem lag perceptível.
- Click em tese isola subgrafo (opacidade 0.15 nos demais).
- Sidebar do Equity Brain mostra Mapa e Grafo como itens ativos.

Aprove para que eu implemente.
