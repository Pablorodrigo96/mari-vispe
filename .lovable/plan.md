# Mapa 3D Deck.gl em `/equity-brain/pipeline`

Objetivo: adicionar visualização 3D opcional ao mapa de Mandatos da página Pipeline, sem mexer no Leaflet existente, mantendo dados, filtros e legendas.

## Bloco 0 — Inspeção + decisões

Resultado da inspeção do mapa atual:

| Item | Detalhe |
|---|---|
| Página | `src/pages/equity-brain/PipelinePage.tsx` (tab "Mandatos" → view "Mapa") |
| Componente de mapa | `src/pages/equity-brain/MapaPage.tsx` com 3 modos (`heat`, `mandates`, `anatel`) |
| Mapa de mandatos | `src/components/equity-brain/MandateMap.tsx` (Leaflet + leaflet.markercluster + CARTO dark) |
| Hook de dados | `useMandatePins` → view `eb_v_mandate_pins` (id, fase, cnpj, razão, municipio, uf, lat, lng), limite 2000 |
| Estrutura dado | `MandatePin { id, fase, company_cnpj, razao_social, municipio, uf, faturamento_estimado, latitude, longitude }` |
| Filtros existentes | Toggle de modo + filtros de vertical herdados; legenda por `fase` (match/cold/nbo/spa/closed/cancelado) |
| Cobertura geográfica | Todos os mandatos retornados pela view já têm lat/lng (filtro server-side) |

Decisões propostas (a confirmar antes do Bloco 1):

1. Toggle 2D/3D = botão flutuante no canto superior direito **apenas dentro do modo "Mandatos"**, não na barra "VISUALIZAÇÃO:" (essa barra é semântica diferente: tipo de dado, não tipo de render).
2. 2D continua sendo `MandateMap` (Leaflet). 3D será um novo `MandateMap3D` (Deck.gl). Coexistência via switcher.
3. Basemap 3D: CARTO Dark Matter (mesmo do Leaflet) via MapLibre, para identidade visual idêntica.
4. Pacotes: `@deck.gl/core @deck.gl/layers @deck.gl/aggregation-layers @deck.gl/geo-layers @deck.gl/react maplibre-gl react-map-gl@^7`.
5. Lazy load do bundle 3D: `React.lazy` no switcher para não pesar a rota quando o usuário fica em 2D.

## Bloco 1 — Deck.gl básico

- Instalar pacotes.
- Criar `src/components/equity-brain/MandateMap3D.tsx`:
  - `DeckGL` + `Map` (MapLibre, CARTO dark style).
  - `INITIAL_VIEW_STATE`: centro Brasil (-51.92, -14.23), zoom 4, pitch 45, bearing 0, minZoom 2, maxZoom 18.
  - `ScatterplotLayer` lendo `MandatePin[]` com cor por `fase` (mapa RGB que espelha `PHASE_COLORS` do `MandateMap`), default Volt #D9F564.
  - Tooltip básico (razão social + município/UF + fase).
  - Click → mesma navegação atual (`/equity-brain/crm/mandate/:id`).
- Estados: loading skeleton, vazio ("Nenhum mandato geocodificado ainda"), erro silencioso (fallback 2D).
- Smoke: 60fps desktop, 30+fps mobile com os ~366 pontos atuais.

## Bloco 2 — Toggle 2D/3D + estado

- Criar `src/components/equity-brain/MandateMapSwitcher.tsx` que recebe `mandates` e mantém:
  - `mode: '2d' | '3d'` (default `2d`, persistido em `localStorage` `eb.mapa.mandates.mode`).
  - `sharedView: { center: [lng,lat], zoom }` propagado entre os dois mapas (handlers `onMoveEnd` / `onViewStateChange`).
- Substituir o render direto de `<MandateMap />` em `MapaPage.tsx` por `<MandateMapSwitcher />`.
- Criar `Toggle3D` (botão flutuante top-right, fundo zinc-900/80, border zinc-800, font-mono uppercase, ativo = bg Volt + texto preto).
- Transição: fade-out 100ms / fade-in 100ms (sem morfar engines).
- Smoke: trocar modos preserva centro/zoom; filtros e seleção permanecem.

## Bloco 3 — Visualizações 3D avançadas

Adicionar 3 camadas, controladas por painel de toggles (canto inferior esquerdo):

1. `ColumnLayer` (ativo por padrão): clusteriza por UF (ou município quando zoom > 6) usando agregação client-side a partir de `MandatePin[]`. Altura proporcional a `count`, cor predominante por `fase`.
2. `HexagonLayer` (off por padrão): densidade hexagonal com `colorRange` em gradiente Volt (zinc → Volt).
3. `ArcLayer` (off por padrão, ativa ao clicar cluster): arcos da empresa selecionada até buyers compatíveis. Fonte inicial = lista vazia até integrarmos matches; nesta fase deixar **stub preparado** que aceita `arcs: { from:[lng,lat], to:[lng,lat] }[]` via prop, sem buscar dados novos.

Cores idênticas à legenda do 2D (reaproveitar `PHASE_COLORS` em `rgb`).

## Bloco 4 — Animações + globo + polimento

- Pulsação sutil (alpha senoidal, 50ms tick) **apenas** para colunas com `fase ∈ {match, nbo}`.
- `GlobeView` quando `viewState.zoom <= 2.5`; volta para `MapView` acima disso. Brasil destacado com leve halo Volt.
- Tooltip estilo Bloomberg (zinc-900/95, border zinc-700, monospace) com: cidade/UF, total de mandatos, fase dominante, último update (já existe? se não, omitir campo).
- Flyto cinematográfico no **primeiro** acesso ao modo 3D na sessão (zoom 2 → 4, pitch 0 → 45, 2.5s, `FlyToInterpolator`). Flag em `sessionStorage`.
- Mobile (`useIsMobile`): pitch 30°, pulsação off, globo off (minZoom 3), prop `enableHighFidelity=false`.
- `useMemo` em layers, lazy load do switcher 3D via `React.lazy`, limite client-side de 1000 pontos antes de degradar para hexágonos automaticamente.

## Regras de escopo

- Não tocar em backend, queries ou view `eb_v_mandate_pins`.
- Não mexer nos modos `heat` e `anatel` da página (só `mandates`).
- Não alterar legendas/filtros existentes — apenas espelhar no 3D.
- Pausa para validação ao fim de cada bloco.

## Detalhes técnicos

```text
src/
  components/equity-brain/
    MandateMap.tsx           (Leaflet — inalterado)
    MandateMap3D.tsx         (novo — Deck.gl + MapLibre)
    MandateMapSwitcher.tsx   (novo — toggle + estado compartilhado)
    map3d/
      Toggle3D.tsx
      LayerToggles.tsx
      Tooltip3D.tsx
      colors.ts              (PHASE_COLORS_RGB compartilhado)
  pages/equity-brain/
    MapaPage.tsx             (troca <MandateMap/> por <MandateMapSwitcher/>)
```

Bundle splitting: o `MandateMap3D` é importado via `React.lazy` dentro do switcher; o chunk `equity-brain-3d` já existe em `vite.config.ts` (atualizar regex para incluir `@deck.gl` e `maplibre-gl`).
