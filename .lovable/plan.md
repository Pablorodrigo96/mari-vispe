
# Inteligência de Mercado v2 — Plano de implementação

Aba nova `/inteligencia` que entrega análise setorial profissional em 5 lentes (Tamanho, Eficiência, Velocidade, Head-to-head, M&A), via Perplexity, com cache 7 dias **por setor** (não por usuário) e visual Mari.

## Bloco 0 — Decisões já apuradas

**Menu lateral** (`src/components/layout/AppSidebar.tsx`):
- Inserir grupo novo **"Inteligência"** logo após "Visão Geral" e antes de "Marketplace".
- Item único: "Inteligência de Mercado" → `/inteligencia`, badge "NOVO" por 14d.
- Rota oficial: **`/inteligencia`** (curta, sem hífens, alinhada com `/painel`, `/matching`, `/valuation`).

**Detecção de setor do usuário** — cascata:
1. `listings.cnae` da empresa mais recente do user → join em `cnae_to_sector_mapping`.
2. Se buyer puro: `buyer_profiles.categories[0]` → mapeamento heurístico.
3. Fallback: `isp-banda-larga` (90% da base Vispe).

**Tabelas existentes reutilizáveis**:
- `public.sector_market_trends` (painel executivo) → mantemos; **não** substituir. Inteligência de Mercado é separada.
- `public.eb_isp_market_entries` → não reutilizar (é específica ISP/cold).
- Schema `equity_brain` existe → criaremos novas tabelas lá.
- `api_usage_logs` já existe → cobre telemetria de custo.

**Secrets**: `PERPLEXITY_API_KEY` e `LOVABLE_API_KEY` já configurados. Sem add_secret.

## Bloco 1 — Schema

Migration única criando:

- `equity_brain.sector_research` (cache por setor, unique em `setor_slug`, `expires_at` = +7d, `payload_json jsonb`, status/erro/custo/duration).
- `equity_brain.cnae_to_sector_mapping` (PK `cnae`, FK `setor_slug`). Seed 10 CNAEs principais (ISP 61.90-6-01 incluído além de 61.10-8-01, telecom, SaaS, hospital, varejo, energia, banco, logística, educação).
- Índices em `setor_slug` e `expires_at`.
- RLS: SELECT para todo `authenticated`; INSERT/UPDATE/DELETE apenas `admin`/`advisor` via `has_role()`.
- RPC `get_sector_for_user(uid uuid) returns text` (SECURITY DEFINER) implementando a cascata acima — usado pelo hook React.

## Bloco 2 — Edge function `research-sector`

Arquivo: `supabase/functions/research-sector/index.ts` (CORS padrão, sem `verify_jwt` custom).

Fluxo:
1. Valida body com Zod: `{ setor_slug: string, force_refresh?: boolean }`.
2. Lê cache `sector_research` por `setor_slug` válido (`expires_at > now()`); retorna se hit e `!force_refresh`.
3. Chama Perplexity `sonar-pro` direto via `fetch` em `https://api.perplexity.ai/chat/completions` (já temos `PERPLEXITY_API_KEY`), com `temperature=0.2`, `max_tokens=8000`. System prompt = texto completo do framework (5 lentes + regras de qualidade + schema JSON exigido).
4. Parse + validação Zod do payload (schema com 5 painéis + conclusão + limitações + fontes).
5. Upsert em `sector_research` com expires_at = now + 7d, custo, tokens, duração, status.
6. Log em `api_usage_logs` (provider=`perplexity`, feature=`research-sector`, custo_brl/usd).
7. Erros: 429 → retry 1x com backoff 2s; 402 → status `failed` + retorna `{ error:'credits_exhausted' }`; parse fail → status `partial` + persiste o que conseguiu; custo > $5 → log warn.

## Bloco 3 — Identidade visual Mari

Sem CSS variables novas globais — usar tokens Mari já existentes em `src/index.css` / `tailwind.config.ts` (`bg-background`, `bg-card`, `text-foreground`, `accent` = volt, `muted-foreground`).

