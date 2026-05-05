## Objetivo
Conectar uma segunda base Postgres/Supabase (dados públicos da **Anatel**) ao projeto, complementar à base nacional da Receita Federal já em uso, e gerar insights cruzando ISP/telecom × empresa (CNPJ).

## Contexto
Já existe `EXTERNAL_DB_URL` (RFB) consumida pela edge `national-search` e `sync-companies-from-cnpj`. Já há fluxo ISP-Anatel **interno** (memo `isp-anatel-integration` — views `eb_isp_*`, página `/equity-brain/isp/mercado`), mas hoje os dados são importados manualmente. Vamos passar a ler **direto da base externa Anatel** via Supabase secundário.

## Etapas

### 1. Abrir secret `ANATEL_DB_URL`
Você cola a connection string completa do Supabase Anatel no formato:
```
postgresql://postgres.<ref>:<senha>@aws-1-<região>.pooler.supabase.com:5432/postgres
```
(Pooler **Transaction**, porta 5432 — IPv4 compatível com Edge Functions).

### 2. Edge Function `anatel-query` (read-only)
- `supabase/functions/anatel-query/index.ts`
- Auth: admin/advisor (mesmo padrão de `enrich-company-via-rfb`)
- Body: `{ action: "by_cnpj" | "by_uf" | "by_municipio" | "stats", params: {...} }`
- Conexão via deno-postgres usando `ANATEL_DB_URL`
- Whitelist de actions/queries parametrizadas (sem SQL livre)
- Diagnóstico de erro (PG code, host) no response

### 3. Edge Function `crossref-rfb-anatel`
Cruza CNPJ × ISP Anatel e retorna insight unificado:
- Pega CNPJ → consulta RFB (razão, CNAE, porte, capital, sócios)
- Mesmo CNPJ → consulta Anatel (autorização SCM, acessos, municípios atendidos, tecnologias)
- Calcula derivados: nº municípios, nº acessos totais, market share estimado no município principal, crescimento (se a base tiver histórico)
- Salva em cache `equity_brain.companies.raw_data.anatel` para reuso

### 4. Hook + UI
- `src/hooks/useAnatelData.ts` — wrapper React Query
- Card "Dados Anatel" no `/equity-brain/deal/:id` (coluna vendedor) quando empresa for ISP
- Enriquecimento automático em `/equity-brain/isp/mercado` (substitui import manual quando disponível)

### 5. Job de sincronização (opcional, fase 2)
Edge `sync-anatel-snapshot` agenda diário (cron) que materializa stats agregados em `equity_brain.eb_isp_*` (já existem). Mantém UI atual funcionando, só troca a fonte.

## Detalhes técnicos

**Tabelas Anatel esperadas** (precisamos confirmar com você os nomes reais na sua base):
- Autorizadas SCM (CNPJ, razão, UF, município, tecnologia)
- Acessos por município/tecnologia/prestadora
- Histórico mensal (se houver)

**Perguntas antes de codar:**
1. Quais são as tabelas/views principais nesse Supabase Anatel? (me mande nome de 2-3 tabelas-chave)
2. Tem coluna CNPJ normalizada (14 dígitos sem máscara) pra fazer JOIN com RFB?
3. Os dados são snapshot único ou tem série temporal mensal?

## Entregáveis
- Secret `ANATEL_DB_URL` configurada
- 2 edge functions: `anatel-query`, `crossref-rfb-anatel`
- 1 hook `useAnatelData`
- Card "Anatel" no Deal View
- Memo atualizado em `mem://integrations/national-database-integration`

**Aprove o plano e o campo de secret abre na sequência pra você colar a connection string.**
