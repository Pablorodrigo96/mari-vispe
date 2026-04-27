Vou atacar os dois pontos na origem: o movimento contínuo do canvas e o bug de comparação de IDs que faz o painel lateral mostrar 0 conexões.

## Diagnóstico encontrado

1. **A vibração não vem mais de um “pulso físico” de 10 segundos**, mas ainda existe movimento visual contínuo em duas partes:
   - `pulse` com `requestAnimationFrame` atualizando a cada ~33ms.
   - partículas direcionais nas conexões (`linkDirectionalParticles`) durante foco/hover.

2. **O painel lateral provavelmente mostra “0 conexões” por incompatibilidade de formato de edge**:
   - Depois que o `react-force-graph-2d` processa o grafo, `edge.source` e `edge.target` podem deixar de ser strings e virar objetos de node.
   - O `NodeDetailPanel` compara hoje `e.source === node.id || e.target === node.id`, então quando `source/target` viram objetos, a comparação falha e aparece “Nenhuma conexão neste node ainda.”

3. **A simulação ainda pode continuar reagindo após renderização/filtro/seleção**:
   - O código libera `fx/fy` e chama `d3ReheatSimulation()` quando o dataset muda.
   - O congelamento acontece no `onEngineStop`, mas se o grafo é reaquecido ou se o engine demora a parar, os nós seguem se mexendo.

## O que será implementado

1. **Modo totalmente estático para análise**
   - Remover o `requestAnimationFrame` que atualiza `pulse` continuamente.
   - Substituir brilhos “respirando” por halos estáticos, sem animação frame a frame.
   - Desativar partículas móveis nas conexões por padrão; em foco/hover, usar linhas luminosas estáticas em vez de partículas correndo.

2. **Congelamento agressivo e imediato dos nós**
   - Manter a simulação apenas para calcular o layout inicial.
   - Após alguns ticks/engine stop, fixar todos os nós com `fx/fy`.
   - Chamar `pauseAnimation()`/interromper o engine quando possível para impedir drift residual.
   - Ao selecionar ou focar um nó, reforçar novamente o freeze antes de centralizar a câmera.

3. **Corrigir o painel lateral de conexões**
   - Criar helper seguro para extrair ID de endpoint:
     - se `source/target` for string, usa string;
     - se for objeto, usa `.id`.
   - Usar esse helper em `NodeDetailPanel` para:
     - calcular `directEdges`;
     - encontrar vizinhos;
     - trocar seleção ao clicar numa conexão.
   - Isso deve fazer o painel exibir corretamente conexões, estratégias, top 5 e explicações.

4. **Foco limpo no grafo ao selecionar um nó**
   - Manter o modo foco, mas garantir que apenas as top conexões do nó selecionado sejam visíveis.
   - Ocultar completamente edges não relacionadas, não apenas reduzir opacidade.
   - Diminuir nós sem relação direta para leitura mais limpa.

5. **Design tecnológico sem movimento que atrapalha**
   - Preservar o visual “Jarvis/IA” com fundo HUD, grid, halos, cores neon e anéis.
   - Remover qualquer efeito que pareça “estrelas se mexendo” ou “água viva”.
   - Usar destaque visual estático no hover/seleção: glow, borda, linha neon e label.

## Arquivos que serão alterados

- `src/components/equity-brain/graph/StrategicGraph.tsx`
  - Remover animação contínua e partículas móveis.
  - Forçar freeze/pause do motor físico.
  - Melhorar visibilidade/ocultação das conexões em foco.

- `src/components/equity-brain/graph/NodeDetailPanel.tsx`
  - Corrigir comparação de conexões quando `source/target` são objetos.
  - Garantir que a lateral mostre as conexões reais do nó selecionado.

- `src/components/equity-brain/graph/GraphLegend.tsx`
  - Ajustar textos para explicar que o grafo é estático e que conexões aparecem por seleção/hover.

## Resultado esperado

- As bolinhas ficam paradas, sem vibração contínua.
- As conexões não ficam animando como estrelas.
- Clicar em um nó fica mais fácil e previsível.
- Ao selecionar um nó, o grafo mostra só as conexões relevantes dele.
- A lateral passa a listar as conexões, estratégias e top matches corretamente.