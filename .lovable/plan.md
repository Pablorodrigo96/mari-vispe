## Bloco 3 — @mentions + Backlinks (Knowledge Graph v1)

Com notas funcionando (Bloco 2) e UI alinhada (Bloco 1), agora ligamos o conhecimento: qualquer nota pode citar `@mandato`, `@buyer`, `@empresa` e cada entidade ganha um painel "Mencionada em" que vira a teia do Obsidian-M&A.

---

### 1. Sintaxe e parser

Formato no `body_md`:
```
@mandate:UUID|Nome
@buyer:UUID|Nome
@company:CNPJ|Nome
```
Renderizado como link clicável (`/equity-brain/mandato/:id`, `/equity-brain/buyer/:id`, `/equity-brain/empresa/:cnpj`).

Parser em `src/lib/eb/mentionParser.ts`:
- `extractMentions(body) → Array<{type, ref, label}>`
- `renderMentionsToMarkdown(body)` substitui pelo link MD antes de passar pro `react-markdown`.

---

### 2. Schema — `entity_note_mentions`

Tabela leve em `equity_brain`:
- `note_id uuid` (FK → entity_notes, ON DELETE CASCADE)
- `target_entity_type` (mesmo enum mandate/buyer_ma/company)
- `target_entity_id text`
- `created_at`
- UNIQUE `(note_id, target_entity_type, target_entity_id)`
- Index em `(target_entity_type, target_entity_id)` pra lookup de backlinks

RLS: leitura aberta a advisor/admin (segue visibilidade da nota-pai via view); insert/delete via trigger no `entity_notes` AFTER INSERT/UPDATE/DELETE que re-extrai e re-popula. Zero gravação manual.

View `public.eb_entity_note_mentions` (security_invoker) com join em `eb_entity_notes` pra trazer body_preview, author, updated_at, pinned.

---

### 3. Trigger de sync

Função `equity_brain.sync_note_mentions()`:
- Em `AFTER INSERT/UPDATE OF body_md`: deleta menções antigas da `note_id` e re-insere via regex Postgres (`\@(mandate|buyer|company):([A-Za-z0-9-]+)`).
- `AFTER DELETE`: cascade já cuida.

Sem mais lógica no client — verdade fica no DB.

---

### 4. UI — Editor com autocomplete

`<MentionAutocomplete/>` dentro do textarea do `<EntityNotes/>`:
- Detecta `@` + 2+ chars → popover com busca em 3 fontes via debounce 250ms:
  - `eb_mandates_enriched` por razao_social/codename
  - `eb_buyers_enriched` por nome/cnpj
  - `eb_companies` por razao_social/codename/cnpj
- Insere token `@type:id|label` no texto.
- Limit 8 sugestões total (top-3 por tipo).

Atalho de teclado: ↑/↓ navega, Enter confirma, Esc fecha.

---

### 5. UI — Render de menções

No `<NoteRenderer/>`:
- Antes de `react-markdown`, processa tokens `@type:id|label` → `[label](rota)` + classe especial.
- Tooltip com tipo (cor: mandate=emerald, buyer=violet, company=amber).

---

### 6. UI — Painel Backlinks

Novo componente `<EntityBacklinksPanel entityType entityId/>`:
- Query `eb_entity_note_mentions` filtrando por target=esta entidade
- Lista: ícone do tipo da nota-pai · trecho 120 chars · autor · data · link
- Vazio: hint "Mencione essa entidade em outras notas usando @"

Integração:
- Mandato → nova sub-aba "Conexões" dentro de tab Notas (toggle "Notas / Mencionada em")
- Buyer → idem
- Empresa → idem

Implementação simples: toggle `view: 'notes' | 'backlinks'` no `<EntityNotes/>`.

---

### 7. Memória

Atualizar `mem://features/entity-notes-kb.md` com seção "Bloco 3" e adicionar nova entrada no índice: `[Entity Mentions & Backlinks]`.

---

## Fora de escopo

- Grafo visual D3/force (fase posterior, reusa dados desta tabela)
- @mentions em outros campos (observações, descrições)
- Notificações quando alguém te menciona
- Embeddings/semantic search das menções

---

## Detalhe técnico

- Regex Postgres: `regexp_matches(body_md, '@(mandate|buyer|company):([A-Za-z0-9-]+)(?:\|[^\s]+)?', 'g')` — capturar tipo+id, label opcional não persistida (label vem da entidade no render)
- `target_entity_id text` (UUID pra mandate/buyer, CNPJ pra company), mesmo padrão de `entity_notes`
- Autocomplete usa `useQuery` com `enabled: query.length >= 2`, staleTime 30s
- `<NoteRenderer/>` precisa ser reusado em `<EntityNotes/>` e em `<EntityBacklinksPanel/>` (preview de 120 chars) — extrair se ainda inline
- Sem mudanças nas páginas — toda integração via `<EntityNotes/>` que já é o ponto único
