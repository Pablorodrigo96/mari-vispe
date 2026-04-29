## Mari Brain — IA Global Especialista em M&A + Plataforma

Hoje a "Mari" é um copiloto contextual restrito a um mandato/buyer. Vou expandi-la para uma **IA global de plataforma** — sempre acessível, com base de conhecimento curada (premissas, fontes de dados, indicadores, playbooks) **+** contexto vivo do usuário (matches, pipeline, mandatos, metas) **+** expertise sênior em M&A.

### O que ela vai saber responder

1. **Plataforma** — "onde vejo X?", "como funciona o score Z?", "por que esse buyer apareceu como match?", "como subir um mandato?", "o que preencher para o teaser ficar pronto?".
2. **Premissas e fórmulas** — Equity Score, True Value vs Estimated vs Potential, percentis Hot/Warm do Match Inbox, SLA do pipeline, gating de disclosure, regras de blind teaser.
3. **Dados** — qual tabela/view alimenta cada KPI, o que precisa ser preenchido para o número aparecer, o que significa cada coluna.
4. **Interpretação** — leitura de gráficos (funil, drift v1↔v2, market waves, seller intent, equity gap, partnership performance, portfolio potential).
5. **Operação de deal (M&A sênior)** — como acelerar, como destravar negociação parada, NDA/IOI/LOI, due diligence, working capital adjustment, earn-out, vendor financing, objeções comuns, ranges de múltiplos por setor.
6. **Metas** — diagnóstico de pipeline do advisor logado vs metas, onde focar essa semana, quais matches priorizar, quais oportunidades estão congeladas.

### Arquitetura

```text
┌─────────────────────────────────────────────────────┐
│  MariBrainDrawer (global, atalho ⌘K / botão flutuante)
│  - Chat com markdown + streaming                    │
│  - Sugestões rápidas contextuais à rota atual       │
│  - Histórico persistente por usuário                 │
└──────────────────────┬──────────────────────────────┘
                       │ supabase.functions.invoke("mari-brain")
                       ▼
┌─────────────────────────────────────────────────────┐
│  Edge Function: mari-brain                          │
│  1. Carrega knowledge base (curada, versionada)     │
│  2. Carrega contexto do usuário (snapshot ao vivo): │
│     - métricas pipeline, mandatos, matches hot,     │
│       deals congelados, metas vs realizado           │
│  3. Carrega contexto da rota (mandate/buyer/hub)    │
│  4. Carrega histórico (últimas 20 mensagens)        │
│  5. Tool calling: search_kb, get_mandate, get_buyer,│
│     get_pipeline_snapshot, suggest_next_action      │
│  6. Lovable AI Gateway (gemini-2.5-pro p/ raciocínio,│
│     com streaming SSE)                              │
└─────────────────────────────────────────────────────┘
```

### Base de conhecimento (curada, não vetorizada nesta fase)

Arquivos markdown em `supabase/functions/mari-brain/kb/` carregados no system prompt. Estrutura:

- `01-plataforma.md` — visão geral, navegação, quem faz o quê.
- `02-premissas-scores.md` — Equity Score, True Value, percentis match, SLA.
- `03-fontes-de-dados.md` — tabela por KPI, o que preencher para aparecer.
- `04-graficos-interpretacao.md` — leitura de funil, drift, waves, gap.
- `05-pipeline-operacao.md` — etapas, transições, alertas SLA, histórico.
- `06-mna-playbook.md` — NDA→IOI→LOI→DD→SPA, objeções, ranges múltiplos PME Brasil.
- `07-aceleracao-deal.md` — táticas para destravar, scripts, gatilhos.
- `08-metas-e-prioridades.md` — como ler o dashboard, metas semanais.

Versionado em git → fácil de evoluir. Tamanho total alvo: ~30–40k tokens (cabe no contexto do gemini-2.5-pro).

### Schema (nova tabela de chat global)

