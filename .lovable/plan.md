Vou corrigir o travamento do Jarvis 3D atacando os gargalos que aparecem no código atual: recriação de milhares de objetos Three.js, logs/renders em loop, simulação D3 infinita, múltiplos requestAnimationFrame e camadas CSS/vídeo caras sobre WebGL.

## Plano

1. **Modo performance por padrão**
   - Manter a sensação de globo cheio, mas reduzir o custo inicial: menos física em tempo real e mais posicionamento determinístico/pinado para a nuvem de empresas.
   - Capar o pixel ratio também no desktop para evitar renderizar WebGL em resolução muito maior que o necessário.

2. **Parar re-renderizações desnecessárias do React**
   - Remover o `console.log` executado a cada render do `JarvisGraph3D`.
   - Trocar o contador de FPS que atualiza state todo segundo por uma atualização mais barata ou desacoplada.
   - Reduzir updates gerados pela germinação de links (`setInterval` adicionando 3 links a cada 70ms), que hoje força o React/ForceGraph a receber novo `graphData` dezenas de vezes.

3. **Simplificar os nós Three.js**
   - Substituir nós decorativos da base fria por objetos muito leves, sem glow/anel/label e com geometria/material compartilhados.
   - Reduzir segmentos de esferas/anéis para os nós vivos.
   - Evitar recriar materiais caros por link/nó quando não há foco/hover.

4. **Reduzir animações paralelas**
   - Desligar ou limitar por padrão `useGhostSynapses`, `useSolarFlares` e partículas direcionais em massa.
   - Manter apenas o orbit da câmera e alguns links vivos para preservar a estética.

5. **Remover camadas caras sobre conteúdo animado**
   - Trocar `backdrop-blur` dos HUDs sobre o canvas por fundos sólidos/translúcidos e text-shadow quando necessário.
   - Desativar filtro `blur()` do vídeo de fundo no Jarvis 3D, porque blur sobre WebGL/vídeo animado costuma derrubar FPS.

6. **Validar depois da implementação**
   - Abrir `/equity-brain/admin/jarvis` e conferir: FPS, quantidade de nós, fluidez do orbit e ausência de warnings/loops no console.
   - Se ainda ficar pesado, adicionar um controle “Qualidade: Performance / Visual / Máxima” para permitir alternar densidade e efeitos sem travar.