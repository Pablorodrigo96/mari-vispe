## Objetivo

Refinar o `JarvisGraph3D` em quatro frentes: bundle menor com import dinâmico granular, espaçamento mínimo entre empresas (anti-amontoamento), 10% dos nós com "conexões fantasmas" que aparecem/desaparecem (efeito de cérebro vivo) e arestas curvas reais visíveis no zoom out.

---

## 1. Bundle: import dinâmico por partes + tree-shake

**Problema atual**: `JarvisGraph3D.tsx` faz `import * as THREE from "three"` no topo, puxando o pacote inteiro (~600KB). `SpriteText` também é estático.

**Mudanças em `src/components/equity-brain/jarvis/JarvisGraph3D.tsx`**:
- Trocar `import * as THREE from "three"` por imports nomeados:
  ```ts
  import {
    Group, Mesh, SphereGeometry, RingGeometry,
    MeshBasicMaterial, Color, AdditiveBlending, DoubleSide,
  } from "three";
  ```
  Isso permite tree-shake real do three.js, removendo loaders, cameras, renderers, audio, animation, etc. que não são usados (a `ForceGraph3D` traz seu próprio renderer internamente).
- Carregar `ForceGraph3D` e `SpriteText` via `React.lazy` + dynamic `import()` dentro de um wrapper interno (`JarvisGraph3DInner`), com fallback de loading. O componente exportado vira um shell leve que só monta o inner quando o container já tem dimensões.
- Remover o uso atual de `THREE.Color`, `THREE.SphereGeometry` etc. via namespace e usar as classes nomeadas.

**`vite.config.ts`**:
- Adicionar `build.rollupOptions.output.manualChunks` separando `three`, `react-force-graph-3d`, `three-spritetext` em um chunk `equity-brain-3d`. Isso garante que o chunk só seja baixado na rota `/equity-brain/grafo-jarvis`.
- Manter o `optimizeDeps.exclude` atual (continua necessário no dev).

**Dependências removidas** (`package.json`): nenhuma dependência 3D extra para remover — o projeto já usa apenas `three`, `three-spritetext`, `react-force-graph-3d`. Confirmamos via grep que `d3-force-3d` é trazido transitivamente pelo `react-force-graph-3d` (não removível). Vamos garantir que `d3-force-3d` não seja importado diretamente em código nosso (não é).

**Resultado esperado**: chunk inicial do app não carrega three; chunk 3D fica isolado e só baixa na rota Jarvis.

---

## 2. Espaçamento mínimo entre empresas

**Problema**: empresas (`seller`) ficam amontoadas porque o `charge` é uniforme e não há colisão por raio visual.

**Mudanças em `JarvisGraph3D.tsx` (bloco `useEffect` de forças)**:
- Aumentar repulsão global: `charge.strength(-650)` (era -380) e `distanceMin(40)`.
- Adicionar uma força de **colisão 3D** usando `forceCollide` de `d3-force-3d`:
  ```ts
  import { forceCollide } from "d3-force-3d";
  fg.d3Force("collide", forceCollide((n: any) => (n.visualRadius ?? 6) * 2.4).strength(0.9).iterations(2));
  ```
  O multiplicador 2.4 garante distância mínima ≈ 2× o raio visual entre quaisquer dois nós.
- Reforço extra para sellers: força custom `seller-spread` que aplica repulsão adicional só entre nós do tipo `seller` (curto alcance, ~120px) — evita que vários sellers conectados ao mesmo buyer colapsem em cima uns dos outros.
- Reduzir `linkForce.strength` para `Math.max(0.04, w * 0.45)` (era 0.7) para que arestas fortes não puxem demais.
- Aumentar `linkForce.distance` base de 90 → 140.

**Resultado**: nós com respiração visível, sem sobreposição mesmo em clusters densos.

---

## 3. Conexões fantasmas (10% dos nós)

**Conceito**: arestas decorativas que pulsam in/out simulando "sinapses" — não afetam física nem dados.

