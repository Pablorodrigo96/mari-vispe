## Diagnóstico

- `public.listings` tem **84 anúncios ativos** (10 categorias, 18 UFs).
- `equity_brain.companies` está com **0 registros** — por isso o cockpit (Empresas, Oportunidades, Mapa, Grafo) aparece vazio mesmo após todo o trabalho das fases anteriores.
- Apenas **1 listing tem CNPJ preenchido** (`31.526.112/0001-04`). A `companies` usa `cnpj` como chave natural, então precisamos de uma estratégia para os 83 sem CNPJ.
- Já existe a coluna `companies.has_listing` + `companies.listing_id` — o vínculo está previsto, só não foi populado.

## O que será feito

### 1. Edge function `sync-listings-to-equity-brain`

Nova função (admin-only) que:

1. Lê todas as listings ativas (`status='active'` ou `'pending'`).
2. Para cada uma:
   - Se tem CNPJ → usa o CNPJ real (formato só-dígitos, 14 chars).
   - Se **não** tem CNPJ → gera um CNPJ sintético determinístico no formato `LST` + 11 dígitos derivados do `listing.id` (ex.: `LST00012345678`). Isso permite chave única, vínculo estável e fácil identificação visual de "originado de listing".
3. Faz `UPSERT` em `equity_brain.companies` (`onConflict: cnpj`) preenchendo:
   - `razao_social` ← `title`
   - `nome_fantasia` ← `title`
   - `setor_ma` / `subsetor_ma` ← derivado de `category` via mapa fixo (telecom→telecom, tech→saas, health→saude, education→educacao, services→servicos_b2b, agro→agro, energy→energia, commerce→varejo, food→varejo, construction→industria, industry→industria)
   - `cnae_principal` ← primeiro CNAE do mapa de verticais para a categoria
   - `uf` ← `state`, `municipio` ← `city`
   - `data_abertura` ← `make_date(foundation_year, 1, 1)` quando existir
   - `faturamento_estimado` ← `annual_revenue`
   - `ebitda_estimado` ← `annual_profit` (proxy)
   - `situacao_cadastral` ← `'ATIVA'`
   - `porte` ← derivado do faturamento (ME/EPP/MEDIA/GRANDE)
   - `has_listing = true`, `listing_id = listing.id`
   - `source = 'marketplace_listing'`
   - `raw_data` ← snapshot do listing
4. Retorna `{ inserted, updated, skipped, errors }`.

### 2. Disparo automático em cascata

Após o sync, a função chama (via `supabase.functions.invoke`) na ordem:

1. `compute-signals` com `{ filter: { source: 'marketplace_listing' } }` — gera todos os signals determinísticos, incluindo `intencao_venda_explicita` (peso 50) que toda listing dispara via `has_listing=true`.
2. `calculate-scores` — popula `company_scores` com a versão `v1.0`.
3. `refresh-opportunities` — atualiza `opportunities_ready`.

### 3. Trigger automático em `public.listings`

Migration cria trigger `AFTER INSERT OR UPDATE` em `public.listings` que chama um pequeno wrapper SQL (SECURITY DEFINER) responsável por fazer o UPSERT mínimo em `equity_brain.companies` (apenas vínculo + flag `has_listing`). Assim, daqui pra frente, **todo novo anúncio entra automaticamente no Equity Brain**.

A pipeline pesada (signals/scores/oportunidades) continua sendo disparada por cron / manual, não no trigger — para não bloquear o cadastro do usuário.

### 4. Botão "Sincronizar marketplace" no cockpit

Em `src/pages/equity-brain/DashboardPage.tsx` adicionar um botão (visível só para `admin`/`advisor`) que chama a edge function e mostra o resultado em toast. Útil para reprocessar a qualquer momento.

### 5. Documentação

Atualiza `docs/EQUITY_BRAIN_README.md` explicando:
- A regra `marketplace alimenta o Equity Brain` agora está implementada de fato.
- CNPJs sintéticos `LST...` representam empresas originadas de listings sem CNPJ real e devem ser substituídos quando o usuário preencher o CNPJ.

## Resultado esperado

- **84 empresas** aparecem em `equity_brain.companies` (1 real + 83 sintéticas).
- Cada uma com signal `intencao_venda_explicita` (peso 50) → score alto garantido.
- Cockpit (`/equity-brain`, `/equity-brain/oportunidades`, `/equity-brain/mapa`, `/equity-brain/grafo`) deixa de estar vazio.
- Matches com os ~80 buyers já cadastrados começam a ser gerados pelo `match-batch` quando rodar.

## Arquivos afetados

- **Novo:** `supabase/functions/sync-listings-to-equity-brain/index.ts`
- **Nova migration:** trigger `AFTER INSERT OR UPDATE` em `public.listings` + função SQL auxiliar
- **Editado:** `src/pages/equity-brain/DashboardPage.tsx` (botão de sync)
- **Editado:** `docs/EQUITY_BRAIN_README.md`

## Não faz parte deste passo

- Enriquecimento via base nacional de CNPJs (sócios reais, idades, etc.) — fica para o sync de prospecção fria, fora das listings.
- Substituição automática do CNPJ sintético quando o usuário editar o anúncio e preencher o CNPJ real — pode ser adicionado depois, se necessário.
