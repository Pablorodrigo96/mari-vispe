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

## Bloco 5 entregue (Templates de notas)
- Catálogo estático em `src/lib/eb/noteTemplates.ts`: 6 templates (call-discovery, ioi, follow-up, post-mortem, one-on-one, daily-default) com `scope: ('mandate'|'buyer_ma'|'company'|'daily')[]`, ícone Lucide e `body` markdown com placeholders `{{date}}` e `{{entityLabel}}`. Helpers `getTemplatesForScope` e `applyTemplate(tpl, ctx)`.
- `<TemplatePicker scope context onInsert/>` em `src/components/equity-brain/notes/TemplatePicker.tsx`: botão ghost "Template" → Popover + Command (search) lista templates do escopo, callback recebe markdown já com placeholders aplicados.
- Integrado em `<EntityNotes/>` ao lado do input de título (escopo = entityType) e em `DailyDiaryPage` no header do editor (escopo daily, ctx.date = data selecionada). Antigo botão "Inserir template do dia" removido — virou dica textual.
- Sem migrations / sem tabelas — fase 1 puro client-side. Fase 2 futura: `equity_brain.note_templates` para templates customizados.

## Bloco 6 entregue (Tags hierárquicas + página de tag)
- Convenção: tag = lowercase, `/` separa hierarquia (`setor/saas/horizontal`, `estagio/pre-loi`, `prioridade/quente`). Helpers em `src/lib/eb/tagHierarchy.ts`: `normalizeTag`, `tagParts`, `tagNamespace`, `tagAncestors`, `tagSlug`/`unslugTag` (slug usa `__` em vez de `/` na URL), `groupTagsByNamespace`, `tagColors` (paleta fixa: setor=cyan, estagio=amber, tese=violet, prioridade=red, outros=zinc).
- Migration: GIN index `entity_notes_tags_gin` em `equity_brain.entity_notes.tags`. RPCs SECURITY INVOKER `public.eb_notes_by_tag(p_tag, p_include_descendants, p_limit)` e `public.eb_top_tags(p_author, p_days, p_limit)` retornando `(tag, count)`.
- UI: `<TagChip tag size onClick? clickable?/>` (clica → `/equity-brain/tag/:slug`), `<TagAutocomplete value onSelect/>` (chips abaixo do input baseados em `useTopTags('mine', 60)`). EntityNotes normaliza tags no save via `normalizeTag` + dedupe.
- Rota `/equity-brain/tag/:slug` (`src/pages/equity-brain/TagPage.tsx`): tabs Notas / Entidades / Sub-tags. Notas vêm de `eb_notes_by_tag`, entidades agrupam por entity_type com lookup batch em eb_mandates_enriched(razao_social/codename) / eb_buyers_enriched(nome) / eb_companies_enriched(nome_fantasia/razao_social/cnpj). Sub-tags derivam de `useTopTags('mine',365,200)` filtrando prefixo `:tag/`. Toggle "Incluir sub-tags" (default on) + breadcrumb hierárquico clicável.
- Hooks: `src/hooks/useTopTags.ts` (`useTopTags(scope, days, limit)`), `src/hooks/useNotesByTag.ts` (`useNotesByTag(tag, includeDescendants, limit)`).
- Sidebar NÃO ganhou item Tags — descoberta só via click em chip / URL direta.

## Bloco 7 entregue (Busca semântica de notas — pgvector)
- Schema: `equity_brain.entity_notes` ganhou `embedding vector(768)`, `embedding_computed_at`, `embedding_text_hash` (sha256 do `title\n\nbody_md`). Index HNSW `entity_notes_embedding_hnsw` (cosine, m=16, ef_construction=64). View `public.eb_entity_notes` agora expõe `embedding_computed_at` (NÃO o vetor).
- Edge `embed-note` (`/supabase/functions/embed-note/index.ts`): aceita `{ note_ids?, limit? }`; sem `note_ids` pega notas com `embedding IS NULL` ordenadas por `updated_at desc`. Gera embedding via `google/text-embedding-004` no Lovable AI Gateway (text=`title\n\nbody_md`, slice 8000). Auth: admin OR advisor OR service_role OR anon (cron). Reprocessa se hash drifou.
- Edge `embed-query` (`/supabase/functions/embed-query/index.ts`): POST `{ query }` → `{ embedding: number[768] }`. Auth = qualquer usuário autenticado. Cache LRU memória (50 entries, TTL 10min) chaveado por query.toLowerCase().slice(0,500).
- Cron job `embed-note-every-10min` (`*/10 * * * *`) chama `embed-note` com `{ limit: 50 }` via anon key.
- RPCs SECURITY INVOKER: `public.eb_notes_similar(p_note_id, p_limit=10, p_min_similarity=0.55)` retorna shape de eb_entity_notes + `similarity float`; `public.eb_notes_search_hybrid(p_query, p_query_embedding vector, p_entity_type=null, p_limit=20)` combina BM25 normalizado (40%) + similaridade semântica (60%) e retorna `(bm25, semantic, score)`.
- UI: `<SimilarNotesPanel noteId limit=5/>` em `src/components/equity-brain/notes/SimilarNotesPanel.tsx` aparece em cada nota renderizada no EntityNotes (oculto enquanto edita). Mostra título-link, preview 180ch, similarity %, tags. Hide silencioso quando data vazio.
- Página `/equity-brain/busca-notas` (`src/pages/equity-brain/NoteSearchPage.tsx`): input com debounce 400ms, filtro por entity_type (mandato/buyer/empresa/diário/todos), exibe score+semantic %, highlight regex dos termos. Sidebar EB ganhou item "Buscar notas" (ícone Search) abaixo de "Diário".
- Hooks: `src/hooks/useNotesSimilar.ts` (cache 5min) e `src/hooks/useNoteSearch.ts` (orquestra `embed-query` → `eb_notes_search_hybrid`, cache 60s).
