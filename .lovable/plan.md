
## Nova Pagina: Mapa de Empresas

### Visao Geral

Criar uma nova pagina `/mapa` acessivel pelo Header, mostrando um mapa interativo do Brasil com marcadores nas localizacoes das empresas cadastradas. O mapa tera tema escuro, clustering de marcadores, e um painel de resumo na parte inferior.

### Componentes

**1. Nova rota e navegacao**

- Adicionar "Mapa" ao array `navigation` no `Header.tsx` (entre "Comprar Empresa" e "Vender Empresa")
- Criar rota `/mapa` no `App.tsx`

**2. Nova pagina `src/pages/MapView.tsx`**

Pagina principal que:
- Busca listings ativos do banco de dados (mesma query do Marketplace)
- Converte cidade/estado em coordenadas usando um dicionario estatico de capitais e principais cidades brasileiras
- Renderiza o mapa com Header e rodape

**3. Novo componente `src/components/map/BusinessMap.tsx`**

Mapa interativo usando **Leaflet** + **react-leaflet** + **react-leaflet-cluster**:
- Tema escuro usando tiles do CartoDB dark_all (gratuito, sem API key)
- Centro inicial no Brasil (-14.235, -51.925), zoom 4
- Marcadores clusterizados com contagem (estilo circular como nas imagens de referencia)
- Popup ao clicar no marcador mostrando: titulo, categoria, cidade/estado, preco, link para detalhes
- Rodape fixo no mapa com: total de oportunidades, valor total, contagem de estados

**4. Arquivo auxiliar `src/lib/brazilCoordinates.ts`**

Dicionario estatico com coordenadas lat/lng das capitais e principais cidades brasileiras (SP, RJ, BH, Curitiba, etc.), usado para posicionar marcadores no mapa a partir dos campos `city` e `state` da tabela listings.

### Dependencias Novas

- `leaflet` - biblioteca de mapas (gratuita, sem API key)
- `react-leaflet` - wrapper React para Leaflet
- `react-leaflet-cluster` - clustering de marcadores

### Detalhes Tecnicos

**Geocodificacao**: Como os listings tem apenas `city` e `state` (sem lat/lng), sera usado um dicionario estatico com ~50 cidades brasileiras. Listings sem cidade encontrada no dicionario usarao as coordenadas da capital do estado. Listings sem estado serao omitidos do mapa.

**Estilo do mapa**: Tiles escuros do CartoDB (`https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png`) - gratuito, sem registro necessario.

**Clusters**: Circulos coloridos com contagem, semelhantes as imagens de referencia. Ao dar zoom, os clusters se dividem em marcadores individuais.

**Popup do marcador**: Card compacto com titulo, categoria, localizacao, preco e botao "Ver Detalhes" que leva ao `/anuncio/:id`.

**Painel inferior**: Barra fixa na parte de baixo do mapa mostrando:
- Oportunidades: total de listings no mapa
- Valor: soma de asking_price formatada
- Estados: quantidade de estados distintos

### Estrutura de Arquivos

```text
src/
  pages/
    MapView.tsx              (nova pagina)
  components/
    map/
      BusinessMap.tsx         (componente do mapa)
  lib/
    brazilCoordinates.ts     (dicionario de coordenadas)
```

### Fluxo do Usuario

1. Usuario clica em "Mapa" no menu de navegacao
2. Pagina carrega e busca listings ativos do banco
3. Mapa renderiza centrado no Brasil com marcadores clusterizados
4. Usuario pode dar zoom para ver marcadores individuais
5. Ao clicar em um marcador, popup mostra informacoes da empresa
6. Botao "Ver Detalhes" no popup leva para a pagina do anuncio
