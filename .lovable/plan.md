# Auditoria — Mapa 3D (MandateMap3D + Switcher)

Revisão técnica do que foi entregue na última iteração. Encontrei **3 bugs reais** que vão impactar UX/perf, **5 melhorias importantes** e alguns refinamentos. Nada bloqueia o uso, mas vale corrigir antes de demo.

## 🔴 Bugs reais (corrigir)

### 1. Pulsação recria TODAS as camadas a cada 60ms
Em `MandateMap3D.tsx:139-240` o `useMemo` de `layers` tem `pulseScale` como dependência. Resultado: a cada tick (60ms) **HexagonLayer e ScatterplotLayer também são recriadas**, mesmo elas não pulsando. HexagonLayer re-agrega 366 pontos em hex bins toda vez — mata o FPS quando o usuário liga hexágonos.

**Fix:** mover `pulseScale` para fora do `useMemo` de layers; aplicar via `updateTriggers.getFillColor` no ColumnLayer apenas, com `pulseScaleRef.current` lido dentro do accessor.

### 2. `transitionDuration` / `transitionInterpolator` ficam grudados no state
Em `MandateMap3D.tsx:115-117` o flyto seta `transitionDuration: 2500` no viewState. Como `onViewStateChange` substitui o objeto inteiro a cada movimento, esses campos **persistem indefinidamente**. Toda movimentação do usuário fica com transição artificial de 2.5s — sensação de "input com lag".

**Fix:** no callback `onViewStateChange`, descartar `transitionDuration` e `transitionInterpolator` antes de salvar.

### 3. `views` é instanciado a cada render
Em `MandateMap3D.tsx:283-287`, `new GlobeView()` / `new MapView()` rodam em todo render. Deck.gl detecta mudança de identidade do view e descarta/recria o WebGL context em transições zoom 2.5 → vira preto por 1-2 frames + memory leak ao trocar várias vezes.

**Fix:** memoizar `const mapView = useMemo(() => new MapView({id:"map"}), [])` e `globeView` idem.

## 🟡 Melhorias importantes

### 4. Pan no 2D não atualiza `sharedView`
`MandateMapSwitcher.tsx`: só o 3D dispara `onViewChange`. Quando o usuário panoramiza em 2D (Leaflet) e troca pra 3D, volta pro centro do Brasil. O plano prometia sincronização.

**Fix:** expor `onMoveEnd` no `MandateMap.tsx` (Leaflet) → propagar centro/zoom pro switcher.

### 5. Pontos com lat/lng inválidos quebram Deck.gl
`useMandatePins` faz `Number(m.latitude)`. Se a view devolver `null` ou string vazia, vira `NaN` → ScatterplotLayer renderiza ponto em (NaN,NaN) e pode crashar o GPU pipeline em alguns drivers.

**Fix:** `.filter(m => Number.isFinite(m.latitude) && Number.isFinite(m.longitude))` antes de retornar.

### 6. Centroide UF = média simples das coordenadas
`aggregateByUF` faz média aritmética das lat/lng. Para um mandato em Pelotas + um em Porto Alegre, a coluna RS aparece no meio (Camaquã). Visualmente parece dado errado.

**Fix:** usar capital da UF (`stateCapitals` já existe em `src/lib/brazilCoordinates.ts`).

### 7. ArcLayer com dados fake (stub) está habilitável pelo usuário
Toggle "Arcos" mostra arcos entre as 5 maiores UFs como **demo visual**. Em uma demo pro investidor isso é mentira gráfica.

**Fix:** ou desabilitar o toggle (disabled + tooltip "em breve"), ou plugar de fato em matches reais. Se mantiver stub, deixar bem claro com label "Arcos (demo)".

### 8. Toggle3D não-acessível
Botões sem `aria-label` nem `aria-pressed`. Canvas Deck.gl sem fallback a11y.

**Fix:** `aria-pressed={active}` nos botões + `role="group"` no wrapper.

## 🟢 Refinamentos opcionais

| # | Item | Detalhe |
|---|------|---------|
| 9 | Bundle 3D pesado (~1.5MB gz) | Já tá em chunk separado via vite.config; OK |
| 10 | Tooltip HTML inline | Funciona mas vaza estilos; idealmente extrair `Tooltip3D` |
| 11 | Sem indicador de quantos pontos | UF com 109 mandatos vs UF com 2 não tem label numérico visível no globo |
| 12 | `useIsMobile` retorna `undefined` no primeiro render | Pode mostrar pitch 45 num frame e cair pra 30 — flash mínimo |
| 13 | `reuseMaps` no MapLibre exige que só haja UM Map por vez | Atualmente OK; documentar |
| 14 | Legenda fixa no canto inferior-direito | No mobile (440px) sobrepõe os toggles de camada (canto inferior-esquerdo é OK, mas legenda pode quebrar layout) |

## 🟢 O que está bom

- ✅ Lazy-load via `React.lazy` funcionando, bundle 2D não carrega Deck.gl
- ✅ localStorage persiste preferência 2D/3D
- ✅ Paleta espelha exatamente `PHASE_COLORS` do 2D
- ✅ Modo `heat` e `anatel` da página intactos (zero regressão)
- ✅ Backend, RLS, queries: nada tocado
- ✅ Mobile com pitch reduzido e pulsação off
- ✅ Vite chunk `equity-brain-3d` cobrindo deck.gl/maplibre

## Plano de correção sugerido (~45min)

1. Memoizar `mapView`/`globeView` + limpar transição no callback (bugs 2 e 3) — 10min
2. Refactor da pulsação com ref + updateTriggers (bug 1) — 15min
3. Filtro NaN no `useMandatePins` (bug 5) — 5min
4. Centroide via capital UF (bug 6) — 5min
5. Sync 2D→3D ouvindo `moveend` do Leaflet (bug 4) — 10min
6. Decidir destino do toggle Arcos (bug 7) — definir com Pablo
7. a11y básico (bug 8) — 5min

Quer que eu execute esse pacote agora? Se sim, aprove o plano que eu já saio implementando.
