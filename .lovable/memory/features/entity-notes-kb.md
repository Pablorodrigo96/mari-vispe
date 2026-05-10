---
name: Entity Notes (Knowledge Base)
description: Núcleo de Conhecimento Mari - notas markdown polimórficas em Mandato/Buyer M&A/Empresa
type: feature
---
Fase 6 Bloco 2 entregue. Tabela `equity_brain.entity_notes` (entity_type enum: mandate/buyer_ma/company; entity_id text — buyer/mandate=uuid, company=cnpj) com markdown body_md, tags, pinned, visibility (internal/public), tsvector PT-BR pra Bloco 7. View pública `public.eb_entity_notes` (security_invoker). RLS: advisor+admin escrevem; autor edita próprio; admin apaga qualquer; internal só advisor/admin; public lê quem autenticado.

Hook: `useEntityNotes/useCreateNote/useUpdateNote/useDeleteNote` em `src/hooks/useEntityNotes.ts`.
Componente: `<EntityNotes entityType entityId allowedVisibilities />` em `src/components/equity-brain/notes/EntityNotes.tsx` (editor markdown textarea + react-markdown render, search, pin/unpin, edit, delete).

Integração:
- MandateDetailPage → tab "Notas" (6ª aba)
- BuyerDetailPage → tab "Notas" (allowedVisibilities=['internal'] apenas)
- DealDetailPage (`/equity-brain/empresa/:cnpj`) → tabs Visão/Notas, usa cnpj como entity_id

Seed legacy idempotente migrou `mandates.observacoes`, `buyers.observacoes`+`cautela_motivo`, `companies.raw_data->>'notas'` como 1 nota pinada "internal" tag=['legado'] com autor=primeiro admin.

Próximos blocos: 1 (gaps front×back), 3 (@mentions/backlinks), 4 (Daily Notes /diario), 5 (templates), 6 (tags hierárquicas), 7 (pgvector semantic).

## Bloco 1 entregue (Sync UI↔DB)
- `MandateSummaryCard` (overview do mandato): probability, expected_close_at, valor_operacao, faturamento_vispe, commission_pct, pipeline_stage, regiao + temperature_reason no header.
- `BuyerAlertsBanner` + `BuyerHeaderChips`: pause_signal e cautela_flag/cautela_motivo viram banners; archetype_id/prioridade_global/vertical_principal viram chips no header.
- `CompanyEnrichedHeader` (`/equity-brain/empresa/:cnpj`): qualification_status, embedding_computed_at ("Indexada IA"), linked_buyer_id (link), score_vendabilidade, nivel_maturidade + accordion "Dados estruturados" com CNAE/setor_ma/funcionarios_estimado/faturamento_estimado/ebitda_estimado.
- Hooks `useMandate`/`useBuyerCrm` já liam `select("*")` de eb_*_enriched, então sem alterações de hook. Sem mudança de schema.

## Bloco 3 entregue (Mentions & Backlinks)
- Sintaxe `@mandate:UUID|Label`, `@buyer:UUID|Label`, `@company:CNPJ|Label` no body_md (label opcional, espaços→underscore).
- Tabela `equity_brain.entity_note_mentions` + trigger `sync_note_mentions` re-extrai via regexp_matches em INSERT/UPDATE OF body_md (cascade no delete). `buyer` na sintaxe mapeia pro enum `buyer_ma`. Backfill rodou via UPDATE noop.
- View `public.eb_entity_note_mentions` (security_invoker) com body_preview 240ch + RLS read advisor/admin.
- `src/lib/eb/mentionParser.ts`: extractMentions, renderMentionsToMarkdown (substitui token por `[label](rota "type")`), buildMentionToken, mentionToRoute.
- `<NoteRenderer/>`: ReactMarkdown que detecta links com title='mandate|buyer|company' e renderiza chip colorido (emerald/violet/amber).
- `<MentionAutocomplete/>` + hook `useMentionTrigger`: detecta `@xxx` no caret → popover busca paralela mandates/buyers/companies (top-3 cada) com ↑↓/Enter/Esc.
- `<EntityBacklinksPanel/>`: lista `eb_entity_note_mentions` filtrado por target=entidade, mostra ícone+tipo+título+preview 180ch+data, link pra nota-pai.
- `<EntityNotes/>`: toggle "Notas / Mencionada em" no header, textarea com mention autocomplete e renderização via NoteRenderer.

## Bloco 4 entregue (Daily Notes /diario)
- Enum `equity_brain.note_entity_type` ganhou valor `daily`; UNIQUE parcial `entity_notes_daily_unique (author_id, entity_id) WHERE entity_type='daily'` garante 1 nota/dia/autor. `entity_id` = `YYYY-MM-DD` (local).
- Hooks `src/hooks/useDailyNote.ts`: `useDailyNote(date)`, `useUpsertDailyNote(date)` (select existente → update senão insert, respeita RLS author_id=auth.uid()), `useDailyFeed(date)` (paralelo `crm_activities` created_by=me + `eb_entity_notes` não-daily de hoje + `deals` updated_at hoje), `useDailyStreak()` (últimos 30 dias, contagem consecutiva). Helper `dateKey(Date)`.
- Página `src/pages/equity-brain/DailyDiaryPage.tsx`: rotas `/equity-brain/diario` e `/equity-brain/diario/:date` (App.tsx). Layout 2 colunas (lg:[1fr_360px]): editor à esquerda (autosave debounce 2s, toggle Edit/View, mention autocomplete + NoteRenderer, template default "Prioridades/Calls/Insights" injetado se vazio), 3 FeedCards à direita (Atividades, Notas, Deals).
- Header tem navegação `← / Hoje / →` + Datepicker shadcn (disabled futuro) + badge 🔥 streak. URL sincroniza com data via `navigate(..., {replace:true})`.
- Sidebar EB ganhou item "Diário" (ícone `CalendarDays`) logo abaixo de "Hoje".
