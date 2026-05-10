## Bloco 6 — Tags hierárquicas + página de tag

Bloco 5 (templates) entregue. Próximo: transformar o campo `tags TEXT[]` que já existe em `entity_notes` num **sistema navegável de tags hierárquicas** com namespace (`setor/saas`, `estagio/pre-loi`, `tese/consolidacao`). Tag vira link, gera uma página agregadora em `/equity-brain/tag/:slug` e ganha autocomplete no editor.

Zero migração de schema obrigatória — tags já existem. Toda lógica é **convenção sobre `/`** + views derivadas + UI.

---

### 1. Convenção de tag hierárquica

- Tag = string lowercase, sem espaço, separador `/` para hierarquia.
- Exemplos: `setor/saas`, `setor/saas/horizontal`, `estagio/pre-loi`, `tese/consolidacao-fintech`, `prioridade/quente`.
- Helpers em `src/lib/eb/tagHierarchy.ts`:
  - `normalizeTag(raw)`: lowercase, trim, espaços→`-`, colapsa `//`.
  - `tagParts(tag) → string[]` (split por `/`).
  - `tagAncestors(tag) → string[]` (`setor/saas/horizontal` → `['setor','setor/saas','setor/saas/horizontal']`).
  - `tagSlug(tag) / unslug(slug)`: `/` ↔ `__` para caber em URL.
  - `groupTagsByNamespace(tags)`: agrupa por primeira parte.

---

### 2. Render visual da tag

Componente `<TagChip tag onClick?/>`:
- Exibe `namespace · resto` com namespace em zinc-500 e resto em zinc-200.
- Hover: ring Volt sutil. Click → `navigate('/equity-brain/tag/' + tagSlug(tag))`.
- Usado em `EntityNotes` (substitui o Badge plain atual), `EntityBacklinksPanel`, `TagPage`.

---

### 3. Autocomplete de tag no editor

Hook + componente leve em `EntityNotes`:
- Input atual "tags (separe por vírgula)" ganha `<TagAutocomplete/>` por baixo (popover).
- Sugestões = top 30 tags mais usadas do autor + tags que começam com o que ele já digitou após a última vírgula.
- Query: `eb_entity_notes` agregando `tags` (client-side, cache 5min, escopo author_id=me OU advisor/admin).
- ↑↓/Enter pra escolher; insere com vírgula+espaço e mantém o caret.
- Bonus: se o usuário digitou `setor/` mostra só filhos de `setor`.

Sem alteração no schema da nota — continua salvando `tags TEXT[]` com normalização aplicada antes do save.

---

### 4. Página `/equity-brain/tag/:slug`

`src/pages/equity-brain/TagPage.tsx` + rota em `App.tsx`. Layout:

```text
Header
  #setor/saas/horizontal              [N notas · M entidades]
  [breadcrumb: setor › saas › horizontal]    [chips de irmãos]

Tabs
  · Notas (default)
  · Mandatos
  · Buyers
  · Empresas
  · Sub-tags
```

**Notas**: SELECT em `eb_entity_notes` WHERE `:tag = ANY(tags)` OR (qualquer tag começa com `:tag/`) — limit 50, ordenado por `updated_at desc`. Card mostra entidade-pai (chip mandato/buyer/empresa link), 240ch de preview, autor (`@email` ou nome), data. Toggle "Incluir sub-tags" (default on).

**Mandatos / Buyers / Empresas**: derivado das notas — distinct (entity_type, entity_id) → lookup nome em `eb_mandates_enriched` / `eb_buyers_enriched` / `eb_companies_enriched`. Grid de cards 2 col com link pra entidade.

**Sub-tags**: lista hierárquica das tags filhas diretas (`setor/saas/*`) com contagem.

Empty state: "Nenhuma nota usa essa tag ainda. Use `:tag` em qualquer nota para indexar aqui."

---

### 5. Tags em destaque (descoberta)

