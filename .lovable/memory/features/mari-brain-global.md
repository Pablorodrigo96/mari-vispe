---
name: Mari Brain Global IA
description: IA assistente global de M&A + plataforma com KB curada, contexto vivo, streaming e atalho ⌘K em todo Equity Brain
type: feature
---

# Mari Brain — IA Global

## Arquitetura
- **Edge function**: `supabase/functions/mari-brain/index.ts` (streaming SSE, model `google/gemini-2.5-pro`)
- **KB versionada em git**: `supabase/functions/mari-brain/kb/01-08-*.md` (carregada por `Deno.readTextFile` com cache em memória após cold start)
- **Tabelas**: `public.mari_brain_threads` + `public.mari_brain_messages` (RLS por user_id, admin lê tudo)
- **Auth**: validada via `getClaims` em runtime; `verify_jwt` default

## UI
- `MariBrainFab` montado em `EquityBrainLayout` — FAB Volt #D9F564 fixo bottom-right
- Atalho global **⌘K / Ctrl+K** abre/fecha drawer
- `MariBrainDrawer` (Sheet shadcn, 520px) com lista de threads, sugestões contextuais por rota, markdown via `react-markdown`, streaming token a token
- Sugestões dinâmicas em `useMariContextSuggestions.ts` por rota (match-inbox, pipeline, mandate/:id, buyer/:id, dashboard, default)

## Contexto vivo (regenerado a cada msg)
- Pipeline snapshot do user (mandates por etapa)
- Top 5 matches enriquecidos
- Entidade aberta (mandate ou buyer) se rota for 360
- Histórico das últimas 20 msgs da thread

## Knowledge base (autoritativa)
1. Plataforma (rotas, atores, "onde está cada coisa")
2. Premissas & scores (Equity, True/Estimated/Potential, percentis Hot/Warm, SLA, adaptive loop, disclosure)
3. Fontes de dados (KPI ↔ tabela ↔ campos obrigatórios)
4. Interpretação de gráficos (funil, SHAP, drift, waves, seller intent, equity gap, StageTimeBadge)
5. Pipeline & operação (etapas padrão, transições, alertas, atividades, imports)
6. M&A playbook (NDA→IOI→LOI→DD→SPA, múltiplos por setor PME Brasil, earn-out, WCA, vendor financing)
7. Aceleração de deal (diagnóstico de gargalo, scripts prontos para reativar/destravar/quebrar resistência, gatilhos)
8. Metas e prioridades (4 níveis de priorização, indicadores pessoais, alertas)

## Persistência
- Cada mensagem (user e assistant) salva em `mari_brain_messages`
- `mari_brain_threads.updated_at` atualizado ao final de cada resposta
- Frontend: `useMariBrain` hook gerencia threads, ativeThread, streaming, abort

## Erros tratados
- 429 → "Rate limit"
- 402 → "Sem créditos no AI Gateway"
- AbortController para parar geração mid-stream

## Para evoluir
- Vetorização (pgvector) quando KB > 100k tokens
- Tool calling (search_kb, get_mandate detail) — hoje contexto vivo é estático
- Voice mode
- Auto-execução de ações sugeridas (mover stage, etc)
