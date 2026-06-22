# Equity Planner — Redesign + Aprofundamento por Iniciativa + Plano Tático Anual (E1A)

## Problemas atuais
1. **Visual** — várias abas (Plano, Compradores, Progresso, Raio-X) ainda têm `text-muted-foreground` em fundo escuro renderizando quase preto/ilegível. Cards inconsistentes, falta hierarquia premium.
2. **Cards de Sprint são estáticos** — só mostram título + badges, sem profundidade nem interação.
3. **Faltam dados qualitativos por iniciativa** — IA gera plano genérico porque não tem respostas específicas do dono sobre cada alavanca.
4. **Não existe Plano Tático Anual (E1A)** — o "Plano em Sprints" hoje é só uma lista de iniciativas, não um cronograma mês a mês acionável.

---

## Parte 1 — Redesign visual (toda a página `/equity-planner/:id`)

Auditoria completa de `EquityPlannerAssessment.tsx` + `EquityPlannerReport.tsx` substituindo cores que não respeitam o tema escuro:

- Trocar `text-muted-foreground` por `text-bone/70` ou `text-white/65` em todos os cards `!bg-slate-900/60`.
- Cards: padronizar em `!bg-graphite/40 backdrop-blur-md border-white/10` com hover `border-volt/40`.
- Tabs: pill style com indicador volt; números (IPE, valuation) em `text-volt` com `tabular-nums` e tamanho aumentado.
- KPIs do topo (Valor atual / Potencial / Hoje / Δ Lucro / Δ Crescimento / Prêmio): refazer como **6 cards bento-grid** com ícone + label uppercase tracking-wider + valor grande em volt + sublabel em white/50.
- Raio-X: fundo `bg-carbon` + radar em `stroke-volt fill-volt/30`, eixos em `text-white/70`.
- Tabelas: cabeçalho `bg-volt/5 text-volt uppercase text-[10px] tracking-widest`, linhas com `border-white/5`.
- Empty states: ilustração + CTA volt em vez de "— sem iniciativas —".
- Aplicar contraste WCAG AA em tudo (mínimo `text-white/65` em fundo escuro).

## Parte 2 — Cards de iniciativa clicáveis com Q&A profundo

### UI
Cada card no grid de Sprints vira clicável → abre `Dialog` (`InitiativeDeepDiveModal`) com:
- Header: título da iniciativa + dimensão alvo + badges (Δ IPE, Δ Valor, esforço, prazo).
- Bloco "Diagnóstico atual" (gerado pela IA): 3-5 bullets do porquê essa iniciativa importa para a empresa específica.
- **Checklist de 6-10 perguntas** específicas àquela iniciativa (geradas pela IA no momento que abre, com base no contexto da empresa + dimensão + arquétipo). Ex.: para "Reduzir dependência do dono" → "Quais decisões só você toma hoje?", "Quem é seu #2?", "Quantas horas/semana você opera o negócio?", etc.
- Inputs: `Textarea` por pergunta + autosave a cada 2s.
- Footer: botão **"Salvar e gerar prompt de aceleração"** → IA compila respostas em um **prompt curado** focado em transformar a empresa em "Fábrica de Equity" para aquela alavanca específica.
- Indicador de progresso na card do sprint: "3/8 perguntas respondidas" + ring volt quando completo.

### Backend
Nova migration:
```sql
create table public.equity_initiative_deepdive (
  id uuid primary key default gen_random_uuid(),
  initiative_id uuid not null references public.equity_initiatives(id) on delete cascade,
  assessment_id uuid not null references public.equity_assessments(id) on delete cascade,
  questions jsonb not null default '[]'::jsonb,        -- [{id, pergunta, contexto}]
  answers jsonb not null default '{}'::jsonb,          -- { question_id: resposta }
  compiled_prompt text,                                -- prompt final gerado pela IA
  status text not null default 'pendente',             -- pendente | em_andamento | concluida
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- + GRANTs (authenticated CRUD, service_role ALL) + RLS via assessment ownership
-- + trigger updated_at
-- + unique(initiative_id)
```