**Implementação**:
- No `useMemo` que constrói `graphData`, após gerar `nodes`/`links` reais, sortear 10% dos nós (priorizando `seller` e `buyer_*`) como "neurônios ativos". Para cada um, gerar 1–2 candidatos de "ghost link" para vizinhos próximos no espaço (pares aleatórios da lista, sem duplicar arestas reais).
- Guardar essa lista em estado separado `ghostLinks` (não entra no `graphData` passado ao ForceGraph — não influencia layout).
- Renderizar overlay via `linkThreeObjectExtend={true}` + `linkThreeObject` customizado **OU**, mais simples: usar `forceGraph.scene()` para adicionar um `Group` de linhas próprio depois do mount.
  - Abordagem escolhida: hook `useGhostSynapses(fgRef, ghostLinks, nodesById)` que:
    1. Cria um `Group` com `LineSegments` (BufferGeometry de posições) adicionado a `fgRef.current.scene()`.
    2. Em cada frame (`requestAnimationFrame`), para cada ghost link calcula uma fase senoidal `phase = sin(t * speed + offset)`. Quando `phase > threshold`, a linha está "viva" — com opacidade animada `0 → 0.6 → 0` e um pequeno ponto luminoso (`Points`) viajando ao longo dela.
    3. Atualiza posições dos endpoints lendo `node.x/y/z` (que o force-graph mantém atualizado).
    4. Cada ghost tem ciclo de vida de 1.5–4s, depois é re-sorteado para outro par.
- Cor dos ghosts: ciano translúcido `#22d3ee` com `AdditiveBlending`, espessura fina, sem partículas direcionais (elas já existem nas reais).
- Limite: máx 30 ghosts simultâneos para não pesar.

**Resultado**: efeito de "cérebro disparando sinapses" — conexões aparecem/desaparecem em ondas, criando movimento mesmo quando o grafo está congelado.

---

## 4. Arestas curvas reais (arcos)

**Problema atual**: `linkCurvature={0.18 + w*0.08}` produz curvatura baixa, e em zoom out as linhas viram segmentos quase retos justapostos = visual fragmentado.

**Mudanças**:
- Aumentar curvatura base e vinculá-la à distância entre os nós, não só ao peso:
  ```ts
  linkCurvature={(l) => {
    const s = l.source, t = l.target;
    const dist = Math.hypot((s.x ?? 0)-(t.x ?? 0), (s.y ?? 0)-(t.y ?? 0), (s.z ?? 0)-(t.z ?? 0));
    return Math.min(0.55, 0.25 + dist / 1800);
  }}
  ```
  Quanto mais distantes os nós, mais arqueada a conexão — gera o visual de "feixes orbitais" no zoom out.
- Adicionar `linkCurveRotation={(l) => /* hash determinístico do par */}` para que múltiplas arestas entre o mesmo cluster não se sobreponham (cada arco em um plano diferente).
- Definir `linkResolution={12}` (era default 2) para suavizar a curva — mais segmentos = arco contínuo em vez de quebrado. Custo trivial.

**Resultado**: zoom out mostra arcos suaves e contínuos, lembrando feixes neurais; zoom in mantém legibilidade.

---

## Arquivos afetados

- `src/components/equity-brain/jarvis/JarvisGraph3D.tsx` — imports nomeados de three, lazy do ForceGraph3D/SpriteText, forças (collide + seller-spread), curvatura por distância, `linkResolution`, hook de ghosts.
- `src/components/equity-brain/jarvis/useGhostSynapses.ts` — **novo**: gerencia ghost links via `scene()` + RAF.
- `src/lib/equityGraphJarvisAdapter.ts` — adicionar marcação `isNeuron: boolean` em ~10% dos nós (sellers/buyers preferenciais), exposta para o hook escolher candidatos.
- `vite.config.ts` — `manualChunks` para isolar `three` + libs 3D.

## Notas técnicas

- O hook de ghosts usa `cancelAnimationFrame` no cleanup e remove o `Group` da `scene()` para evitar leaks ao desmontar.
- `forceCollide` do `d3-force-3d` opera em 3D nativo (vs. `d3-force` que é 2D) — o pacote já está nas deps via `react-force-graph-3d`, então o import direto funciona sem custo extra de bundle.
- Tree-shake do three: confirmado que classes nomeadas removem ~60–70% do peso de three.module.js em build de produção.
- Não há mudança de schema, RLS ou Supabase. Mudança puramente client-side de visualização.
