## Objetivo

Hoje `/equity-brain/grafo-jarvis` mostra um placeholder "apenas desktop" em telas <768px. A meta é fazer o globo girar no celular também, com performance aceitável e UI usável em ~390–440px.

A causa do bloqueio é só o `if (isMobile) return <fallback/>` em `JarvisGraph3D.tsx` (linha 778). O motor (`react-force-graph-3d` + Three.js) roda em WebGL no celular sem problema — o que precisa de cuidado é **carga visual** e **layout dos overlays**.

## Estratégia

Arquivo principal: `src/components/equity-brain/jarvis/JarvisGraph3D.tsx`. Pequenos ajustes em `useGhostSynapses.ts` e `useSolarFlares.ts` se for necessário reduzir contagem.

### 1. Remover o gate do mobile
Apagar o early-return em `isMobile`. Manter o `setIsMobile` para usar como flag de perfil.

### 2. Perfil "mobile-lite" automático
Quando `isMobile === true`, aplicar defaults mais leves (mantendo possibilidade do usuário aumentar via painel de Visual):

- **Cap de nós/arestas**: já temos filtros — em mobile, abrir com `selectedNodeTypes = {seller, buyer_strategic, platform}` e `enabledLayers = {ma_direct, rollup}` para começar com ~80–120 nós em vez de 350.
- **Raio da esfera**: `R = 500 + N * 3` clamp 550–1400 (mais compacto pra caber na viewport).
- **DPR cap**: passar `pixelRatio={Math.min(window.devicePixelRatio, 1.5)}` ao `ForceGraph3D` (no celular `dpr=3` mata FPS).
- **Glow / flares / synapses**: desligar `useSolarFlares` e `useGhostSynapses` por padrão no mobile (toggle continua disponível). MAX_GHOSTS de 30 → 8 quando ativado.
- **Vídeo de fundo**: trocar por gradiente CSS estático no mobile (o `<video>` em `object-cover` consome decoder e bateria à toa).
- **Partículas de aresta**: limitar `linkDirectionalParticles` a 0–1 no mobile.
- **Cooldown**: `cooldownTicks={0}` já está; ok.

### 3. UI / Overlays responsivos

- **GraphFilterSidebar**: hoje é um painel fixo `top-0 left-0 h-full`. No mobile virar `Sheet` (drawer) acionado por um botão flutuante `Settings2` no canto inferior esquerdo. Painel ocupa `w-[88vw] max-w-sm` quando aberto, escondido por padrão.
- **HUD topo direito** (status SYNC + N/E/SIG + botão "Ativar tudo"): reduzir para uma única pílula compacta no mobile (`text-[9px]`, esconder SIG, mover "Ativar tudo" pra dentro do drawer de filtros).
- **Painel de Visual (canto inferior direito)**: virar bottom-sheet expansível em vez de card 256px.
- **NodeDetailPanel**: hoje aparece na lateral; no mobile virar bottom-sheet `max-h-[60vh]` com scroll.
- **Cantos decorativos** (4 brackets emerald): manter, são só CSS.
- **Botão "Modo apresentação"**: esconder no mobile (sem valor sem teclado/projetor).

### 4. Toque / interação

`react-force-graph-3d` já trata touch via three-render-objects (pinch zoom + drag pan). Garantir que:
- O container tenha `touch-action: none` (previne scroll do body durante drag).
- `enableNodeDrag={false}` no mobile (evita confusão com pan).
- Tap em nó abre o `NodeDetailPanel` em bottom-sheet em vez de centralizar a câmera (mais natural em telinha).
- Pausar auto-orbit por 10s após qualquer touch (já tem 6s no listener — só estender).

### 5. Header da página

`GrafoJarvisPage.tsx`: a barra superior tem 4 botões + label longo. No mobile colapsar em ícones-only (`Guia`, `Modo 2D`, `Mapa`) e esconder o label "cérebro estratégico imersivo · sellers …".

### 6. Altura

`h-[calc(100vh-1px)]` quebra com a barra de URL do Safari iOS. Trocar por `h-[100dvh]` (já é padrão do projeto, conforme `mobile-layout-standards`).

## Pontos técnicos

```ts
// JarvisGraph3D — defaults condicionais
const MOBILE_DEFAULT_NODES = new Set(["seller","buyer_strategic","platform"]);
const MOBILE_DEFAULT_LAYERS = new Set<LayerKey>(["ma_direct","rollup"]);

useEffect(() => {
  if (!isMobile) return;
  setSelectedNodeTypes(new Set(MOBILE_DEFAULT_NODES));
  setEnabledLayers(new Set(MOBILE_DEFAULT_LAYERS));
  setVisualPrefs(prev => ({ ...prev, glow: 0.3, particles: 0, flares: 0 }));
}, [isMobile]);

<ForceGraph3D
  width={size.w}
  height={size.h}
  rendererConfig={{ antialias: !isMobile, alpha: true, powerPreference: "low-power" }}
  // pixelRatio é setado via rendererConfig após mount: renderer.setPixelRatio(...)
  ...
/>
```

DPR é aplicado num `useEffect` que pega `(fgRef.current as any).renderer()?.setPixelRatio(Math.min(devicePixelRatio, 1.5))`.

## Riscos / mitigação

- **WebGL context loss em iPhones antigos (≤A11)**: adicionar listener `webglcontextlost` que mostra fallback amigável "tente em outro aparelho" — só nesse caso.
- **350 nós continuam pesados mesmo com filtro**: se em testes reais o FPS ficar <20, adicionar cap rígido `slice(0, 150)` apenas em mobile, ordenado por `heat desc` (já temos).
- **Drawer cobrindo o globo**: ao abrir filtros, automaticamente pausar auto-orbit (sem cancelar — só `orbitPausedRef.current = true` enquanto aberto).

## Fora de escopo

- Versão 2D simplificada do grafo no mobile (já existe `/equity-brain/grafo`).
- Refatorar `GraphFilterSidebar` em si — só envolver num `Sheet` quando em mobile.
- Mudar dados, scoring ou queries.
