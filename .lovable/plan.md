## Objetivo

Garantir que a busca de "candidatos complementares" no mapa Anatel:
- use **todas as cidades atendidas pelo comprador** como sementes (já ok no filtro, mas reforçar no score),
- meça proximidade **cidade-mais-próxima ↔ cidade-mais-próxima** (e não centroide-a-centroide),
- mostre visualmente as cidades-semente do comprador para o usuário enxergar o que originou cada candidato.

## Mudanças

### 1. `src/hooks/useAnatelMarketRadius.ts` — distância e overlap por cidade

- Trocar `selectedFootprints[].centroid` por **`selectedFootprints[].cityPoints: {key, lat, lng}[]`** (lista de pontos das cidades do comprador, com chave `ibge:` ou `nm:`).
- Em `MarketProvider`, manter `cnpj/empresa/acessos/cidades/overlapCidades/score`, mas:
  - `distMinKm` passa a ser **min distância** entre **qualquer cidade do candidato** (`MarketCell` agregada) e **qualquer cidade do comprador** (`cityPoints`). Bem menor que centroide-a-centroide e fiel ao "está a 50km de A".
  - Calcular também `nearestSeedKm` (igual `distMinKm`, exposto para tooltip).
- O ponto `(lat, lng)` retornado para o pino do candidato passa a ser **a cidade do candidato com maior nº de acessos dentro da área de busca** (não o centroide ponderado). Isso ancora o pino numa localidade real.
- `score` mantém a fórmula `60·(1-overlapPct) + 40·proximityScore`, mas `proximityScore = 1 - clamp01(distMinKm / radiusKm)` agora reflete distância real.

### 2. `src/pages/equity-brain/MapaPage.tsx` — montar `cityPoints` ao invés de centroide

- Em `handleSearchMarket`, substituir o cálculo `sumLatW/sumW` por uma lista `cityPoints[]` resolvida via `getCoordsByIbge → getCoordinates → stateCapitals`.
- Manter `excludeCnpjs` e `seeds` como hoje (`buildSeeds()` já está correto e cobre A, B, C, …).

### 3. `src/components/equity-brain/AnatelProviderMap.tsx` — feedback visual das sementes

- Adicionar prop opcional **`buyerSeedPoints?: { lat:number; lng:number; cidade:string; estado:string }[]`**.
- Quando presente e `marketCandidates` também presente, desenhar essas cidades como **anel pontilhado laranja `#FB923C` raio 6, fillOpacity 0**, sem texto, apenas tooltip "Cidade-semente — comprador atende aqui". Não interferir com os markers existentes.
- Atualizar a legenda do canto superior direito com a linha "Cidades-semente do comprador" quando aplicável.
- Continuar **sem círculo de raio** (decisão anterior mantida).

### 4. `src/components/equity-brain/MarketRadiusPanel.tsx` — copy

- Trocar a label do top-N para `"Top N complementares (multi-seed: cada cidade do comprador conta)"`.
- No tooltip do botão "Buscar empresas no raio", deixar explícito que o raio é aplicado a **cada cidade do comprador**, não a um centro único.
- Mostrar um sub-título acima do slider: `"Raio aplicado a cada cidade do comprador (A, B, C…). Sobreposição entre raios é permitida."`.

### 5. Tooltip do candidato no `AnatelProviderMap`

- Adicionar linha `Mais próximo de: {cidadeSemente}/{UF} (~{distMinKm} km)` quando os `cityPoints` chegam por `marketCandidates`. Calcular no momento de plotar.

## Não muda

- O conjunto de cidades elegíveis (`citiesWithinRadius`) já é multi-semente — não mexer nessa parte.
- Cores: candidato segue violeta `MARKET_CANDIDATE_COLOR`, slots seguem `ANATEL_SLOT_COLORS`, overlap segue vermelho.
- Edge function `anatel-query` não muda (continua recebendo lista de IBGEs e UF opcional).

## Resultado esperado

Após aprovação: ao marcar um comprador com cidades A/B/C e raio 50 km, o mapa mostra (i) anéis laranja pontilhados em A/B/C, (ii) candidatos plotados na cidade real mais relevante deles dentro da área, (iii) ranking ordenado por menor overlap + menor distância **à semente mais próxima**, e (iv) tooltip explicitando de qual cidade-semente o candidato está perto.
