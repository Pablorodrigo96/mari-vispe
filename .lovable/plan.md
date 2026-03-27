

## Plano: Corrigir Sobreposição de Marcadores no Mapa

### Problema
O marcador azul do comprador está sobrepondo o cluster dourado dos vendedores quando estão na mesma região. Isso acontece porque ambos ocupam a mesma camada z-index e o jitter aleatório das coordenadas é pequeno (`±0.02`), fazendo os ícones se empilharem.

### Solução

#### `src/components/map/BusinessMap.tsx`

1. **Reduzir o tamanho do marcador individual do comprador** de 32px para 26px para diferenciá-lo visualmente dos clusters maiores
2. **Aumentar o jitter** dos compradores para `±0.05` (espalha mais os pontos na mesma cidade)
3. **Definir `zIndexOffset`** nos marcadores de compradores para ficar abaixo dos sellers (`zIndexOffset: -1000`), evitando que fiquem por cima dos clusters dourados
4. **Reduzir `maxClusterRadius`** do cluster de compradores para 40 (vs 60 dos sellers), fazendo com que compradores na mesma área se agrupem menos agressivamente e não se misturem visualmente com clusters de sellers

### Seção Técnica

| Mudança | Detalhe |
|---|---|
| `buyerIcon` | Reduzir de 32px para 26px (iconSize, iconAnchor, popupAnchor ajustados) |
| Jitter compradores | `Math.random() * 0.05` em vez de `0.02` |
| Marker options | Adicionar `zIndexOffset: -1000` nos markers de buyer |
| Buyer cluster | `maxClusterRadius: 40` para separar melhor dos seller clusters |

