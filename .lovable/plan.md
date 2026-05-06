## Refatoração — Cruzamento RFB × Anatel (snapshot estático)

Reconhecemos que a base é um snapshot de **um único mês**, então toda lógica temporal (Δ%, "12m atrás") será removida. O foco passa a ser **inteligência de M&A** sobre o estado atual.

---

### 1. Remover aba "Top Crescimento"

Arquivo: `src/pages/equity-brain/AnatelCruzamentoPage.tsx`
- Remover `TabsTrigger value="growth"` e o `TabsContent` correspondente.
- Remover state `topGrowth` e a chamada `kind: "top_growth"` em `loadStats`.

Arquivo: `supabase/functions/anatel-query/index.ts`
- Remover bloco `if (kind === "top_growth")` e a descoberta de `prev12` (período anterior).
- Manter apenas o `latest` para alimentar `share_by_municipio`.

---

### 2. Aba "Por CNPJ" — Visão Consolidada (sem JSON cru)

Substituir os dois cards de `<pre>{JSON.stringify(...)}</pre>` por um **Card de Perfil da Empresa** estruturado.

**a) Header do perfil (vindo da RFB)**
- Razão Social · Nome Fantasia · CNPJ formatado
- Badges: Situação Cadastral (verde/vermelho), Porte (ME/EPP/Demais), UF/Município (sede)
- Capital Social formatado em BRL · Data de início · CNAE principal

**b) KPIs consolidados (vindo da Anatel — agregando todas as linhas do CNPJ no snapshot)**
Calculados no client a partir de `byCnpj.data.rows`:
- **Total de Acessos** = soma de `acessos` (limpando texto via regex no client).
- **Tecnologias** = lista única de `tecnologia` (com contagem por tech).
- **Velocidade predominante** = faixa de `velocidade` mais frequente (mode).
- **Nº de municípios atendidos** e **Nº de UFs atendidas**.

Layout: 4 cards verde-neon/cinza com ícones (Users, Wifi, Gauge, MapPin).

**c) Seção "Expansão Geográfica"**
- Comparar `rfb.uf`/`rfb.municipio` com o conjunto distinto de `(estado, cidade)` da Anatel.
- Calcular `status`:
  - `Local` — todas linhas Anatel na mesma cidade+UF da sede RFB.
  - `Regional` — múltiplas cidades, mas todas na UF da sede.
  - `Interestadual` — pelo menos uma UF diferente da sede.
- Renderizar tag colorida (zinc/azul/violeta) + tabela compacta "Top 10 cidades por acessos" com coluna "é sede?".

**d) Seção "Inteligência Financeira & Alertas M&A"**
- Card lado-a-lado: **Capital Social (RFB)** × **Total de Acessos (Anatel)**.
- Regra de alerta inconsistência societária:
  ```
  if (acessos > 5000 && capitalSocial < 50000) → badge âmbar
     "⚠️ Alerta de M&A — Inconsistência Societária"
  ```
- **Receita Estimada**: input numérico controlado `ticketMedio` (default `90`), persistido em `useState`.
  - Receita mensal = `acessos × ticketMedio`
  - Receita anualizada = `× 12`
  - Exibir os dois valores formatados em BRL.
- **Alerta de Porte** (limites SIMPLES/Lei Complementar):
  ```
  ME    : até R$ 360 mil/ano
  EPP   : até R$ 4,8 mi/ano
  Demais: acima
  ```
  Se `receitaAnualizada > limite(porte)` → badge vermelho "⚠️ Possível Desenquadramento Fiscal" com texto explicando porte declarado vs. receita estimada.

Sem nenhum `<pre>`/JSON visível.

---

### 3. Aba "Market Share por Município" — Índice de Regionalização

Edge function (`anatel-query`, kind `share_by_municipio`):
- Estender query para também retornar, por município no top N, a lista dos provedores com seus acessos e CNPJ. Hoje só retorna o líder; precisamos do detalhe.
- Nova kind alternativa **`share_with_origin`** que faz JOIN com `estabelecimentos` da RFB (via `EXTERNAL_DB_URL`) para descobrir UF/município da **sede** de cada CNPJ provedor. Como o edge atual só conecta ao `ANATEL_DB_URL`, vamos:
  - Adicionar segunda conexão opcional ao `EXTERNAL_DB_URL` dentro de `share_by_municipio`.
  - Para cada CNPJ no top N, buscar `e.uf`, `e.municipio` em batch (`WHERE cnpj_basico = ANY($1)`).
  - Classificar provedor como **Local** (sede.cidade == cidade analisada) ou **Externo**.
  - Agregar: `share_local_pct`, `share_externo_pct`, `n_local`, `n_externo`.

UI (`AnatelCruzamentoPage.tsx` — TabsContent share):
- Manter tabela atual (município, UF, acessos, nº provedores, líder, share líder).
- Adicionar coluna **"Força Local"** = `share_local_pct` com mini-bar verde.
- Ao clicar numa linha, abrir um drawer/expand com gráfico **donut 100%** (recharts `PieChart`) "Local vs. Externo" + lista dos provedores classificados.

---

### 4. Estilo & UI

- Manter dark (`zinc-950`/`zinc-900`) + acento verde-neon (`emerald-400`).
- Substituir `<pre>` por componentes `<Card>` shadcn já existentes.
- Tabelas mantêm o estilo atual (`text-xs`, sticky header, hover `zinc-800/40`).
- Badges via `Badge` de shadcn com variants (custom classes para âmbar/vermelho).
- Tipografia: títulos `text-sm font-semibold text-zinc-200`, valores `text-2xl font-bold tabular-nums`.

---

### Arquivos afetados

```text
src/pages/equity-brain/AnatelCruzamentoPage.tsx   (refatoração grande)
src/components/equity-brain/CompanyProfileCard.tsx (NOVO — perfil consolidado)
src/components/equity-brain/MarketShareDrawer.tsx  (NOVO — donut Local vs Externo)
src/lib/anatelInsights.ts                          (NOVO — agregadores client-side)
supabase/functions/anatel-query/index.ts           (remover top_growth, estender share)
```

### Detalhes técnicos

- Limites de porte (constante em `anatelInsights.ts`):
  ```ts
  export const PORTE_LIMITS = { ME: 360_000, EPP: 4_800_000 } as const;
  ```
- Helpers: `parseAcessos(s: string): number` (regex), `aggregateAnatel(rows)` retornando `{totalAcessos, tecnologias, velocidadePredominante, cidades, ufs}`.
- Edge function continua sob auth admin/advisor.
- Sem migrations — tudo client-side e edge function.

Após aprovação, aplico a refatoração e re-deploy do edge function.