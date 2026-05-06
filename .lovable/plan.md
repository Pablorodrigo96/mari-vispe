## Objetivo
Limpar a poluição visual da busca "empresas no raio" e re-priorizar resultados por **complementaridade territorial** (menos overlap + cidades próximas), destacando essas empresas no mapa com cor própria.

## 1. Remover poluição visual do raio (`AnatelProviderMap.tsx`)

- Remover os círculos pontilhados grandes (`L.circle` por seed) que desenham o alcance do raio.
- Remover as bolinhas laranja agregadas de "mercado por cidade" (`marketLayer.cells` em laranja).
- Em vez disso, NÃO desenhar nada do `marketLayer` no mapa por padrão. O raio fica implícito no painel lateral (lista) e nos novos pontos das empresas candidatas (item 3).
- Manter só a entrada de legenda quando houver `marketCandidates` (renomeada).

## 2. Ranking por complementaridade (`useAnatelMarketRadius.ts`)

Calcular, para cada provedor candidato retornado:
- `overlapCidades` = nº de cidades em comum com qualquer provedor já selecionado (slots).
- `overlapPct` = `overlapCidades / cidadesProvedor`.
- `distMinKm` = menor distância haversine entre centroide ponderado do candidato e centroides dos slots.
- `distMaxRaio` = `radiusKm` (referência).
- **Score complementaridade** (0–100):
  `score = 60 * (1 - overlapPct) + 40 * (1 - clamp(distMinKm / radiusKm, 0, 1))`
  → favorece quem tem MENOS overlap e está PRÓXIMO (mas não em cima).
- Penalizar fortemente quem é o próprio slot (excluir da lista).
- Ordenar `providers` desc por `score`.

Para isso o hook precisa receber as cidades dos slots já selecionados e os centroides:
- Novo input opcional `selectedFootprints: { cnpj, cities: Set<string>, centroid: {lat,lng} }[]`.
- Calcular centroide do candidato a partir das próprias cells onde ele aparece (média ponderada por acessos), agregando `cidadesAtendidas: Set<string>` por candidato.

Exportar campos extras em `MarketProvider`:
```ts
{ cnpj, empresa, acessos, cidades, overlapCidades, overlapPct, distMinKm, score, lat, lng }
```

## 3. Cor distinta para candidatos no mapa

- Nova constante `MARKET_CANDIDATE_COLOR = "#A78BFA"` (violeta) — distinta dos slots (Volt/Azul/Rosa) e do vermelho de overlap.
- `AnatelProviderMap` recebe `marketCandidates?: { cnpj, empresa, lat, lng, score, overlapCidades, cidades, acessos }[]`.
- Renderiza `circleMarker` violeta por candidato (top N, default 20), raio proporcional ao score (não a acessos), com popup: empresa, score, overlap, distância, acessos.
- Sem polilinhas, sem círculos de raio.

## 4. Painel lateral (`MarketRadiusPanel.tsx`)

- Cabeçalho do ranking muda de "Top N na região" → "Top N complementares (menor overlap + proximidade)".
- Cada linha mostra: `score` (badge violeta), `overlap X cid.`, `~Y km`, e os atuais acessos/cidades como secundário.
- Botão "+" continua adicionando aos slots.
- Stat "Provedores" passa a refletir candidatos pós-filtro (ex.: top 50 considerados).

## 5. Wiring (`MapaPage.tsx`)

- Passar `selectedFootprints` para `marketSearch.mutateAsync` montando `{cnpj, cities, centroid}` a partir de `footprintQs[idx].data`.
- Passar `marketCandidates` (top 20 do `marketSearch.data.providers`) para `AnatelProviderMap`.
- Manter `marketLayer` apenas para o cálculo de `cells`/totais do painel — não enviar mais ao mapa (ou enviar `null`).
- Manter o fallback "sem comprador marcado → todos slots como semente".

## Detalhes técnicos

- Centroide ponderado: `Σ(lat·acessos)/Σacessos`, `Σ(lng·acessos)/Σacessos`.
- Comparação de cidades para overlap: chave `ibge:<code>` se houver, senão `nm:<cidade.lower()>|<uf>` — mesma convenção já usada em `overlapInfo`.
- Excluir da lista qualquer `cnpj` presente em `selectedProviders`.
- `clamp(x,0,1)` inline.
- Performance: top 50 candidatos máx (já é o teto do painel).

## Aceitação

- Buscar no raio NÃO desenha mais círculos pontilhados nem bolinhas laranja.
- Os pontos das empresas candidatas aparecem em violeta, distintos dos slots.
- Painel lateral lista candidatos ordenados por score complementar (menor overlap + cidades próximas), com badges de overlap e distância.
- Slots já selecionados não aparecem como candidatos.