Side panel "Tags populares" no topo de `/equity-brain/hoje` **e** no header de `/equity-brain/crm` (fase 1 só Hoje):
- Top 8 tags por uso nos últimos 30 dias (autor=me; admin vê tudo).
- Cada chip linka pra `/equity-brain/tag/:slug`.

Hook `useTopTags(scope: 'mine'|'all', days=30)` em `src/hooks/useTopTags.ts`.

---

### 6. Performance & dados

Sem nova tabela. Queries usam:
- `eb_entity_notes` (view existente, security_invoker).
- Filtro por tag: `tags && ARRAY['setor/saas']::text[]` (igualdade) + `EXISTS (SELECT 1 FROM unnest(tags) t WHERE t LIKE 'setor/saas/%')` (descendentes). Empacotado em **RPC `eb_notes_by_tag(p_tag text, p_include_descendants bool, p_limit int)`** que retorna mesmo shape de `eb_entity_notes` — evita filtragem client-side cara.
- RPC `eb_top_tags(p_author uuid, p_days int)` retorna `tag text, count int` agrupando por unnest.

Ambas SECURITY INVOKER (passa pela RLS já configurada em `entity_notes`).

Migration enxuta: só as 2 RPCs + index opcional `CREATE INDEX entity_notes_tags_gin ON equity_brain.entity_notes USING gin (tags);` (acelera `&&` e `ANY`).

---

### 7. Normalização no save

`EntityNotes.handleSave`: mapeia `tags.split(',').map(normalizeTag).filter(Boolean)` antes de mandar. Garante consistência (`Setor / SaaS` → `setor/saas`).

---

### 8. Navegação

- Sidebar EB ganha item "Tags" (ícone `Tags` lucide) abaixo de "Diário"? **Não** — manter sidebar enxuta. Acesso só via:
  - Click numa tag em qualquer lugar
  - Tags populares no `/equity-brain/hoje`
  - URL direta

---

### 9. Memória

Atualizar `mem://features/entity-notes-kb.md` adicionando seção "Bloco 6 entregue":
- Convenção `/` para hierarquia, helpers em `tagHierarchy.ts`.
- `<TagChip/>` + `<TagAutocomplete/>` + normalização no save.
- Rota `/equity-brain/tag/:slug` com 4 tabs (notas/mandatos/buyers/empresas/sub-tags).
- RPCs `eb_notes_by_tag` e `eb_top_tags`.
- Index GIN em `entity_notes.tags`.

Sem nova entrada no índice — continua dentro do memo Núcleo de Conhecimento.

---

### 10. Fora de escopo

- Renomear tag em massa (admin UI).
- Cor por namespace configurável (fase futura — agora paleta fixa: setor=cyan, estagio=amber, tese=violet, prioridade=red, outros=zinc).
- Tag em mandato/buyer/empresa diretamente (hoje só em notas). Pode vir num Bloco 6.5.
- Saved searches (`/equity-brain/busca?tag=…&autor=…`).
- Bloco 7 (pgvector semântico) — fica pra próxima.

---

### 11. Arquivos

**Novos**
- `src/lib/eb/tagHierarchy.ts`
- `src/components/equity-brain/notes/TagChip.tsx`
- `src/components/equity-brain/notes/TagAutocomplete.tsx`
- `src/hooks/useTopTags.ts`
- `src/hooks/useNotesByTag.ts`
- `src/pages/equity-brain/TagPage.tsx`
- Migration: `eb_notes_by_tag` + `eb_top_tags` RPCs + GIN index

**Editados**
- `src/components/equity-brain/notes/EntityNotes.tsx` (TagChip, autocomplete, normalize no save)
- `src/components/equity-brain/notes/EntityBacklinksPanel.tsx` (chips clicáveis)
- `src/App.tsx` (rota `/equity-brain/tag/:slug`)
- `src/pages/equity-brain/TodayPage.tsx` (banner tags populares — se a página existir; senão skip)
- `.lovable/memory/features/entity-notes-kb.md`
- `.lovable/plan.md`

Entrega tem 1 migration enxuta (2 RPCs + 1 index) e o resto é UI.
