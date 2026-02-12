

## Geocodificacao Dinamica para Todas as Cidades do Brasil

### Problema
O sistema atual usa um dicionario estatico com ~50 cidades. Qualquer cidade fora dessa lista nao aparece no mapa (como aconteceu com Gravatai).

### Solucao: API de Geocodificacao Dinamica com Cache

Em vez de tentar listar 5.570 municipios manualmente, vamos usar a API gratuita do **Nominatim (OpenStreetMap)** para resolver coordenadas automaticamente a partir do nome da cidade e estado. Com cache local, a busca so acontece uma vez por cidade.

### Arquivos a Modificar

**1. `src/lib/brazilCoordinates.ts`** - Refatorar completamente:
- Manter `stateCapitals` como fallback offline
- Criar funcao `getCoordinatesAsync(city, state)` que:
  1. Verifica cache em memoria (Map)
  2. Se nao encontrar, consulta a API Nominatim: `https://nominatim.openstreetmap.org/search?city=X&state=X&country=Brazil&format=json`
  3. Armazena resultado no cache
  4. Retorna coordenadas
- Manter a funcao sincrona `getCoordinates()` com o dicionario existente como fallback rapido

**2. `src/components/map/BusinessMap.tsx`** - Atualizar para usar geocodificacao async:
- Usar `useState` + `useEffect` para resolver coordenadas de forma assincrona
- Processar listings em lote, resolvendo cidades desconhecidas via API
- Mostrar marcadores progressivamente conforme coordenadas sao resolvidas
- Manter fallback para capital do estado enquanto coordenadas exatas nao carregam

**3. `src/lib/brazilCoordinates.ts`** - Adicionar cache persistente:
- Usar `localStorage` para persistir coordenadas ja resolvidas entre sessoes
- Evitar chamadas repetidas a API para mesmas cidades

### Detalhes Tecnicos

```text
Fluxo de resolucao:
  Listing(city, state)
       |
       v
  Cache memoria? --sim--> Retorna coords
       |
      nao
       v
  Cache localStorage? --sim--> Retorna coords + salva memoria
       |
      nao
       v
  Dicionario estatico? --sim--> Retorna coords + salva caches
       |
      nao
       v
  API Nominatim --sucesso--> Salva em ambos caches + retorna
       |
     falha
       v
  Fallback: capital do estado
```

- API Nominatim e gratuita, sem necessidade de chave
- Rate limit respeitado com delays entre requests (1 req/segundo)
- User-Agent customizado conforme politica do Nominatim
- Cache em localStorage evita chamadas repetidas

### Resultado Esperado
- Qualquer cidade do Brasil aparecera automaticamente no mapa
- Novas listagens aparecem sem necessidade de atualizar codigo
- Performance mantida gracas ao cache em duas camadas
- Fallback robusto para capital do estado se API falhar

