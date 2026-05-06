## Problema

O backend ANATEL já funciona (testado com VIVO/02.558.157, retorna 500 cidades com share, rank, total). O mapa não fica 100% porque o `AnatelProviderMap` resolve cidade→coordenadas via Nominatim (rate-limit 1 req/s, sequencial). Para um provedor com 200–500 cidades:

- Demora 5–8 minutos.
- Cidades pequenas que falham na API caem no centroide da UF → vários pontos empilhados no meio do estado.
- Linhas hub→spoke ficam desalinhadas porque a "sede" geocodificada via Nominatim pode mapear para outra cidade homônima.

## Solução: usar o `codigo_ibge_cidade` (IBGE 7 dígitos)

A tabela `base_anatel` já tem a coluna `codigo_ibge_cidade`. Esse código identifica unicamente os 5.570 municípios. Vamos cruzar com um dataset oficial IBGE de coordenadas e dispensar Nominatim.

### Passos

1. **Edge function `anatel-query` (`stats / company_footprint`)**
   - Incluir `codigo_ibge_cidade` no `SELECT` (group by + agg `MIN(codigo_ibge_cidade)` para evitar duplicação).
   - Mesmo para `search_companies`: opcional, sem mudança.

2. **Novo módulo `src/lib/ibgeCoordinates.ts`**
   - Função `getCoordsByIbge(code: string): {lat,lng} | null`.
   - Fonte de dados: arquivo JSON estático embutido (`src/data/ibgeMunicipios.json`) — ~5.570 entradas `{ id, lat, lng }` (~150KB gzipped) gerado a partir do dataset público `kelvins/Municipios-Brasileiros` (ou IBGE Localidades + centroides). Carregamos por `import()` dinâmico para não inflar o bundle inicial.
   - Cache em memória após primeiro uso.

3. **`useAnatelProvider.ts`**
   - Tipar `AnatelFootprintRow` com `codigo_ibge_cidade?: string`.
   - Mapear o campo no `queryFn`.

4. **`AnatelProviderMap.tsx` (refatorar resolução de coordenadas)**
   - Resolver coords nesta ordem (sem await sequencial):
     1. `getCoordsByIbge(row.codigo_ibge_cidade)` — instantâneo, cobre 100%.
     2. fallback `getCoordinates(cidade, uf)` síncrono (memory + dict estático).
     3. último fallback `stateCapitals[uf]` (com flag `_fallback=true` no popup).
   - **Eliminar** o loop com `getCoordinatesAsync` + Nominatim para esse mapa (continua disponível para outros usos do projeto).
   - Renderizar imediatamente ao receber `rows`.
   - Hub = cidade com maior `acessos_empresa` (mantém).
   - Linhas hub→spoke: já corretas; agora vão para coordenadas reais de cada município.
   - Marker para fallback (sem IBGE e sem dict): contorno tracejado e tooltip "localização aproximada (capital UF)".

5. **`MapaPage.tsx`**
   - Sem mudança estrutural; apenas mostrar contagem `{cidades_com_coord}/{total}` na mini-KPI bar para transparência.

### Aceitação (teste com VIVO 02.558.157)

- Mapa carrega em <2s após selecionar provedor (sem chamadas externas de geocoding).
- 500 pontos plotados, cada um na cidade correta (São Paulo, Rio, Curitiba, Campinas, Brasília aparecem nas coords reais).
- Linhas conectam São Paulo (hub) às demais cidades.
- Zero pontos empilhados no centroide de UF para cidades que existem no IBGE.
- Popup mostra cidade/UF, acessos, share %, rank, e — quando aplicável — "(localização aproximada)".

### Arquivos

- editar `supabase/functions/anatel-query/index.ts`
- criar `src/data/ibgeMunicipios.json`
- criar `src/lib/ibgeCoordinates.ts`
- editar `src/hooks/useAnatelProvider.ts`
- editar `src/components/equity-brain/AnatelProviderMap.tsx`
- editar `src/pages/equity-brain/MapaPage.tsx` (mini-KPI extra)

### Observação sobre o dataset IBGE

Vou gerar `ibgeMunicipios.json` em build a partir da fonte pública (`https://raw.githubusercontent.com/kelvins/Municipios-Brasileiros/main/json/municipios.json`) reduzido para apenas `{ id, lat, lng }` para minimizar bundle. Se o download falhar no ambiente de build, faço fallback para um seed das ~600 maiores cidades (coobre >85% dos acessos ANATEL) e mantenho Nominatim como último recurso assíncrono.
