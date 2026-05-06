## Bug

`AnatelCruzamentoPage` → "Perfil da empresa" usa `by_cnpj` (action que retorna linhas brutas com `LIMIT ≤ 500`). Empresas grandes (DESKTOP, Vivo, Claro) têm milhares de linhas no snapshot Anatel (uma por cidade × tecnologia × faixa de velocidade). O LIMIT corta a maior parte e o `aggregateAnatel` no cliente soma só a fatia → "Total de Acessos" mostra 654 em vez de 1.200.000+.

A tabela "Cidades onde a empresa atua" funciona porque usa `kind: "company_footprint"`, que já roda `SUM(acessos)` agregado no Postgres.

## Correção — agregação no banco, não no cliente

### 1. Edge function `supabase/functions/anatel-query/index.ts`

Adicionar novo `kind` em `stats`: **`company_profile`**. Em uma única chamada, retorna tudo já agregado por CNPJ:

```sql
WITH base AS (
  SELECT cidade, estado, tecnologia, meio_acesso, faixa_velocidade,
         SUM(NULLIF(regexp_replace(acessos,'[^0-9-]','','g'),'')::bigint) AS acessos
  FROM "<table>"
  WHERE regexp_replace(cnpj::text,'\D','','g') = $1
  GROUP BY cidade, estado, tecnologia, meio_acesso, faixa_velocidade
)
SELECT
  (SELECT SUM(acessos) FROM base)                        AS total_acessos,
  (SELECT COUNT(DISTINCT (cidade,estado)) FROM base)     AS n_cidades,
  (SELECT COUNT(DISTINCT estado) FROM base)              AS n_ufs,
  (SELECT json_agg(t) FROM (
     SELECT tecnologia AS name, SUM(acessos)::bigint AS acessos
     FROM base GROUP BY tecnologia ORDER BY 2 DESC) t)   AS tecnologias,
  (SELECT json_agg(t) FROM (
     SELECT meio_acesso AS name, SUM(acessos)::bigint AS acessos
     FROM base GROUP BY meio_acesso ORDER BY 2 DESC) t)  AS meios_acesso,
  (SELECT json_agg(t) FROM (
     SELECT faixa_velocidade AS name, SUM(acessos)::bigint AS acessos
     FROM base GROUP BY faixa_velocidade ORDER BY 2 DESC) t) AS faixas
```

Retorna `{ total_acessos, n_cidades, n_ufs, tecnologias[], meios_acesso[], faixas[] }`.

### 2. Hook `src/hooks/useAnatelData.ts`

Adicionar `useAnatelCompanyProfile(cnpj, table)` que invoca o novo kind. Usa o mesmo cache key.

### 3. Página `AnatelCruzamentoPage.tsx`

- Trocar dependência de `byCnpj.data?.rows` (limitado) por `companyProfile.data` (agregado completo) na hora de alimentar o `CompanyProfileCard`.
- Manter `byCnpj` apenas como fallback (ou remover — a tabela de cidades já é coberta por footprint).

### 4. `src/components/equity-brain/CompanyProfileCard.tsx`

Aceitar prop opcional `aggregate?: AnatelAggregate` que, quando presente, sobrepõe o `aggregateAnatel(rows)`. Quando vier do banco, todos os KPIs (Total de Acessos, Tecnologia Principal, Distribuição, Velocidade Predominante, Cobertura) consomem números agregados globais.

### 5. `src/lib/anatelInsights.ts`

Adicionar helper `aggregateFromServer(payload)` que monta o objeto `AnatelAggregate` a partir da resposta do `company_profile` (sem `cidades[]` — essa parte continua via `footprint`, que já é agregado por cidade).

### 6. Sanity check

Após carregar, validar no console (dev): `total_acessos === sum(footprint.acessos_empresa)`. Se divergir, log warning. Garante consistência entre o card de topo e a tabela "Cidades onde a empresa atua".

## Resumo do efeito

- Card "Total de Acessos" passa a refletir SOMA real do CNPJ no snapshot inteiro.
- Receita Mensal/Anualizada (ticket × total) ficam corretas automaticamente.
- "Tecnologia Principal" e "Distribuição por tecnologia" passam a usar SUM agregado por tecnologia (não count parcial).
- "Velocidade predominante" idem.
- Cobertura (n_cidades, n_ufs) idem.
- Soma da coluna "Acessos da empresa" da tabela Cidades = "Total de Acessos" do card (mesma fonte SQL agregada).