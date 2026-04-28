## Avaliação visual atual

Após inspecionar o Jarvis 3D em produção, o design **não está bonito nem impressionante** — está visualmente quebrado por 4 problemas críticos:

1. **Vídeo de fundo "vaza"** — o lado direito da tela mostra relógios e instrumentos de cockpit do vídeo cru, sem nenhum nó por cima. Em vez de fundo discreto, virou o protagonista.
2. **Grafo amontoado e descentrado** — 245 nós e **5.563 conexões** sobrepostos formam uma "bola de pelo" verde no centro-esquerda. Não dá para ler nada.
3. **Conflito de cores** — verde neon das arestas + laranja/cinza do vídeo competem. Resultado: poluição visual.
4. **Sem hierarquia visual** — tudo brilha ao mesmo tempo, então nada se destaca. Falta o "wow" de um cockpit Jarvis real.

## O que será feito

### 1. Domar o vídeo de fundo (deixar de competir)
- Adicionar **overlay escuro com vinheta radial** por cima do vídeo: centro mais limpo (~40% escuro), bordas quase pretas (~85% escuro). Faz o vídeo virar atmosfera, não conteúdo.
- Aumentar `filter` do vídeo para `brightness(0.3) saturate(0.6) blur(1px)` — vira textura, não imagem nítida.
- Aplicar `mix-blend-mode: luminosity` no vídeo para ele assumir a paleta verde/cyan do grafo (em vez de laranja/cinza próprio).

### 2. Densificar menos: reduzir o caos do grafo
- **Subir o `minWeight` default** de `0.15` para `0.35` — corta arestas fracas que hoje formam a "teia caótica". Vai cair de ~5.500 para ~1.500 conexões, sem perder o que importa.
- Aumentar opacidade base das arestas fracas ainda mais baixa (de `0.05` para `0.025`) e fortalecer as fortes (`0.22 → 0.45`). Só o que é estratégico brilha.
- Reduzir `linkOpacity` global de `0.6` para `0.35`.

### 3. Centralizar o grafo e enquadrar a câmera
- Ajustar `centerForce.strength` de `0.03` para `0.08` — puxa o grafo de volta ao centro sem amassar.
- Após `cooldownTicks`, chamar `fg.zoomToFit(800, 80)` automaticamente para enquadrar tudo dentro do viewport.
- Recuar câmera inicial de `z: 2200` para `z: 2800` para caber o grafo expandido.

### 4. Acabamento cinematográfico (o "wow")
- Adicionar **scanline horizontal sutil** (CSS gradient repeating) com `opacity: 0.04` — dá textura de monitor de cockpit.
- HUD topo-direito: redesenhar com **bordas em L** (canto superior + inferior) ao estilo HUD militar/Iron Man, em vez de retângulo simples.
- Adicionar 4 **marcadores de canto** (corner brackets em verde-esmeralda, ~24px) nos 4 cantos do canvas — referência visual Jarvis clássica.
- HUD inferior central: barra fina com timestamp ao vivo + contador "NODES / EDGES / SIGNAL" em fonte mono, estilo telemetria.
- Aumentar levemente o glow dos nós quentes (`hot === true`): `opacity 0.05+heat*0.18 → 0.08+heat*0.28`.

### 5. Legibilidade dos labels
- Labels hoje têm fundo `rgba(9,9,11,0.6)` — pouco contraste sobre vídeo. Aumentar para `rgba(0,0,0,0.85)` e adicionar borda fina verde (`borderColor`).

## Arquivos afetados

- `src/components/equity-brain/jarvis/JarvisGraph3D.tsx` — overlay vinheta, scanlines, corner brackets, HUD redesenhada, ajustes de força/câmera/opacidades, defaults de filtro.

## Resultado esperado

- Fundo cinematográfico mas **discreto** (atmosfera, não conteúdo).
- Grafo **centralizado, mais limpo** (~1.500 conexões em vez de 5.500), com hierarquia clara: nós quentes brilham, arestas fortes se destacam.
- Moldura HUD ao estilo Jarvis/Iron Man (corner brackets, scanlines, telemetria mono).
- Sensação geral: "cockpit estratégico de bilhões em deals", não "explosão de espaguete verde".
