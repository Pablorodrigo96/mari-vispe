## Bloco 7 — Busca semântica de notas (pgvector)

Bloco 6 (tags hierárquicas) entregue. Próximo: dar busca semântica nas notas do Núcleo de Conhecimento usando pgvector + Gemini `text-embedding-004` (mesma stack já usada em `company_signals.embedding` e `buyers.embedding`). Permite achar "notas parecidas" e busca por significado (não só palavra-chave).

Reusa infra existente — sem novas dependências.

---

### 1. Schema — embedding na nota

Migration enxuta em `equity_brain.entity_notes`:

- `embedding vector(768)` — nullable (Gemini text-embedding-004, mesma dimensão já usada no projeto).
- `embedding_computed_at timestamptz` — quando foi gerado.
- `embedding_text_hash text` — sha256 do `title || body_md` no momento do embed (pra detectar drift e re-enfileirar).
- Index HNSW `entity_notes_embedding_hnsw USING hnsw (embedding vector_cosine_ops) WITH (m=16, ef_construction=64)`.

Coluna existente `search_vector tsvector` (BM25 PT-BR) continua intacta — vamos **combinar** os dois sinais.

---

### 2. Trigger de enfileiramento

Padrão idêntico ao `embed-signal` que já existe:

- Função `equity_brain.enqueue_note_embed()`: ao INSERT ou UPDATE de `title`/`body_md`, se `embedding IS NULL` **ou** `embedding_text_hash != novo_hash`, faz `NOTIFY note.embed_pending` com payload `{id}`.
- Trigger `entity_notes_embed_enqueue AFTER INSERT OR UPDATE OF title, body_md`.

Sem fila persistente — listener da edge function consome on-demand igual signals.

---

### 3. Edge function `embed-note`

Nova função `supabase/functions/embed-note/index.ts`. Espelha `embed-signal`:

- POST `{ note_ids?: uuid[], limit?: int=20 }` — se sem `note_ids`, busca `WHERE embedding IS NULL OR embedding_text_hash != md5(title||body_md)` ordenado por `updated_at desc`.
- Pra cada nota: `text = (title||'') + '\n\n' + body_md` truncado em 8000 chars.
- Chama Lovable AI Gateway: `model: google/gemini-embedding-001` (ou `text-embedding-004` — confirmar disponibilidade; já temos secret `LOVABLE_API_KEY`).
- UPDATE nota com `embedding`, `embedding_computed_at=now()`, `embedding_text_hash=sha256(text)`.
- Retorna `{ processed, skipped, errors }`.

Cron job (`supabase/config.toml` ou via pg_cron RPC já existente no projeto): roda a cada 10min com `limit=50`. Backfill manual pra notas legadas via 1 chamada inicial sem `limit`.

`verify_jwt = true` (chamada interna por cron com service role).

---

### 4. RPC `eb_notes_similar`

```sql
public.eb_notes_similar(
  p_note_id uuid,
  p_limit int default 10,
  p_min_similarity float default 0.55
) RETURNS TABLE (... eb_entity_notes shape, similarity float)
```

- SECURITY INVOKER (passa pela RLS da view).
- `SELECT ... 1 - (n.embedding <=> base.embedding) AS similarity FROM entity_notes n, entity_notes base WHERE base.id=p_note_id AND n.id <> p_note_id AND n.embedding IS NOT NULL ORDER BY n.embedding <=> base.embedding LIMIT p_limit`.
- Filtra por `similarity >= p_min_similarity`.

### 5. RPC `eb_notes_search_hybrid`

Busca por texto livre que combina BM25 + semântica:

```sql
public.eb_notes_search_hybrid(
  p_query text,
  p_entity_type note_entity_type default null,
  p_limit int default 20
)
```

- Embed do `p_query` é feito client-side via edge function `embed-query` (nova, leve, retorna `vector(768)` JSON). Ou: dentro da própria RPC chamamos `net.http_post` pra `embed-query` — preferimos client-side pra simplificar.
- RPC recebe `p_query_embedding vector(768)` (segundo arg) e:
  - Calcula `bm25 = ts_rank_cd(search_vector, plainto_tsquery('portuguese', p_query))`.
  - Calcula `semantic = 1 - (embedding <=> p_query_embedding)`.
  - `score = 0.4*bm25_normalized + 0.6*semantic` (pesos ajustáveis).
- Ordena por `score desc`, limit.

