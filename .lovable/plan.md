# Espalhar mais os nós no Jarvis 3D

Os nós estão amontoados porque as forças de repulsão e distância de link são moderadas. Vou aumentar significativamente o "breathing room" do grafo, ajustando física, colisão e câmera.

## Mudanças em `src/components/equity-brain/jarvis/JarvisGraph3D.tsx`

### 1. Força de repulsão (charge) — muito mais forte
- `charge.strength`: `-650` → `-2200`
- `charge.distanceMin`: `40` → `80`
- `charge.distanceMax`: `2000` → `4500`

### 2. Distância dos links — bem maior
- `link.distance`: `140 + (1-w)*200` → `320 + (1-w)*420` (faixa ~320–740, antes ~140–340)
- `link.strength`: reduzir multiplicador para `0.25` (antes `0.45`) — links menos "puxam" os nós para perto

### 3. Colisão — bolha pessoal maior
- `forceCollide` raio: `visualRadius * 2.4` → `visualRadius * 4.5`
- Mantém `strength 0.9`, `iterations 2`

### 4. Spread extra para sellers (cluster mais denso)
- `seller-spread` strength: `-180` → `-450`
- `distanceMax`: `160` → `320`

### 5. Centering mais suave (deixa expandir)
- Adicionar `fg.d3Force("center")?.strength?.(0.03)` (default ~0.1) para o grafo não ser comprimido ao centro

### 6. Câmera inicial recuada
- `cameraPosition z`: `1100` → `2200` para acomodar o novo volume

### 7. Estabilização
- `d3VelocityDecay`: `0.35` → `0.28` (deixa nós "deslizarem" mais antes de parar)
- `cooldownTicks`: `140` → `220` (mais tempo para a expansão acontecer)
- `warmupTicks`: `20` → `40`

### 8. Freeze safety timeout
- `12000ms` → `16000ms` (acompanha o cooldown maior)

## Resultado esperado

Nós com ~3× mais espaço entre si, clusters visivelmente separados, câmera enquadrando o volume completo já no primeiro frame. Sem mudanças visuais nas esferas, anéis, partículas ou filtros.
