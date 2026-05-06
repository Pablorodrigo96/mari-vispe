## Objetivo
Adicionar uma barra de filtros global no topo do "Cruzamento RFB × Anatel" que permite:
- **Cenário A**: buscar por **empresa** (razão social/fantasia) ou **CNPJ** → exibir o `CompanyProfileCard` consolidado + tabela de cidades onde a empresa atua, com o market share dela em cada município.
- **Cenário B**: filtrar **UF** (e opcionalmente **cidade**) sem empresa → restringir a tabela atual de "Market share por município" à região selecionada.

## Mudanças no Edge Function `anatel-query`

Estender o `case "stats"` e adicionar 2 novos kinds + 1 nova action:

1. **`stats / share_by_municipio`** — aceitar params opcionais `uf` e `cidade` para filtrar a CTE base (`WHERE upper(estado)=$1` e `unaccent(lower(cidade))=unaccent(lower($2))`). Mantém o resto.

2. **`stats / company_footprint`** (novo) — recebe `cnpj`, retorna por município onde a empresa atua: `cidade, estado, acessos_empresa, total_municipio, n_provedores, share_pct, rank_no_municipio`. Reusa a janela do snapshot.

3. **`search_companies`** (nova action) — recebe `q` (string), faz `SELECT DISTINCT empresa, cnpj, SUM(acessos) FROM base_anatel WHERE unaccent(empresa) ILIKE unaccent($1) OR cnpj ILIKE $2 GROUP BY 1,2 ORDER BY 3 DESC LIMIT 20`. Para autocomplete/seleção quando o usuário digita nome da empresa.

Validação de identifiers permanece via `IDENT_RE`. Todos os params via `$1/$2`.

## Mudanças no front-end

### `src/components/equity-brain/AnatelFilterBar.tsx` (novo)
Componente compacto, dark, em uma linha (`flex flex-wrap gap-2`):
- Input "Empresa" (com debounce + dropdown de sugestões via `search_companies`).
- Input "CNPJ" com máscara (reusar lógica do `mariWindowHeuristic`).
- `Select` UF (lista fixa de 27 UFs + "Todos").
- Input "Cidade" (texto livre; opcionalmente filtrado pela UF).
- Botão **Buscar** (`bg-[#D9F564] text-[#0A0A0A]`) e botão **Limpar** (outline).
- Estado do filtro elevado para o pai via callback `onSearch(filters)`.

### `src/hooks/useAnatelData.ts`
Adicionar:
- `useAnatelCompanySearch(q)` → action `search_companies`.
- `useAnatelCompanyFootprint(cnpj, table)` → `stats / company_footprint`.
- Estender `useAnatelShareByMunicipio({uf, cidade, table})`.

### `src/pages/equity-brain/AnatelCruzamentoPage.tsx`
- Substituir o `<form>` de CNPJ atual pela `<AnatelFilterBar />` no topo (acima das tabs ou substituindo o "Buscar").
- Manter as 2 tabs ("Perfil por CNPJ" e "Market share por município"), mas a barra de filtros controla **ambas**:
  - Se o usuário busca empresa/CNPJ → seleciona automaticamente a tab **Perfil**, mostra `CompanyProfileCard` + nova `<CompanyFootprintTable />` abaixo (tabela com cidade, UF, acessos da empresa, total município, share %, rank). Esconde/desativa a tabela geral.
  - Se só UF/cidade → seleciona tab **Market Share** e passa filtros para `loadShare`.
- Botão "Limpar" reseta `cnpj`, `companyQuery`, `uf`, `cidade` e volta ao estado inicial.

### `src/components/equity-brain/CompanyFootprintTable.tsx` (novo)
Tabela enxuta (mesmo estilo da de market share atual): colunas `Cidade`, `UF`, `Acessos da empresa`, `Total município`, `Share %` (com barra), `Rank`. Usa `formatNum`.

## Detalhes de UX
- Barra de filtros usa Volt (`#D9F564`) só no botão primário; resto neutro escuro.
- Quando empresa selecionada: a aba "Market Share por município" fica colapsada/oculta para evitar poluição (apenas o footprint da empresa fica visível).
- Sugestões de empresa: dropdown ancorado no input, max 8 itens (`empresa — CNPJ — N acessos`).
- Máscara CNPJ reaproveita helper existente em `mariWindowHeuristic`.
- Reset preserva o `mainTable` carregado (não recarrega schema).

## Arquivos
- **Editar**: `supabase/functions/anatel-query/index.ts`, `src/pages/equity-brain/AnatelCruzamentoPage.tsx`, `src/hooks/useAnatelData.ts`.
- **Criar**: `src/components/equity-brain/AnatelFilterBar.tsx`, `src/components/equity-brain/CompanyFootprintTable.tsx`.
- **Redeploy**: `anatel-query`.

## Fora do escopo
- Não altera o `CompanyProfileCard` (já consolidado).
- Não toca em outras páginas do `/equity-brain/mercado`.