Assinatura final: `eb_notes_search_hybrid(p_query text, p_query_embedding vector, p_entity_type ..., p_limit ...)`.

---

### 6. UI — "Notas similares" no editor

`<SimilarNotesPanel noteId/>` em `src/components/equity-brain/notes/SimilarNotesPanel.tsx`:

- Aparece em `EntityNotes` quando uma nota está aberta em modo View, abaixo do render do markdown.
- Lista top 5 via `useNotesSimilar(noteId)`.
- Card mostra: chip entity_type, título (link pra entidade-pai), preview 180ch, similarity em %, tags.
- Empty state ("Embedding ainda não calculado" / "Sem notas similares") — discreto.

---

### 7. UI — Busca global de notas

Página `/equity-brain/busca-notas` (`src/pages/equity-brain/NoteSearchPage.tsx`):

- Input search + filtros (entity_type, autor=me/todos, has-tag).
- Ao digitar (debounce 400ms): edge `embed-query` retorna vetor → chama `eb_notes_search_hybrid`.
- Lista resultados com highlight (regex simples dos termos do query) + score visível.
- Item da sidebar EB "Buscar notas" (ícone `Search`) abaixo de "Diário".

Pro escopo desse bloco, manter sidebar enxuta? **Sim** — colocar o item, é descoberta core.

---

### 8. Hooks

- `src/hooks/useNotesSimilar.ts`: `useNotesSimilar(noteId, opts)` → react-query, cache 5min, retorna `{ data: NoteWithSimilarity[] }`.
- `src/hooks/useNoteSearch.ts`: `useNoteSearch(query, filters)` — orquestra embed-query + RPC.

---

### 9. Edge function `embed-query`

`supabase/functions/embed-query/index.ts`:

- POST `{ query: string }` → `{ embedding: number[768] }`.
- Reusa exatamente o cliente Gemini que `embed-signal` usa.
- Cache em memória LRU (50 entries, 10min) por query string pra economizar tokens em digitação rápida.
- `verify_jwt = true` (só usuário logado).

---

### 10. Performance / custos

- Gemini text-embedding-004: ~$0.025/1M tokens. Nota típica = ~200 tokens. 10k notas = $0.05. Desprezível.
- HNSW 768-dim em ~10k notas: <5ms por query, índice ~30MB.
- Re-embed só dispara em UPDATE de `title`/`body_md`, não em `tags`/`pinned`.

---

### 11. Memória

Atualizar `mem://features/entity-notes-kb.md` adicionando "Bloco 7 entregue":
- Coluna `embedding vector(768)` + index HNSW + trigger de enqueue + edge `embed-note` (cron 10min) + `embed-query`.
- RPCs `eb_notes_similar`, `eb_notes_search_hybrid`.
- `<SimilarNotesPanel>` no editor; rota `/equity-brain/busca-notas`.
- Hybrid score: 40% BM25 + 60% semântico.

---

### 12. Fora de escopo

- Embedding de templates / daily auto-summary.
- Cross-entity similarity ("notas parecidas com este buyer").
- Re-ranking com LLM ("agente que lê top-20 e responde").
- Highlight via LLM (highlight é regex simples).
- Configuração de pesos por usuário.

---

### 13. Arquivos

**Migration**
- `entity_notes` ganha `embedding`/`embedding_computed_at`/`embedding_text_hash`.
- Index HNSW.
- Trigger + função de enqueue.
- RPCs `eb_notes_similar` e `eb_notes_search_hybrid`.
- pg_cron job pra `embed-note` (se pg_cron já está habilitado no projeto — confirmar; se não, migration adiciona).

**Edge functions**
- `supabase/functions/embed-note/index.ts`
- `supabase/functions/embed-query/index.ts`

**Novos arquivos**
- `src/components/equity-brain/notes/SimilarNotesPanel.tsx`
- `src/pages/equity-brain/NoteSearchPage.tsx`
- `src/hooks/useNotesSimilar.ts`
- `src/hooks/useNoteSearch.ts`

**Editados**
- `src/components/equity-brain/notes/EntityNotes.tsx` (SimilarNotesPanel em modo View).
- `src/components/equity-brain/EBSidebar.tsx` (item "Buscar notas").
- `src/App.tsx` (rota).
- `.lovable/memory/features/entity-notes-kb.md`.
- `.lovable/plan.md`.

Entrega = 1 migration + 2 edge functions + 4 arquivos UI + 3 edits. Bloco fecha o Núcleo de Conhecimento (Blocos 1–7).
