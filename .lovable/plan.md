## Objetivo

Corrigir o problema principal do Grafo: as bolinhas não podem ficar em movimento contínuo porque isso inviabiliza análise, hover e clique. O grafo deve ficar praticamente parado para uso, com movimento controlado e sutil apenas a cada 10 segundos, mantendo uma estética mais tecnológica, tipo cérebro de IA / Jarvis.

## Plano de implementação

### 1. Parar o movimento frenético

Ajustar `src/components/equity-brain/graph/StrategicGraph.tsx` para que a simulação física rode apenas para organizar o layout inicial e depois congele as posições dos nodes.

- Reduzir o tempo de simulação ativa.
- Fixar `fx` e `fy` assim que o layout estabilizar.
- Remover qualquer reaquecimento contínuo que possa estar sendo disparado por mudanças de referência em `nodes`/`edges`.
- Garantir que hover, seleção e pulse visual não chamem `d3ReheatSimulation()` nem soltem os nodes.

### 2. Movimento controlado a cada 10 segundos

Adicionar um ciclo discreto:

- A cada 10 segundos, liberar uma micro-reorganização por poucos ticks.
- O movimento será leve, curto e automático.
- Ao terminar, o grafo volta a ficar congelado.
- Se o usuário estiver com mouse sobre um node ou com um node selecionado, a reorganização será pausada para não atrapalhar o clique/análise.

Comportamento esperado:

```text
0s: layout estabiliza e congela
10s: pulso leve de reorganização por ~0.8s
11s: congela novamente
20s: novo pulso leve, se não houver interação
```

### 3. Melhorar a clicabilidade

- Aumentar a área invisível de clique/hover dos nodes sem aumentar visualmente todas as bolinhas.
- Manter nodes selecionados fixos no centro quando clicados.
- Evitar zoom/recenter agressivo caso isso atrapalhe a navegação.
- Garantir que nodes pequenos continuem fáceis de selecionar.

### 4. Deixar sellers e clusters mais afastados

Recalibrar as forças para análise visual:

- Mais `forceCollide` para evitar sobreposição.
- Distâncias de links maiores, principalmente em conexões fracas.
- Repulsão forte no layout inicial, mas sem manter velocidade residual depois.
- Separação extra quando o filtro exibe muitos sellers, evitando o conglomerado central.

### 5. Visual “cérebro IA / Jarvis” sem movimentar os nodes

Trocar movimento físico por movimento visual de baixo custo:

- Fundo mais tecnológico com HUD/grid radial sutil.
- Anéis concêntricos translúcidos e linhas finas estilo interface Jarvis.
- Glow cyan/emerald nos hubs.
- Micro-pulse apenas no brilho dos nodes, não na posição deles.
- Partículas/sinapses somente em hover ou node selecionado.
- Links idle quase invisíveis; conexões fortes aparecem ao passar o mouse.

### 6. Indicador de estado

Adicionar um pequeno status no topo direito ou próximo ao badge atual:

- “Rede estabilizada” quando congelado.
- “Recalculando malha…” durante o pulso de 10 segundos.

Isso deixa claro que o grafo está vivo, mas sob controle.

## Arquivos a alterar

- `src/components/equity-brain/graph/StrategicGraph.tsx`
  - controle de simulação/congelamento
  - pulso a cada 10 segundos
  - ajuste das forças
  - melhorias de hover/click
  - estética neural/Jarvis

- `src/components/equity-brain/graph/GraphLegend.tsx`
  - atualizar textos para explicar: grafo estabilizado, conexões sob hover, tamanho por score/conexões

## Resultado esperado

- As bolinhas param de se mexer freneticamente.
- O usuário consegue clicar e analisar targets sem dificuldade.
- O grafo ainda parece vivo, mas por brilho, sinapses e pequenos pulsos controlados.
- A cada 10 segundos ocorre apenas uma reorganização leve e curta.
- Sellers e empresas ficam mais afastados e legíveis.
- O visual fica mais tecnológico, próximo de uma interface IA/Jarvis, sem travar o gráfico.