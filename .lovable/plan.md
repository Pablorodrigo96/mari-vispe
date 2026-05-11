Plano para deixar o Jarvis 3D fluido sem mudar a aparência:

1. Reduzir o custo de renderização dos 2K pontos frios
- Trocar os 2.000 `Mesh` individuais da nuvem fria por um único `InstancedMesh`/objeto agrupado equivalente.
- Manter a cor amarela/Volt, tamanho e distribuição visual atuais.
- Remover esses pontos da simulação de força quando possível, para que sejam apenas cenário renderizado e não participem do motor d3.

2. Limitar o trabalho contínuo por frame
- Manter a câmera orbitando, mas evitar chamadas pesadas de atualização quando a cena estiver estável.
- Reduzir chamadas desnecessárias de `refresh()` e reconfiguração de força.
- Congelar a simulação mais cedo e de forma mais efetiva após a montagem do globo.

3. Cortar custo das conexões sem alterar o “look”
- Manter os links visíveis, mas reduzir partículas animadas permanentes em idle para um subconjunto dos links principais.
- Preservar destaque completo quando houver hover/seleção de nó.
- Evitar criação de materiais novos por link a cada render, principalmente nos links dourados.

4. Otimizar criação de geometrias/materiais
- Reutilizar geometrias e materiais para nós comuns, anéis e halos sempre que possível.
- Evitar `new SphereGeometry`, `new RingGeometry` e `new MeshBasicMaterial` repetidos para centenas/milhares de nós.

5. Validar desempenho no preview
- Medir FPS antes/depois pelo HUD e pelo profiler.
- Confirmar que a aparência permanece igual: pontos amarelos visíveis, raios/conexões presentes e globo com o mesmo visual geral.