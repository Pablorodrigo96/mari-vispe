## Objetivo

Três upgrades visuais no Jarvis 3D, sem mexer em física/dados:

1. **Explosão solar (sinapse-flare)** — a cada ~10s, um único raio assimétrico atravessa dois nós aleatórios, com pulso brilhante e fade-out (~1.5s).
2. **Conexões dourado-neon** — links seller↔seller deixam de ser amarelo "pálido" e passam a um dourado real reluzente, com halo neon ao redor.
3. **Arcos em vez de retas** — aumentar curvatura/visibilidade dos links para que sejam claramente arcos, não cordas retas.

---

## 1. Sinapse-flare (explosão solar a cada ~10s)

Novo hook `useSolarFlares` (arquivo novo: `src/components/equity-brain/jarvis/useSolarFlares.ts`), seguindo o padrão de `useGhostSynapses`:

- A cada `9000–12000 ms` aleatórios, escolhe 2 nós quaisquer com posição válida.
- Cria **uma única curva Bézier 3D** entre eles (`THREE.QuadraticBezierCurve3`), com ponto de controle deslocado em direção **perpendicular ao vetor A→B** + componente vertical aleatória → garante **assimetria** (não passa pelo meio reto).
- Renderiza como `Line` (32–48 segmentos) com `LineBasicMaterial` aditivo cor `#fff7c2` (núcleo) + uma segunda `Line` mais grossa cor `#fbbf24` (halo) na mesma curva.
- Animação ~1500ms: opacidade sobe (0→1 em 200ms) e desce (1→0 em 1300ms); largura/escala do halo cresce levemente.
- Após o fade, remove as 2 linhas. Apenas **1 flare ativo por vez** (simples e impactante, como pedido).
- Adicionado à scene via `(fg).scene()`, com `name: "solar-flare-active"` para limpar em HMR/unmount.
- Invocado em `JarvisGraph3D.tsx` ao lado de `useGhostSynapses(...)`.

## 2. Conexões dourado-neon (seller↔seller)

Em `src/lib/equityGraphScoring.ts`:
- `seller_acquires_seller`: muda de `hsl(45, 100%, 60%)` para `hsl(45, 100%, 55%)` (dourado real, mais saturado/quente).
- `seller_merges_with_seller`: idem.

Em `JarvisGraph3D.tsx` (`<ForceGraph3D>` props):
- **`linkWidth`**: para edges seller↔seller, multiplicar largura por 1.6 (linha mais "gorda" sustenta o glow).
- **`linkDirectionalParticles`**: mínimo de 4 partículas em links seller↔seller (mesmo idle), cor `#fde68a` → mais brilhante e contínuo, criando sensação de "neon escorrendo".
- **`linkDirectionalParticleWidth`**: 2x o padrão para esses links.
- Adicionar prop **`linkOpacity`** dinâmica (já existe `linkOpacityFn` mas não está sendo passada — passar como `linkOpacity={linkOpacityFn}`); para gold links, opacidade base sobe para 0.85.
- Para o efeito **halo neon**, usar `linkMaterial` custom: retornar uma `LineBasicMaterial` com `blending: AdditiveBlending` para edges gold (cor `hsl(45, 100%, 65%)`), o que somado ao link normal cria o glow ao redor.

## 3. Arcos (curvas) em vez de retas

`linkCurvature` já existe (0.25–0.55). Para arcos mais visíveis:
- Aumentar para **0.4–0.8** (arcos pronunciados, não quase-retas).
- Manter `linkCurveRotation` por hash → cada par tem seu próprio plano de arco.
- Confirmar `linkResolution={12}` (já está) → curvas suaves.
- Para evitar arcos desordenados em links super-curtos, manter mínimo de 0.4.

Mudança apenas no objeto literal de `linkCurvature` em `JarvisGraph3D.tsx`.

---

## Arquivos afetados

- **Novo**: `src/components/equity-brain/jarvis/useSolarFlares.ts` — hook de explosão solar
- `src/components/equity-brain/jarvis/JarvisGraph3D.tsx` — invoca o hook, ajusta `linkCurvature`, `linkOpacity={linkOpacityFn}`, `linkWidth`/`linkDirectionalParticles` com bônus para gold, `linkMaterial` custom para halo neon
- `src/lib/equityGraphScoring.ts` — cor seller↔seller mais dourada

## Validação (pós-implementação)

1. Abrir `/equity-brain/grafo-jarvis` no preview.
2. Tirar screenshot inicial → confirmar arcos curvados e conexões douradas com halo neon.
3. Aguardar ~12s e tirar 2º screenshot → tentar capturar uma sinapse-flare em meio fade. Se não pegar, validar via console que o hook está disparando (`[SolarFlare] fired`).
4. Confirmar que tela continua estável (sem branco, sem warnings de three).