Duas edge functions novas:
- `equity-deepdive-questions` — POST `{ initiative_id }` → gera 6-10 perguntas via `google/gemini-3-flash-preview` usando contexto da empresa + iniciativa, salva em `questions`.
- `equity-deepdive-compile` — POST `{ initiative_id }` → lê respostas, chama `google/gemini-2.5-pro` para gerar `compiled_prompt` focado em "como transformar isto numa fábrica de equity". Marca `status=concluida`.

## Parte 3 — Plano Tático Anual (E1A — "Equity em 1 Ano")

### UI
Nova aba **"Plano Tático E1A"** após "Plano de Sprints". Estado inicial: card grande com:
- Título "Equity em 1 Ano — seu plano mês a mês"
- Texto: "Você completou X/Y diagnósticos profundos. Gere o plano tático que vai transformar sua empresa em ativo vendável."
- Botão grande volt **"Construir Plano Tático Anual"** (desabilitado até pelo menos 50% das iniciativas terem `compiled_prompt`).

Após gerar:
- **Timeline visual 12 meses** (Jan→Dez) com swim lanes por dimensão.
- Cada mês: 2-4 ações concretas com responsável sugerido, KPI de saída, dependências, link para a iniciativa de origem.
- Cards expandíveis por mês mostrando: objetivo, entregáveis, métricas, riscos, racional IA.
- Botão "Exportar plano (PDF)" + "Re-gerar".

### Backend
Migration:
```sql
create table public.equity_annual_plan (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.equity_assessments(id) on delete cascade,
  company_id uuid not null,
  plan_data jsonb not null,    -- { meses: [{ mes, tema, acoes:[...], kpis, riscos }], resumo, north_star }
  source_prompts jsonb,        -- array dos compiled_prompts usados
  model_used text,
  generated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
-- + GRANTs + RLS + unique(assessment_id) para sempre ter o último
```

Edge function `equity-annual-plan-build`:
- Lê todos os `compiled_prompt` de `equity_initiative_deepdive` daquele assessment.
- Lê dimensões, valuation, buyer map, arquétipo.
- Chama `google/gemini-2.5-pro` com `Output.object` (schema 12 meses × ações estruturadas).
- Salva em `equity_annual_plan` e retorna.

## Detalhes técnicos

**Arquivos novos:**
- `src/components/equity-planner/InitiativeDeepDiveModal.tsx`
- `src/components/equity-planner/AnnualPlanTimeline.tsx`
- `supabase/functions/equity-deepdive-questions/index.ts`
- `supabase/functions/equity-deepdive-compile/index.ts`
- `supabase/functions/equity-annual-plan-build/index.ts`

**Arquivos editados:**
- `src/pages/EquityPlannerAssessment.tsx` — cards clicáveis, nova aba "Plano Tático E1A", redesign visual completo.
- `src/pages/EquityPlannerReport.tsx` — incluir resumo do plano anual no PDF.
- `src/lib/equity-planner/constants.ts` — labels novos.

**Modelos IA:**
- Perguntas profundas: `google/gemini-3-flash-preview` (rápido, baixo custo).
- Compilação de prompt + Plano Anual: `google/gemini-2.5-pro` (raciocínio + qualidade).

**Migrations:** 2 (deepdive + annual_plan), com GRANTs + RLS + triggers já no padrão do projeto.

## Ordem de implementação
1. Migrations das duas tabelas.
2. Redesign visual de `EquityPlannerAssessment.tsx` (cores, contraste, KPIs bento).
3. Edge functions deepdive (questions + compile).
4. `InitiativeDeepDiveModal` + ligação ao card do sprint com progresso visual.
5. Edge function annual-plan-build + aba "Plano Tático E1A" com timeline.
6. Botão "Exportar plano anual" no relatório PDF.
