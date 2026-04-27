## 🎯 Objetivo

Transformar o grafo de "bola compactada laranja" em uma **rede neural viva**, leve, com hierarquia visual clara — onde só passar o mouse acende as conexões e revela a inteligência por trás.

Diagnóstico atual (com base no print enviado):
1. **Tudo amontoado** — mesmo com `charge -450`, ao filtrar só sellers o `forceCollide` + `linkDistance` não escalam o suficiente para a quantidade de nodes; tudo vira um aglomerado central.
2. **Linhas sempre visíveis** — todas as 200-400 edges renderizam o tempo todo (com particles em links ≥0.7), pesando o canvas e poluindo a tela.
3. **Bolinhas iguais** — `getBaseRadius` usa só `strategic_score` (4 a 16px). Score concentrado entre 30–60 = quase tudo do mesmo tamanho. Não diferencia hubs (muitas conexões) de nodes isolados.

---

## 🔧 Plano de execução

Tudo concentrado em **`src/components/equity-brain/graph/StrategicGraph.tsx`** (sem novos arquivos), com pequenos ajustes em `GraphLegend.tsx` para refletir a nova lógica.

### 1. Tamanho dos nodes — score + grau de conexão (importância real)

Substituir `getBaseRadius` por um cálculo composto:

```
raio = 3 + (score_normalizado * 8) + log(1 + degree) * 4 + bonus_hot
```

- **Score (0–100)** continua influenciando, mas com peso menor
- **Degree (nº de conexões fortes ≥ 0.5)** entra como fator logarítmico → hubs ficam visivelmente maiores (até ~2.5x um node periférico)
- **Bônus +3px** para nodes "hot" (top conexões fortes) → realçam como neurônios principais
- Range final: ~5px (periférico) → ~22px (super-hub)

Computar `degreeMap` num `useMemo` derivado de `edges`, igual já é feito para `hotNodeIds`.

### 2. Espaçamento — explodir o aglomerado

Quando o usuário filtra para "só sellers" (1 tipo de node, 86 entidades), o grafo precisa **respirar**. Ajustes nas forças d3:

| Força | Antes | Depois | Por quê |
|---|---|---|---|
| `charge.strength` | -450 | **-900** (escala com qtd nodes) | Repulsão muito mais forte |
| `charge.distanceMax` | 700 | **1400** | Repulsão alcança nodes distantes |
| `collide.radius` | r + 14 | **r * 2.2 + 18** | Hubs grandes empurram mais |
| `link.distance` | 80 + (1-w)*120 | **140 + (1-w)*240** | Links fracos = nodes longe; fortes = perto (cria clusters orgânicos) |
| `link.strength` | 0.5 | **(w * 0.8)** | Só links fortes "puxam"; fracos quase não influenciam |
| `cooldownTicks` | 80 | **150** | Mais tempo pra estabilizar com forças maiores |

E adicionar uma força radial leve: `forceRadial` opcional centralizando o grafo, evitando que ele "voe" para fora do viewport.

### 3. Links — visíveis só sob demanda (resolve trava + poluição)

Esta é a mudança que mais transforma o visual em "rede neural viva":

- **Estado idle (sem hover)**: renderizar **só os top ~80 links mais fortes** (peso ≥ 0.65), com opacidade muito baixa (0.10–0.18) e finíssimos (`linkWidth = 0.6`). Resultado: traços-fantasma sugerindo a malha sem sobrecarregar.
- **Sem hover**: `linkDirectionalParticles = 0` para todos (remove o "pulso animado" constante que pesa).
- **Hover num node**: aí sim, **acendem 100%** os links daquele node (e só deles) — opacidade 0.95, espessura proporcional ao peso, **e particles fluindo nos links ≥ 0.7** (visual de "sinapse disparando"). Demais links ficam invisíveis (alpha 0.02).
- **Node selecionado**: links permanecem acesos mesmo sem hover (ancora a análise).

Implementação: filtrar `edges` exibidas em dois conjuntos via `useMemo`:
- `idleEdges` = top 80 por peso (sempre renderizados, fracos/finos)
- Hover/seleção sobrepõe via `linkColor`/`linkWidth` (já existe a base, só calibrar)

E reduzir `linkWidth` base de `weight*3.5+0.3` para `weight*1.4+0.2` (linhas mais delicadas, estilo neural).

### 4. Visual "rede neural" — refinamento estético

- **Background**: somar uma camada extra de gradiente radial muito sutil + **partículas de fundo** estáticas (pontos minúsculos brancos com 3% alpha, ~150 deles) desenhados no canvas via `nodeCanvasObject` num pre-paint. Sensação de "espaço/poeira cósmica".
- **Glow dos hot nodes**: aumentar o range do pulse (de ±4px para ±7px) e adicionar uma segunda camada de glow externa muito difusa (raio 2.5x, alpha 0.15) → efeito "neurônio respirando".
- **Halo nos hovered**: trocar o stroke branco por um glow radial cyan/emerald do tipo do node → mais orgânico.
- **Edges**: aplicar `ctx.shadowBlur` leve (2–3px) na cor do link quando aceso → traços "luminosos" estilo sinapse.
- **Cor de fundo do canvas**: deixar `#08090b` (mais escuro que zinc-950) pra dar mais contraste ao glow.

### 5. Performance — não travar mesmo com 350 nodes

- Cap `idleEdges` em **80** (já mencionado) — evita pintar 300+ linhas todo frame.
- `linkDirectionalParticles` só ativo no hover/selected → elimina o RAF pesado das particles em idle.
- `nodeCanvasObject`: pular o cálculo de `createRadialGradient` para nodes dimmed (alpha < 0.2) — só pinta o círculo simples.
- Manter `cooldownTicks=150` e `onEngineStop` fixando posições (já existe) → zero recálculo após estabilizar.
- Pulse RAF: rodar a 30fps em vez de 60fps (suficiente para o efeito visual e metade do custo).

### 6. Legend — refletir a nova linguagem

Atualizar `GraphLegend.tsx` com uma linha extra:
- "Tamanho = Score estratégico + nº de conexões fortes"
- "Glow pulsante = Hub de oportunidade"
- "Linhas brilham ao passar o mouse"

---

## 📋 Arquivos modificados

- **`src/components/equity-brain/graph/StrategicGraph.tsx`** — todas as mudanças de física, render e interação acima
- **`src/components/equity-brain/graph/GraphLegend.tsx`** — atualizar textos da legenda

Sem alterações de banco, sem novas dependências (tudo já roda em `react-force-graph-2d` + `d3-force`).

---

## ✅ Resultado esperado

- Tela inicial: nuvem espaçada de pontos brilhantes em fundo escuro, com poucos traços-fantasma sugerindo a malha — visual de **rede neural em repouso**.
- Hover num seller: o node cresce, glow acende, e **só as conexões dele se iluminam** com particles fluindo — sensação de **"sinapse disparando"**.
- Hubs (Unifique, top buyers) aparecem visivelmente maiores e pulsando — você bate o olho e identifica os pontos de poder.
- Filtrar "só sellers" → grafo se redistribui espaçado, dá pra clicar em qualquer um.
- Performance fluida mesmo com 300+ edges no dataset.