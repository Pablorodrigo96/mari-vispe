# "Buscar empresas no raio" — descoberta de mercado a partir do comprador

Acrescenta uma busca de mercado: dado um (ou mais) provedor marcado como **comprador**, varre todas as cidades que estão no **raio em km** das cidades dele e devolve **todos os provedores** que atuam nessa região, plotados como **camada agregada** no mapa (cor laranja Mari `#FB923C`).

## UX

Na aba "Provedor Anatel" do `/equity-brain/pipeline?view=mapa`, dentro do bloco de chips dos provedores selecionados:

1. Cada chip ganha um toggle "🎯 comprador" (clique alterna). Estado: `buyerCnpjs: Set<string>`.
2. Abaixo dos chips, novo painel "Buscar mercado":
   - Slider de raio: **10–500 km** (default 50). Label dinâmico.
   - Toggle "Apenas mesma UF do comprador" (off por padrão).
   - Botão **"Buscar empresas no raio"** (Volt). Disabled se nenhum slot estiver marcado como comprador.
   - Botão "Limpar mercado" (aparece após resultado).
3. Após resposta:
   - KPI bar dedicado: `N provedores · N cidades · X mil acessos` na cor laranja.
   - Lista colapsável "Top 20 provedores" (nome, n cidades atingidas, acessos, botão "+ Adicionar como camada" — respeita limite de 3 slots).
4. No mapa:
   - Cada cidade alvo vira marker laranja (raio = log10(acessos totais na cidade)).
   - **Círculos pontilhados** ao redor de cada cidade-semente do comprador, com raio igual ao slider — feedback visual claro do alcance.
   - Sem malha k-NN nessa camada (visual já é denso).
   - Popup do marker laranja: "Cidade · UF · X provedores · Y mil acessos · Top: <empresa>".

## Algoritmo (client + edge)

### Cliente (semente):
1. Pega todas as cidades dos provedores marcados como comprador (já vêm do `useAnatelProviderFootprints`).
2. Resolve coords via IBGE (já temos `getCoordsByIbge` + `ibgeMunicipios.json`).
3. Filtra município candidatos: para todo município brasileiro do `ibgeMunicipios.json`, calcula haversine ao centro mais próximo da semente; mantém os com `d ≤ raio`.
4. Manda para o backend a lista de **códigos IBGE** desses municípios (até ~2000) + flag opcional `uf`.

### Edge function — nova action `companies_in_cities`:
Em `supabase/functions/anatel-query/index.ts`:
```sql
WITH base AS (
  SELECT empresa, cnpj, cidade, estado, codigo_ibge_cidade,
         SUM(NULLIF(regexp_replace(acessos,'[^0-9-]','','g'),'')::bigint) AS acessos
  FROM "<table>"
  WHERE codigo_ibge_cidade = ANY($1::text[])
  GROUP BY empresa, cnpj, cidade, estado, codigo_ibge_cidade
)
SELECT cidade, estado, codigo_ibge_cidade,
       SUM(acessos)::bigint AS acessos_total,
       COUNT(DISTINCT cnpj)::int AS n_provedores,
       (ARRAY_AGG(empresa ORDER BY acessos DESC))[1] AS top_empresa,
       (ARRAY_AGG(cnpj ORDER BY acessos DESC))[1] AS top_cnpj,
       json_agg(json_build_object('empresa',empresa,'cnpj',cnpj,'acessos',acessos)
                ORDER BY acessos DESC) FILTER (WHERE empresa IS NOT NULL) AS providers
FROM base
GROUP BY cidade, estado, codigo_ibge_cidade
ORDER BY acessos_total DESC
LIMIT 5000;
```
Auth/CORS já existentes (admin/advisor) são respeitados.

Cliente também deriva o "Top 20 provedores" agregando o array `providers` por CNPJ.

## Arquivos

**Novos**
- `src/hooks/useAnatelMarketRadius.ts` — recebe `seedCities: {ibge, lat, lng}[]` + `radiusKm` + `sameUfOnly` + `triggerKey`; faz filtro de IBGE local, chama edge action `companies_in_cities` via `useMutation` e devolve `{ rows, providers }`.
- `src/components/equity-brain/MarketRadiusPanel.tsx` — slider, toggles, botão, KPI e lista top 20.

**Editados**
- `supabase/functions/anatel-query/index.ts` — adiciona `case "companies_in_cities"` (auto-deploy).
- `src/components/equity-brain/AnatelProviderMap.tsx` — nova prop opcional `marketLayer?: { color, cells: {ibge, cidade, estado, lat, lng, acessos_total, n_provedores, top_empresa}[]; seeds: {lat, lng}[]; radiusKm: number }`. Renderiza markers laranja + L.circle pontilhados nas seeds. Inclui na união do `fitBounds`.
- `src/pages/equity-brain/MapaPage.tsx` — estado `buyerCnpjs`, `radiusKm`, `marketResult`; chips com toggle comprador; integra `<MarketRadiusPanel>`; passa `marketLayer` ao mapa.

## Constantes
- `MARKET_COLOR = "#FB923C"` em `AnatelProviderMap.tsx`.
- Raio default 50, min 10, max 500.

## Performance
- Filtro de cidades client-side: 5570 municípios × ≤ N seeds (tipicamente <500) = <3M ops haversine, <80ms em V8.
- Query SQL com `ANY(text[])` é eficiente; cap em 2000 IBGEs no payload (raio máximo ~500 km cobre ≈ região; suficiente para todo BR).
- Resultado client cacheado por `(buyerCnpjsSorted|radius|sameUf)` no React Query.

## Critérios de aceite
- Marco 1 provedor como comprador, defino raio 80 km, clico "Buscar empresas no raio" → vejo círculos pontilhados ao redor das cidades dele + nuvem laranja de cidades vizinhas atendidas por outros provedores.
- KPI mostra contagem real; Top 20 mostra ranking; consigo adicionar um deles como camada normal (slot 3) — vê interseção.
- Aumentar/diminuir o slider e re-clicar atualiza o resultado.
- "Limpar mercado" remove a camada laranja sem afetar os slots 0–2.
- Sem comprador marcado, botão fica disabled com tooltip explicativo.
