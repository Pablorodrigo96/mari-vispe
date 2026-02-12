

## Corrigir Filtro de Preço Máximo no Mapa

### Problema Identificado
O listing de Gravataí (categoria Telecomunicações) tem `asking_price` de R$ 30.000.000, mas o filtro padrão do mapa limita o preço máximo a R$ 10.000.000. O listing é removido silenciosamente pelo filtro antes de chegar ao componente do mapa.

### Solução
Aumentar o range máximo de preço do filtro para acomodar todos os listings.

### Arquivo a modificar

**`src/components/map/MapFilterSidebar.tsx`** (linha 29):
- Alterar `priceRange: [0, 10000000]` para `priceRange: [0, 50000000]`
- Atualizar o slider máximo para R$ 50.000.000
- Isso garante que listings de alto valor (como Telecomunicações) apareçam por padrão

### Alternativa mais robusta
Em vez de um valor fixo, calcular o máximo dinamicamente com base no maior `asking_price` dos listings carregados. Isso evita o problema no futuro se alguém cadastrar algo acima de R$ 50M.

**`src/pages/MapView.tsx`**:
- Calcular `maxPrice` a partir dos listings carregados
- Passar como prop para o `MapFilterSidebar`
- Usar como valor padrão e limite do slider

### Resultado Esperado
O listing de Gravataí (e qualquer outro de alto valor) aparecerá automaticamente no mapa sem precisar ajustar filtros manualmente.
