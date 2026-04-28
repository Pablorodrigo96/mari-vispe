## Background de vídeo no Jarvis 3D

O vídeo enviado (8s, 1280x720, ~4.3MB com áudio) será otimizado e usado como background imersivo do `JarvisGraph3D`, preenchendo 100% da área e ficando totalmente desacoplado da câmera 3D — o zoom só movimenta nós e empresas.

### O que será feito

**1. Otimizar o vídeo (sem perder qualidade visual, mas leve)**
- Re-encode com `ffmpeg`: H.264, CRF 24, preset `slow`, sem áudio, faststart habilitado.
- Manter resolução 1280x720 (alta o bastante para fullscreen, baixa o suficiente para não pesar).
- Resultado esperado: ~1.0–1.5 MB (queda de ~70%).
- Salvar em `public/videos/jarvis-bg.mp4`.
- Também gerar um poster `.jpg` do primeiro frame (`public/videos/jarvis-bg-poster.jpg`) para exibir antes do vídeo carregar.

**2. Inserir o vídeo como camada de fundo no `JarvisGraph3D.tsx`**
- Adicionar um `<video>` HTML como **primeira camada** dentro do container, com:
  - `autoPlay`, `loop`, `muted`, `playsInline`, `preload="auto"`
  - `poster` apontando para o JPG
  - Classes: `absolute inset-0 w-full h-full object-cover pointer-events-none z-0`
  - `style={{ filter: 'brightness(0.55) saturate(0.85)' }}` para não competir com os nós/cores do grafo
- Ajustar a nebulosa radial e o grid HUD existentes para `opacity` levemente menor (~30%) já que agora há vídeo por baixo — preserva a leitura dos nós.

**3. Tornar o canvas 3D transparente**
- `ForceGraph3D` passa a receber `backgroundColor="rgba(0,0,0,0)"` em vez de `#06070a`.
- Remover/ajustar o `style={{ background: "#06070a" }}` do container — o vídeo vira o fundo.
- Manter um fallback `bg-zinc-950` no container para o caso do vídeo falhar.

**4. Garantir que o zoom NÃO afeta o vídeo**
- O vídeo é uma `<div>`/`<video>` HTML em layer DOM separada do canvas WebGL.
- A câmera 3D (`fg.cameraPosition`, controles do mouse) age apenas sobre o `THREE.Scene`, ou seja, nós, links e partículas. O `<video>` em `position: absolute` permanece estático e ocupando 100% do viewport — exatamente o comportamento pedido.

**5. Performance**
- Vídeo decodificado em hardware pelo browser, ~1.5 MB carregado uma vez e em loop infinito → custo mínimo.
- Sem `backdropFilter` (já evitamos) e sem WebGL extra.

### Arquivos afetados
- `public/videos/jarvis-bg.mp4` (novo, otimizado)
- `public/videos/jarvis-bg-poster.jpg` (novo)
- `src/components/equity-brain/jarvis/JarvisGraph3D.tsx` (adiciona `<video>` de fundo, deixa canvas transparente, suaviza overlays)

### Resultado esperado
- Fundo cinematográfico em movimento ocupando 100% da tela do Jarvis 3D.
- Nós (sellers, buyers, platforms, teses) e conexões continuam navegáveis com partículas e glow.
- Zoom in/out e rotação da câmera só afetam o grafo — o vídeo de fundo permanece fixo e em loop.
- Carga adicional: ~1.5 MB (vídeo) — sem impacto perceptível em FPS.
