## Objetivo
Hoje o Analytics mistura tudo num só balde. Você quer responder:
1. Esse acesso é de alguém **totalmente novo** (1ª vez no site) ou **recorrente** (já tinha vindo antes)?
2. De **onde** vem cada um desses dois grupos (UTM/referrer)?
3. Quantos dos novos viraram **usuário logado** vs ficaram anônimos?

Hoje o tracking só guarda `session_key` em `sessionStorage` (zera ao fechar a aba) e `user_id` (só quando logado). Falta um identificador **persistente de visitante** (cookie/localStorage) que sobreviva entre sessões para diferenciar “novo” de “recorrente”.

---

## O que vai mudar

### 1. Novo identificador persistente: `visitor_id`
- Salvo em `localStorage` (`analytics_visitor_id`), UUID, gerado na 1ª visita e reutilizado para sempre (até o usuário limpar cookies).
- Enviado em todo evento + sessão.
- Respeita opt-out (DNT / consentimento) — se o usuário recusou cookies, não cria.

### 2. Marcação “novo vs recorrente” no banco
- Coluna nova `visitor_id` em `analytics_sessions` e `analytics_events`.
- Coluna nova `is_new_visitor boolean` em `analytics_sessions`, calculada na edge function `track-event`: se já existe alguma sessão anterior com aquele `visitor_id` → `false`; senão → `true`.
- Coluna nova `is_first_session_ever boolean` (bookkeeping para relatórios futuros).

### 3. Novas views (admin-only, security_invoker)
- `v_analytics_visitors_daily`: por dia → `new_visitors`, `returning_visitors`, `total_visitors`, `signups`, `leads`.
- `v_analytics_sources_split`: para cada fonte (utm_source/referrer) → `sessions_new`, `sessions_returning`, `signups_new`, `signups_returning`, `leads_new`, `leads_returning`.
- `v_analytics_new_vs_returning`: resumo 7/30/90d com %, taxa de retorno, taxa de conversão de novos em signup.
- `v_analytics_anon_vs_auth`: % de visitantes novos que viraram logados (`user_id` preenchido em alguma sessão posterior do mesmo `visitor_id`).

### 4. UI — `AdminAnalytics`
Adicionar uma nova seção **“Visitantes — Novos vs Recorrentes”** logo após o card de KPIs:
- Card grande com 3 números: **Novos** / **Recorrentes** / **% retorno** (período selecionável 7/30/90d).
- Mini-chart de área empilhada (novos vs recorrentes por dia).
- Tabela **“Origem do tráfego (split)”**: cada linha = fonte, colunas = sessões novas, sessões recorrentes, signups novos, leads novos. Permite ver quais canais trazem cara nova vs reciclam audiência.
- Card **“Conversão do visitante novo”**: dos novos visitantes do período, quantos % fizeram signup, quantos viraram lead.

Hooks novos em `useAdminAnalytics.ts`:
- `visitorsDaily`, `sourcesSplit`, `newVsReturning`, `anonVsAuth`.

### 5. Coexistência com dados antigos
- Eventos sem `visitor_id` (histórico) entram como `is_new_visitor = null` e ficam fora do split — aparece só uma nota “dados a partir de DD/MM” nos novos cards. Sem migração destrutiva.

---

## Detalhes técnicos

**Arquivos**
- `src/lib/analytics.ts`: adicionar `getVisitorId()` (localStorage, respeita opt-out), incluir `visitor_id` no body do evento.
- `supabase/functions/track-event/index.ts`: aceitar `visitor_id`, calcular `is_new_visitor` via lookup em `analytics_sessions` antes do upsert.
- Migração SQL: 
  - `ALTER TABLE analytics_sessions ADD COLUMN visitor_id text, ADD COLUMN is_new_visitor boolean;`
  - `ALTER TABLE analytics_events ADD COLUMN visitor_id text;`
  - índices em `(visitor_id)` nas duas.
  - Criar as 4 views novas + grants admin-only.
- `src/hooks/useAdminAnalytics.ts`: 4 queries novas.
- `src/pages/admin/AdminAnalytics.tsx`: nova seção “Visitantes — Novos vs Recorrentes” + tabela de fontes splittada.
- `src/components/admin/analytics/InfoHint.tsx` (existente): tooltips dos novos cards em `src/lib/analyticsTooltips.ts`.

**Definição operacional usada nas views**
- *Visitante novo* = `analytics_sessions.is_new_visitor = true` no período.
- *Visitante recorrente* = `is_new_visitor = false` no período.
- *Visitante único* = `count(distinct visitor_id)`.
- *Sessão* = `analytics_sessions` (1 por aba).
- *Logado* = `user_id is not null` em qualquer sessão do mesmo `visitor_id`.

**LGPD / consentimento**: o `visitor_id` só é gerado/lido quando `isAnalyticsOptedOut() === false`. Se o usuário recusar cookies depois, o id existente fica órfão (não é apagado retroativamente, mas para de ser enviado).

---

## Resultado esperado
No `/admin/analytics` você consegue dizer, para qualquer janela:
- “Hoje recebi **X** pessoas, **Y%** nunca tinham vindo antes.”
- “Dos novos, **Z%** vieram do Instagram, **W%** orgânico, **V%** direto.”
- “Dos novos do mês, **N%** se cadastraram e **M%** viraram lead.”
