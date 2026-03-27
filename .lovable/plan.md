
## Plano: Fazer o Cluster Azul Ficar Visível no Mapa

### Problema
Hoje o azul some porque os compradores estão sendo desenhados praticamente no mesmo ponto dos vendedores e ainda com prioridade visual menor. Na prática, o cluster amarelo cobre o azul.

### Solução
Ajustar o mapa para que **compradores e vendedores da mesma região não fiquem empilhados no mesmo centro**.

### Mudanças

#### `src/components/map/BusinessMap.tsx`

1. **Remover a estratégia de “esconder atrás”**
   - Tirar o `zIndexOffset: -1000` dos compradores
   - Não usar a camada azul como subordinada à amarela

2. **Criar um deslocamento fixo por tipo**
   - Aplicar um pequeno offset consistente nas coordenadas:
     - vendedores ficam no ponto base
     - compradores ficam levemente deslocados na diagonal
   - Isso vale tanto para marcador individual quanto para cluster, então os dois grupos aparecem lado a lado quando estiverem na mesma cidade/região

3. **Manter um jitter menor só para desempilhar itens do mesmo tipo**
   - Continuar espalhando levemente markers da mesma categoria
   - Mas separar primeiro por tipo, para o azul nunca nascer exatamente em cima do amarelo

4. **Preservar o visual atual**
   - Continuar com clusters separados:
     - amarelo = vendedores
     - azul = compradores
   - Manter popup sigiloso dos compradores e CTA de contato

### Resultado esperado
Em cidades com vendedores e compradores ao mesmo tempo:
- aparecem **dois agrupamentos visíveis**
- o azul não fica escondido
- o mapa continua indicando a mesma região, mas com leitura visual clara

### Seção técnica
| Arquivo | Ação |
|---|---|
| `BusinessMap.tsx` | Remover `zIndexOffset` negativo, aplicar offset geográfico fixo por tipo, manter jitter apenas para desempilhar itens do mesmo tipo |

**Estratégia técnica**
```text
coords base da cidade
→ seller: base + jitter pequeno
→ buyer: base + offset fixo + jitter pequeno
```

Assim o problema é resolvido na origem (coordenada), e não apenas na ordem de renderização.
