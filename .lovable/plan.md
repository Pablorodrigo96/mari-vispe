

## Implementar Clustering de Marcadores no Mapa

### Problema
Com muitos marcadores no mapa, a visualizacao fica pesada e confusa quando o zoom esta afastado. O usuario quer que marcadores proximos sejam agrupados em clusters mostrando a contagem de empresas, e que ao dar zoom os clusters se expandam revelando os marcadores individuais.

### Solucao
Usar o plugin **Leaflet.markercluster** que e o padrao da industria para clustering com Leaflet vanilla. Ele agrupa marcadores automaticamente com base no nivel de zoom e mostra circulos com a contagem de empresas em cada regiao.

### Detalhes Tecnicos

**1. Adicionar dependencia**
- Instalar `leaflet.markercluster` (pacote npm) e seus tipos `@types/leaflet.markercluster`

**2. Arquivo: `src/components/map/BusinessMap.tsx`**
- Importar o CSS do markercluster e o plugin
- Substituir a adicao individual de marcadores (`marker.addTo(map)`) por um `L.markerClusterGroup()`
- Adicionar todos os marcadores ao cluster group, e adicionar o grupo ao mapa
- Estilizar os clusters com cores alinhadas ao tema escuro/dourado da plataforma (fundo navy escuro, texto dourado, borda dourada)
- Ao limpar marcadores, remover o cluster group inteiro em vez de iterar markers individuais

**3. Arquivo: `src/index.css`**
- Adicionar estilos customizados para os clusters (`.marker-cluster-small`, `.marker-cluster-medium`, `.marker-cluster-large`) com o visual corporativo da plataforma:
  - Clusters pequenos (ate 10): fundo navy com borda dourada sutil
  - Clusters medios (10-100): fundo dourado com texto escuro
  - Clusters grandes (100+): fundo dourado intenso, maior

### Comportamento Esperado
- Zoom afastado: marcadores proximos se agrupam em circulos com numero de empresas
- Zoom aproximado: clusters se dividem progressivamente ate mostrar marcadores individuais
- Clicar em um cluster: zoom automatico para expandir aquele grupo
- Animacao suave de spiderfy quando marcadores estao muito proximos no zoom maximo

