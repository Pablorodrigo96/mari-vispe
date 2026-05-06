# Comparar múltiplos provedores no mapa Anatel

Hoje o `MapaPage` (modo "Provedor Anatel") só permite selecionar **um** CNPJ por vez. Vamos evoluir para **até 3 provedores simultâneos**, cada um com cor própria, mantendo a malha k-NN dentro de cada provedor (não cruza entre eles, para a leitura ficar limpa).

## UX

- Em vez de `selectedProvider` (single), passa a ser `selectedProviders: AnatelProviderHit[]` (máx 3).
- Ao clicar num resultado da busca: adiciona à lista (se ainda não estiver e tiver < 3 slots).
- Acima do mapa, aparecem **chips** de cada provedor selecionado com:
  - bolinha colorida (cor do slot)
  - nome + nº cidades + nº acessos
  - botão "×" para remover
- KPIs (Cidades / UFs / Total acessos) viram um **mini-resumo por provedor** lado a lado (cards coloridos com a cor do slot).
- Mensagem "selecione um provedor" só aparece quando `selectedProviders.length === 0`.

## Cores dos slots

Paleta fixa (3 slots), alto contraste sobre o basemap escuro:

```text
slot 0 → #D9F564 (Volt — mantém identidade)
slot 1 → #60A5FA (azul)
slot 2 → #F472B6 (rosa)
```

## Mapa (`AnatelProviderMap.tsx`)

A API do componente muda para receber **N camadas**:

```ts
interface ProviderLayer {
  id: string;            // cnpj
  empresa: string;
  color: string;         // cor do slot
  rows: AnatelFootprintRow[];
}
interface Props {
  layers: ProviderLayer[];
  height?: string;
}
```

Comportamento:
- Para cada camada, roda o pipeline atual (resolve coords via IBGE → dict → capital UF, calcula hub, monta malha k-NN com `MAX_EDGE_KM=600`, k=3/2) **isoladamente**, usando a `color` da camada para markers + linhas.
- Não conecta pontos entre provedores diferentes (cada cor é uma rede própria).
- Markers ganham `fillColor` = cor do slot; linhas idem.
- Em **cidades onde dois provedores coexistem**, desenhamos os markers com leve offset radial (~6px em pixels de tela convertidos para latLng) para não ficarem 100% sobrepostos — mesmo padrão usado em `BuyerMarketMap` (já tem precedente no projeto).
- Popup mostra nome do provedor no topo (com cor do slot) além das infos atuais.
- Legenda flutuante (canto sup. dir.) lista as camadas ativas com suas cores.
- `fitBounds` usa a união de todos os pontos das camadas.

## Página (`MapaPage.tsx`)

Mudanças no bloco `mode === "anatel"`:

1. Estado:
   ```ts
   const [selectedProviders, setSelectedProviders] = useState<AnatelProviderHit[]>([]);
   ```
2. Busca `useAnatelProviderFootprint` precisa rodar para cada CNPJ. Solução: criar hook fino `useAnatelProviderFootprints(cnpjs: string[])` que faz `useQueries` (TanStack) e devolve `{ cnpj, data, isLoading }[]`. Mantém cache por CNPJ — trocar a ordem/adicionar novo não refaz os já carregados.
3. Render:
   - Search continua igual; `onClick` do hit faz `addProvider(hit)` (no-op se já existe ou já tem 3).
   - Chips dos selecionados acima do mapa, com remover.
   - Cards mini-KPI: um por provedor, com a cor do slot.
   - Passa `layers` para `AnatelProviderMap` montadas como `{ id, empresa, color: PALETTE[idx], rows: footprints[idx].data ?? [] }`.

## Constantes / utils

- Adicionar em `AnatelProviderMap.tsx` (ou novo `src/lib/anatelMapColors.ts`):
  ```ts
  export const ANATEL_SLOT_COLORS = ["#D9F564", "#60A5FA", "#F472B6"];
  export const MAX_ANATEL_SLOTS = 3;
  ```

## Arquivos a tocar

- `src/components/equity-brain/AnatelProviderMap.tsx` — refatorar para `layers[]`, loop por camada, offset em colisões, legenda.
- `src/hooks/useAnatelProvider.ts` — exportar `useAnatelProviderFootprints(cnpjs)` baseado em `useQueries`.
- `src/pages/equity-brain/MapaPage.tsx` — estado multi-select, chips, KPIs por slot, passar `layers`.

Sem mudanças em edge function, schema, ou geocoding — toda a lógica é client-side em cima do que já existe.

## Critérios de aceite

- Posso adicionar até 3 provedores e ver suas malhas sobrepostas em cores distintas.
- Posso remover qualquer um via chip "×".
- Cidades em comum mostram dois markers levemente deslocados (sem virar um ponto só).
- Popup deixa claro de qual provedor é o ponto.
- Performance ok com 3 × ~500 cidades (markers em canvas, malha O(n²) por camada continua <30ms).