```sql
create table public.mari_brain_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text,
  route text,           -- onde a conversa começou
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table public.mari_brain_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.mari_brain_threads(id) on delete cascade,
  user_id uuid not null,
  role text not null check (role in ('user','assistant','system')),
  content text not null,
  tool_calls jsonb,
  created_at timestamptz default now()
);

-- RLS: dono lê/escreve as próprias threads e mensagens. Admin lê tudo.
```

### UX

- **Botão flutuante Volt #D9F564** no canto inferior direito (todas as rotas autenticadas do EB), com ícone Sparkles e badge "IA".
- **Atalho ⌘K / Ctrl+K** abre o drawer.
- Drawer ocupa lateral direita (480px), contém:
  - Header: "Mari Brain — Especialista em M&A"
  - Lista de threads (sidebar interna colapsável)
  - Stream de mensagens com markdown (`react-markdown` já no projeto? confirmar; se não, adicionar)
  - Sugestões rápidas contextuais à rota:
    - Em `/equity-brain/match-inbox`: "Quais matches priorizar hoje?"
    - Em `/equity-brain/crm/mandate/:id`: "Por que esse deal está parado?", "Próxima ação?"
    - Em `/equity-brain/dashboard`: "Como bater minha meta da semana?"
- Respostas com botões de ação inline quando aplicável (ex: "Abrir mandato X", "Mover para etapa Y").

### Tool calling (contexto vivo)

A edge function expõe ao modelo:
- `get_user_pipeline_snapshot()` — KPIs, contagem por etapa, deals congelados (>SLA).
- `get_mandate(id)` — dados + atividades recentes + matches.
- `get_buyer(id)` — perfil + matches + tese.
- `get_top_matches(limit)` — top da fila do advisor.
- `search_knowledge_base(query)` — keyword search nos .md curados.

### Modelos

- **Default:** `google/gemini-2.5-pro` com `reasoning.effort: "medium"` — melhor para raciocínio M&A + contexto longo.
- **Fallback rápido (chats curtos):** `google/gemini-3-flash-preview`.
- Streaming SSE token a token.

### Detalhes técnicos

- Reaproveitar padrão SSE do guia `connecting-to-ai-models`.
- `verify_jwt = true` (usa auth.uid para RLS e personalização).
- Tratar 429 (rate limit) e 402 (créditos) com toast claro.
- Adicionar `react-markdown` se ainda não estiver instalado.
- Persistir thread + mensagens; permitir usuário criar nova thread, renomear, deletar.
- Snapshot de contexto vivo é regenerado a cada mensagem (não cacheado) — garante respostas atualizadas.

### Memória de projeto

Salvar `mem://features/mari-brain-global` documentando: arquitetura, KB versionada, tool calls disponíveis, atalhos.

### Arquivos

**Criar:**
- `supabase/functions/mari-brain/index.ts`
- `supabase/functions/mari-brain/kb/01-plataforma.md` … `08-metas-e-prioridades.md`
- `supabase/migrations/<ts>_mari_brain_threads.sql`
- `src/components/equity-brain/mari/MariBrainDrawer.tsx`
- `src/components/equity-brain/mari/MariBrainFab.tsx`
- `src/components/equity-brain/mari/MariThreadList.tsx`
- `src/components/equity-brain/mari/MariMessageBubble.tsx`
- `src/hooks/useMariBrain.ts` (streaming + threads)
- `src/hooks/useMariContextSuggestions.ts` (sugestões por rota)
- `.lovable/memory/features/mari-brain-global.md`

**Editar:**
- `src/components/equity-brain/EquityBrainLayout.tsx` (montar FAB + drawer + atalho)
- `src/integrations/supabase/types.ts` (auto)
- `.lovable/memory/index.md` (registrar nova memória)
- `package.json` se precisar `react-markdown`

### Fora de escopo (próximas fases possíveis)

- Vetorização (pgvector) da KB para search semântico — só vale quando KB > 100k tokens.
- Voice mode.
- Auto-execução de ações (hoje só sugere, não muda dado).
