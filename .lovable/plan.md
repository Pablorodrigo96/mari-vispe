## Objetivo

Dentro de `/equity-brain/pipeline?view=mapa` (componente `MapaPage`), adicionar um modo extra "Provedor Anatel" que:

1. Permite escolher 1 provedor da base Anatel (busca por CNPJ/Razão Social)
2. Plota um marker em cada cidade onde o provedor tem acessos
3. Liga as cidades com linhas (rede de presença) — formando uma estrela a partir da sede ou um grafo entre todas as cidades
4. Mostra popup com nome da cidade, UF e nº de acessos

Começamos com 1 provedor de teste e, validado o visual, expandimos para múltiplos provedores.

## Arquivos afetados

```text
src/pages/equity-brain/MapaPage.tsx        (novo modo "Provedor Anatel")
src/components/equity-brain/AnatelProviderMap.tsx   (NOVO — mapa Leaflet com pins+polylines)
src/hooks/useAnatelProviderFootprint.ts             (NOVO — busca cidades+acessos por CNPJ)
supabase/functions/anatel-query/index.ts            (NOVA action footprint_by_cnpj)
```

## Implementação

### 1. Edge function — nova action `footprint_by_cnpj`

Em `anatel-query/index.ts`, adicionar:

```ts
case "footprint_by_cnpj": {
  const cnpj = String(params.cnpj ?? "").replace(/\D/g, "");
  const table = String(params.table ?? "acessos_banda_larga");
  // valida tabela + colunas
  // Detecta cnpj_column, cidade, estado, acessos
  const r = await client.queryObject({
    text: `
      SELECT cidade, estado, sum(acessos::numeric)::bigint AS acessos
      FROM "${table}"
      WHERE regexp_replace("${cnpjCol}"::text,'\\D','','g') = $1
      GROUP BY cidade, estado
      ORDER BY acessos DESC
      LIMIT 500
    `,
    args: [cnpj],
  });
  return ok({ cnpj, rows: r.rows });
}
```

Também aceitar action `search_provider` (LIKE em razao_social/nome_fantasia) para o autocomplete.

### 2. Hook `useAnatelProviderFootprint`

```ts
export function useAnatelProviderFootprint(cnpj: string | null) {
  return useQuery({
    queryKey: ["anatel","footprint", cnpj],
    enabled: !!cnpj && cnpj.replace(/\D/g,"").length === 14,
    queryFn: async () => {
      const { data } = await supabase.functions.invoke("anatel-query", {
        body: { action: "footprint_by_cnpj", params: { cnpj } },
      });
      return data.rows as { cidade:string; estado:string; acessos:number }[];
    },
  });
}
```

Geocodificação client-side via `getCoordinatesAsync` (de `brazilCoordinates.ts`) com cache em memória + localStorage.

### 3. Componente `AnatelProviderMap.tsx`

Vanilla Leaflet (mesmo padrão de `MandateMap`):
- Tile dark CARTO
- Para cada cidade com coords resolvidas → `L.circleMarker` raio proporcional a `log(acessos)`, cor Volt `#D9F564`
- Popup: `<b>{cidade}/{estado}</b><br/>{acessos} acessos`
- **Linhas**: `L.polyline` ligando a cidade-sede (maior nº de acessos ou da RFB) a cada outra cidade — visual "estrela/hub & spoke", cor `#D9F564` 40% opacity, `weight: 1.5`, `dashArray: "4 4"`
- `fitBounds` em todas as cidades
- Loading state enquanto resolve coordenadas

### 4. UI no `MapaPage`

No toggle de modo (hoje "Heatmap empresas" / "Mandatos"), adicionar terceiro botão **"Provedor Anatel"**.

Quando ativo:
- Aparece um campo de busca no topo (`Input` + lista) — busca por CNPJ ou Razão Social via `anatel-query` (limite 10 resultados)
- Ao selecionar, dispara `useAnatelProviderFootprint` e renderiza `AnatelProviderMap`
- Card lateral fixo mostra: nome do provedor, total de acessos, nº de cidades, nº de UFs, top 5 cidades

Para o teste inicial, deixar pré-preenchido um CNPJ de exemplo (configurável via input). Após validação, será só replicar/abrir múltiplos provedores.

### 5. Cores e estilo

- Marker sede: `#D9F564` (Volt) com borda branca
- Markers cidades: `#D9F564` 70% opacity, raio 6–14px conforme acessos
- Linhas: dashed Volt 40% — sugerem rede sem poluir
- Dark mode mantido (CARTO dark tiles)

## Critério de aceite (teste 1 provedor)

- Selecionar 1 CNPJ Anatel mostra todos os pontos no mapa
- Cidades sem coords caem no centróide do estado (fallback existente)
- Linhas conectam sede → demais cidades
- Total de acessos e contagem de cidades batem com `aggregateAnatel`

Depois disso aprovado, fase 2 = permitir múltiplos provedores simultâneos com cor por provedor.