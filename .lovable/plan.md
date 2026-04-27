Vou corrigir o comportamento do grafo para priorizar uso analítico: nós parados, clique fácil e conexões filtradas automaticamente ao selecionar um nó.

## O que será implementado

1. **Parar o movimento frenético de vez**
   - Remover o pulso físico de 10 segundos que hoje solta os nós e reaquece a simulação.
   - Trocar esse efeito por um “pulso visual” apenas: brilho, partículas e HUD continuam dando sensação de IA viva, mas sem mover as bolinhas.
   - Após o primeiro layout estabilizar, todos os nós serão fixados com `fx/fy` e a simulação será parada explicitamente.

2. **Modo foco automático ao selecionar um nó**
   - Ao clicar em qualquer nó, o grafo entrará em modo de foco.
   - Todas as conexões que não pertencem ao nó selecionado ficarão ocultas.
   - Apenas os links do nó selecionado serão exibidos, com destaque nos mais fortes.
   - Os nós sem relação direta serão escurecidos para reduzir poluição visual.

3. **Mostrar só os links mais relevantes**
   - Para evitar travamento e poluição visual, o modo foco exibirá apenas as conexões mais fortes do nó selecionado.
   - Critério proposto: top 12 conexões por peso, priorizando `weight >= 0.55`; se houver poucas, mostra as melhores disponíveis.
   - Links fortes terão brilho/partículas discretas; links mais fracos ficam ocultos nesse modo.

4. **Melhorar usabilidade de clique**
   - Aumentar ainda mais a área invisível de clique dos nós.
   - Ao selecionar, centralizar o nó sem aplicar zoom agressivo.
   - Adicionar um pequeno badge/controle no topo: “Modo foco ativo: X conexões fortes”, com botão para limpar foco.

5. **Manter visual tecnológico sem sacrificar performance**
   - Preservar o visual Jarvis/IA: fundo HUD, glow, anéis e partículas.
   - Remover efeitos baseados em movimento físico contínuo.
   - Renderizar partículas somente em conexões fortes do nó selecionado ou hovered.

## Arquivos que serão alterados

- `src/components/equity-brain/graph/StrategicGraph.tsx`
  - Ajustar simulação, congelamento, seleção, renderização de links e estado de foco.

- `src/components/equity-brain/graph/GraphLegend.tsx`
  - Atualizar a legenda para explicar que o grafo fica congelado e que as conexões aparecem por foco/hover.

## Resultado esperado

- O grafo deixa de se mover freneticamente.
- Você consegue clicar nos nós com precisão.
- Ao selecionar uma empresa/comprador/tese, o gráfico limpa automaticamente o excesso e mostra apenas as relações mais fortes daquele nó.
- A experiência continua visualmente impactante, mas fica realmente utilizável para análise.