Mapa de conversão do HTML de referência:
- bg-1/2/3 → `bg-background`, `bg-card`, `bg-muted/40`
- teal/violet → `accent` (volt)
- amber/coral → manter via `text-amber-400` / `text-rose-400` (tailwind direto, OK para alertas semânticos)
- Tipografia: usar a stack atual (Bricolage não é necessária); adicionar `font-mono` (já mapeado) para números/fontes.

## Bloco 4 — Componentes React

Estrutura:
```
src/components/inteligencia/
  InteligenciaHero.tsx
  PainelRanking.tsx
  PainelEficiencia.tsx
  PainelVelocidade.tsx
  PainelHeadToHead.tsx
  PainelMnA.tsx
  ConclusaoSetorial.tsx
  shared/{SectionHeader, CommentaryBox, FootnoteSource, EmptyState, GeneratingState}.tsx

src/pages/Inteligencia.tsx
src/hooks/useUserSector.ts
src/hooks/useSectorResearch.ts
```

Página `/inteligencia`:
- `useUserSector()` (chama RPC `get_sector_for_user`).
- `useSectorResearch(slug)` → React Query: tenta `select` direto na tabela; se vazio, chama edge function via `supabase.functions.invoke('research-sector')`.

Estados:
- Sem cache → `GeneratingState` (botão "Gerar análise" + spinner ~30-60s).
- `partial` → renderiza painéis OK, mostra "em construção" nos faltantes.
- Expirado → renderiza última versão + refresh em background (não bloqueia UI).
- Erro → `EmptyState` com retry.

Anims: stagger fade-in (já temos `framer-motion` no projeto), count-up via `react-countup` se já instalado, senão CSS.

## Bloco 5 — Integração no menu + AppRoutes

- `src/App.tsx`: rota `/inteligencia` dentro do `AppShell` (mesmo nível de `/painel`).
- `AppSidebar.tsx`: inserir grupo `intelligence` entre `overview` e `marketplace`, ícone `Sparkles` ou `Compass`, badge "NOVO" 14d via localStorage `mari_intel_seen_at`.

## Bloco 6 — Seed + cron

- Seed manual via `supabase--curl_edge_functions` para 5 slugs: `isp-banda-larga`, `telecom-movel`, `tech-saas`, `cybersecurity`, `saude-clinicas`.
- Cron diário 04h (via `supabase--insert` com `pg_cron`/`pg_net`, **não** migration — contém keys) que faz `net.http_post` na edge function para cada `sector_research` com `expires_at < now()`, LIMIT 5/dia para conter custo.
- Smoke: validar payload ISP em desktop/mobile, cache hit no 2º acesso.

## Detalhes técnicos relevantes

- **Schema equity_brain** já existe e o front consome via `src/integrations/supabase/types.ts` (autogerado pós-migration).
- Edge function usa `fetch` direto Perplexity (mais barato/simples que ir via Lovable Gateway aqui, e mantém citations no payload — vital pro framework). Mesmo assim, gravamos custo em `api_usage_logs` para o `/admin/analytics`.
- RPC `get_sector_for_user` evita acoplar o front em joins entre `listings` e `cnae_to_sector_mapping`.
- Cache **por setor** (não por usuário): chave única `setor_slug`, beneficia escala (50 ISPs = 1 pesquisa).

## Fora de escopo nesta rodada

- Comparação multi-setor.
- Pesquisa livre (apenas modo automático).
- Exportação PDF.
- Acesso pago/gated — todos autenticados leem.
- Mudanças no `/painel` ou `sector_market_trends`.

## Entregáveis

1. 1 migration (schema + RLS + RPC + seed CNAE).
2. 1 edge function `research-sector`.
3. 1 página + 11 componentes React + 2 hooks.
4. Atualização em `App.tsx` (rota) e `AppSidebar.tsx` (item).
5. 1 cron job via `supabase--insert`.
6. 5 setores seedados.

Pronto pra implementar quando aprovado.
