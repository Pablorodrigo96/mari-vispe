## Objetivo

Transformar a aba "Market share" em um ranking de empresas que se ajusta ao nível geográfico filtrado (Brasil → UF → Cidade) e tornar todo nome de empresa clicável, redirecionando para a aba "Perfil da empresa" já carregada.

## 1. Edge function `anatel-query` — novo `kind: "share_by_company"`

Adicionar dentro de `case "stats"` em `supabase/functions/anatel-query/index.ts`:

- Aceita `uf?` e `cidade?` opcionais.
- Se nenhum filtro → agrupa por `(empresa, cnpj)` em todo o snapshot (Brasil).
- Se `uf` apenas → filtra `upper(estado)=uf`, soma acessos por empresa.
- Se `uf+cidade` → filtra também `lower(cidade)=lower(...)`.
- Calcula `total_geo = SUM(acessos)` via window function e devolve `share_pct = acessos / total_geo * 100`.
- Retorna colunas: `empresa, cnpj, acessos, share_pct, rank, total_geo, n_empresas`.
- Ordena `acessos DESC`, `LIMIT` (default 200, max 500).

A query existente `share_by_municipio` permanece intacta (continua alimentando a sub-aba "Visão por Cidades").

## 2. Frontend — `AnatelCruzamentoPage.tsx`

### 2.1 Estado e carregamento

- Novo state: `companyRanking: any[]`, `companyRankingLoading: boolean`, `shareView: "companies" | "cities"` (default `"companies"`).
- Novo loader `loadCompanyRanking({ uf, cidade })` invocando `kind: "share_by_company"`.
- `handleSearch` (cenário B — sem CNPJ) e mount inicial: dispara **ambos** `loadCompanyRanking` e `loadShare` (cidades) com os mesmos filtros, para que o toggle alterne sem novo round-trip.
- Quando filtros mudam, recarrega os dois.

### 2.2 Aba "Market share" — novo layout

Header dinâmico:
- Título: `Market share — ${cidade ? cidade+'/'+uf : uf || 'Brasil'}`.
- Subtítulo: total de acessos do recorte + nº de empresas.
- Toggle pill no canto direito: **Empresas** (default) | **Visão por Cidades**.

**View "Empresas"** (nova, principal):
Tabela com colunas:
| # | Empresa | CNPJ | Acessos | Share % (barra+valor) |

- Linha clicável: hover `bg-zinc-800/40`, nome em `text-zinc-100 hover:text-emerald-400 cursor-pointer underline-offset-2 hover:underline`.
- Click → `handleCompanyClick({ empresa, cnpj })`.

**View "Visão por Cidades"** (atual `shareByCity`, preservada):
Tabela atual onde a coluna "Líder" também vira clicável (mesmo handler).

### 2.3 Deep linking — `handleCompanyClick`

```ts
function handleCompanyClick({ empresa, cnpj }: { empresa: string; cnpj: string }) {
  const clean = cnpj.replace(/\D/g, "");
  if (clean.length !== 14) return;
  setCnpj(clean);
  setTab("cnpj");
  loadFootprint(clean);
  // opcional: refletir na barra de filtros via prop controlada (ver 2.4)
}
```

`useAnatelByCnpj` e `useCrossRefRfbAnatel` já reagem ao novo `cnpj` e populam `CompanyProfileCard` + `CompanyFootprintTable` automaticamente — comportamento idêntico ao da pesquisa manual.

### 2.4 Sincronização da barra de filtros (opcional, leve)

Tornar `AnatelFilterBar` parcialmente controlado: aceitar prop opcional `value?: { empresa; cnpj }` e expor `useEffect` que atualiza inputs internos quando muda. Permite que ao clicar numa empresa a barra superior reflita a seleção. Fallback simples: deixar incontrolado e apenas exibir badge "empresa selecionada" acima do perfil.

## 3. Componentes

- **Novo:** `src/components/equity-brain/CompanyShareTable.tsx` — recebe `rows`, `scopeLabel`, `loading`, `onCompanyClick`. Renderiza ranking com barra de share verde-neon (`bg-emerald-500`).
- Reuso: `formatNum`, `formatCnpj` de `@/lib/anatelInsights`.

## 4. Resumo de arquivos editados

```text
supabase/functions/anatel-query/index.ts        (+ kind: share_by_company)
src/components/equity-brain/CompanyShareTable.tsx   (novo)
src/components/equity-brain/CompanyFootprintTable.tsx (linhas/líderes não se aplica; nada muda)
src/pages/equity-brain/AnatelCruzamentoPage.tsx (toggle, header dinâmico, click handler, dual-load)
```

Sem mudança em DB, RLS, ou em outras rotas. Padrão dark mode (zinc/emerald) preservado.
