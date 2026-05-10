## Bloco 4 — Daily Notes (`/equity-brain/diario`)

Cada advisor ganha uma **nota por dia** que vira o hub matinal: abre, vê o que rolou ontem (atividades, menções, deals que mexeram) e escreve o plano do dia em markdown. Reusa toda a stack do Bloco 2/3 (entity_notes, mentions, NoteRenderer).

---

### 1. Schema — extender `entity_notes`

Adicionar valor `daily` ao enum `entity_type` (mandate/buyer_ma/company/**daily**).

- `entity_id` para daily = `YYYY-MM-DD` (date como text), garante 1 nota por dia por autor via UNIQUE `(author_id, entity_type, entity_id) WHERE entity_type='daily'`.
- `visibility` daily = sempre `internal` (privada do autor). RLS já cobre: autor edita próprio, admin lê tudo.
- Tags livres + suporte a `@mention` herdado (Bloco 3 funciona automático).

Migration: ALTER TYPE + índice UNIQUE parcial + policy extra "Autor lê próprias daily notes" (já coberto pela policy de internal, mas reforça).

---

### 2. Rota e navegação

- Nova rota `/equity-brain/diario` (e `/equity-brain/diario/:date` opcional pra navegar histórico).
- Item no `EBSidebar` "Diário" (ícone `CalendarDays`, posição entre Hoje e CRM).
- Atalho: tecla `g d` ou botão "Abrir diário" no topo de `/equity-brain/hoje`.

---

### 3. Layout da página

Header:
- Data grande (`format(date, "EEEE, dd 'de' MMMM", { locale: ptBR })`)
- Navegador `← ontem · hoje · amanhã →` (limitado a hoje no futuro)
- Datepicker pra pular pra qualquer dia (shadcn calendar)

Corpo em 2 colunas (1 coluna no mobile <440):

**Esquerda (60%) — Editor da nota do dia**
- Reusa `<EntityNotes entityType="daily" entityId={dateStr} />` simplificado: sempre 1 nota (cria automaticamente no primeiro acesso), sem lista, sem pin, sem search.
- Componente novo `<DailyNoteEditor date/>` que faz upsert via `useUpsertDailyNote`.
- Autosave a cada 2s de inatividade (debounce), indicador "Salvo · 14:32".
- Textarea full-height com mention autocomplete (Bloco 3) e renderização toggle View/Edit.

**Direita (40%) — Feed agregado do dia**
Card "Atividades do dia" + Card "Menções minhas" + Card "Deals que mexeram":

a) **Atividades** (`crm_activities` where created_by=me AND date_trunc('day', created_at)=date) — ícone+entidade+tipo+hora, link pra entidade.

b) **Menções a mim** (futuro placeholder — por agora skip, só mostrar mensagem). Alternativa MVP: **notas que criei hoje** (`eb_entity_notes` where author_id=me AND date_trunc('day', created_at)=date AND entity_type≠'daily').

c) **Deals atualizados** (`deals` where updated_at::date=date AND owner_id=me) — codename+stage+probabilidade.

Todos lidos via React Query com `queryKey: ['daily-feed', date, userId]`.

---

### 4. Hook `useDailyNote(date)`

`src/hooks/useDailyNote.ts`:
- `useDailyNote(date)`: SELECT em `eb_entity_notes` filtrando entity_type='daily', entity_id=date, author_id=me. `maybeSingle()`.
- `useUpsertDailyNote()`: INSERT ON CONFLICT DO UPDATE no `entity_notes` direto (RLS permite ao autor).
- `useDailyFeed(date)`: paralelo `crm_activities` + `eb_entity_notes` (não-daily de hoje) + `deals` atualizados.

---

### 5. Página `DailyDiaryPage.tsx`

`src/pages/equity-brain/DailyDiaryPage.tsx`:
- Lê `:date` (default hoje, formato `YYYY-MM-DD`)
- Validação: data não pode ser futura (clamp pra hoje)
- Renderiza `<DailyDiaryHeader/>` + `<DailyNoteEditor/>` + `<DailyFeedColumn/>`
- Empty state se nota não existe ainda: placeholder "Comece o dia escrevendo o que importa…" + botão "Inserir template" (link pro Bloco 5 futuro, por agora insere snippet fixo com seções "Prioridades / Calls / Insights").

---

### 6. Streak gamificado (leve)

No header do `/diario`: badge "🔥 X dias seguidos" calculado client-side via query `eb_entity_notes` últimas 30 daily notes do autor → contagem de dias consecutivos terminando hoje. Stale 5min. Reaproveita visual de Profile Gamification.

---

### 7. Memória

Atualizar `mem://features/entity-notes-kb.md` com seção "Bloco 4 entregue":
- enum `daily` + entity_id=date
- rota `/equity-brain/diario` + sidebar item
- Hook `useDailyNote/useUpsertDailyNote/useDailyFeed`
- Componente `DailyNoteEditor` + `DailyFeedColumn`
- Streak counter

Sem nova entrada no índice — Bloco 4 cabe dentro do mesmo memo do Núcleo de Conhecimento.

---

## Fora de escopo

- Templates pré-prontos parametrizáveis (Bloco 5)
- Notificação de "você não escreveu hoje" via email
- Compartilhar daily com outro advisor (continua privada)
- Exportar diário (PDF/markdown)
- Resumo IA do dia (potencialmente Bloco 8 com Mari)

---

## Detalhe técnico

- `entity_id` como `YYYY-MM-DD` mantém o text genérico atual (sem refactor de tipo).
- UNIQUE parcial: `CREATE UNIQUE INDEX entity_notes_daily_unique ON equity_brain.entity_notes (author_id, entity_id) WHERE entity_type = 'daily';`
- Autosave: `useDebouncedCallback` 2000ms; estado local `dirty` + `lastSavedAt`.
- View `eb_entity_notes` já expõe daily (security_invoker passa pela RLS de internal+autor).
- Datepicker shadcn com `pointer-events-auto` e `disabled={(d) => d > new Date()}`.
- Sem afetar `<EntityNotes/>` existente nas páginas de mandato/buyer/empresa — `DailyNoteEditor` é um wrapper próprio.
