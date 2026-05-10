
# Fase 6 — Bloco 1 + Bloco 2 (foco: Mandato · Buyer M&A · Empresa)

Pablo confirmou: começar por **Mandato, Buyer M&A e Empresa**. Listing, Contato, Captação, Daily Notes e Advisor entram em fases posteriores.

Antes de codar, ainda preciso de respostas (5 perguntas curtas no final). Mas o plano abaixo já fica congelado para os 3 primeiros alvos.

---

## Bloco 1 — Gaps front × back (3 entidades)

Objetivo: garantir que tudo que o backend já guarda apareça na UI. Sem isso, adicionar notas em cima de UI incompleta é desperdício.

### 1.1 Mandato (`equity_brain.mandates` → `MandateDetailPage`)

Auditoria dirigida (queries SQL que rodarei no Bloco 1):
- Listar colunas reais de `equity_brain.mandates` + `eb_mandates_enriched`.
- Para cada coluna, marcar: **renderizada / parcial / ausente** no `MandateDetailPage` (header + 5 tabs).

Campos suspeitos de estarem ausentes na UI (a confirmar):
- `probability`, `expected_close_at`, `pipeline_stage`, `outcome`, `valor_operacao`, `faturamento_vispe`, `data_inicio`, `data_fechamento`, `regiao`, `temperature_reason` (parcial — TemperatureBadge mostra mas só no header).

Entrega: PR pequeno adicionando os campos faltantes ao header/Resumo/Pipeline financeiro.

### 1.2 Buyer M&A (`equity_brain.buyers` → `BuyerDetailPage`)

Mesma auditoria. Campos suspeitos: `archetype_id`, `pause_signal`, `prioridade_global`, `cautela_flag`, `cautela_motivo`, `vertical_principal`, `observacoes`.

### 1.3 Empresa (`equity_brain.companies`)

Hoje **não existe rota dedicada** (`CompanyProfileCard` é embutido). Decisão: criar `/equity-brain/company/:id` reaproveitando `CompanyProfileCard` + abas (Visão · Notícias · Documentos · Notas no Bloco 2). Campos a expor: `codename`, `qualification_status`, `qualified_at/by`, `linked_buyer_id`, `embedding_computed_at`, `raw_data` resumido.

**Saída do Bloco 1:** tabela "tem no DB ✗ não tem na UI" + PRs pontuais. Estimativa: 4-6h.

---

## Bloco 2 — `entity_notes` + `<EntityNotes/>` (3 entidades)

### 2.1 Schema (migration)

```sql
CREATE SCHEMA IF NOT EXISTS equity_brain;

CREATE TYPE equity_brain.note_entity_type AS ENUM
  ('mandate','buyer_ma','company');  -- expansível depois

CREATE TYPE equity_brain.note_visibility AS ENUM
  ('internal','client','buyer','public');

CREATE TABLE equity_brain.entity_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type equity_brain.note_entity_type NOT NULL,
  entity_id  uuid NOT NULL,
  author_id  uuid NOT NULL REFERENCES auth.users(id),
  title      text,
  body_md    text NOT NULL DEFAULT '',
  visibility equity_brain.note_visibility NOT NULL DEFAULT 'internal',
  pinned     boolean NOT NULL DEFAULT false,
  tags       text[]   NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX entity_notes_entity_idx
  ON equity_brain.entity_notes (entity_type, entity_id, pinned DESC, updated_at DESC);

CREATE INDEX entity_notes_tags_idx
  ON equity_brain.entity_notes USING gin (tags);

-- full-text PT-BR (já preparado pra Bloco 7)
ALTER TABLE equity_brain.entity_notes
  ADD COLUMN body_tsv tsvector
    GENERATED ALWAYS AS (to_tsvector('portuguese', coalesce(title,'') || ' ' || body_md)) STORED;
CREATE INDEX entity_notes_tsv_idx ON equity_brain.entity_notes USING gin (body_tsv);
```

Trigger de `updated_at` + helper `equity_brain.entity_owner(entity_type, entity_id)` SECURITY DEFINER (mandato/buyer M&A/empresa interna não têm dono cliente → retorna NULL → bloqueia `visibility='client'`).

### 2.2 RLS

```sql
ALTER TABLE equity_brain.entity_notes ENABLE ROW LEVEL SECURITY;

-- SELECT
CREATE POLICY notes_select ON equity_brain.entity_notes FOR SELECT USING (
  CASE visibility
    WHEN 'internal' THEN has_role(auth.uid(),'advisor') OR has_role(auth.uid(),'admin')
    WHEN 'public'   THEN true
    WHEN 'buyer'    THEN has_role(auth.uid(),'advisor') OR has_role(auth.uid(),'admin')
                         OR EXISTS (SELECT 1 FROM equity_brain.disclosure_grants g
                                    WHERE g.grantee_user_id=auth.uid()
                                      AND g.entity_id=entity_notes.entity_id
                                      AND g.status='active')
    WHEN 'client'   THEN has_role(auth.uid(),'advisor') OR has_role(auth.uid(),'admin')
                         OR auth.uid() = equity_brain.entity_owner(entity_type, entity_id)
  END
);

-- INSERT/UPDATE: advisor+admin sempre; author pode editar a própria nota
-- DELETE: author OR admin
```

View pública `public.eb_entity_notes` espelha (igual padrão `eb_mandates`).

### 2.3 Componente `<EntityNotes entityType entityId />`

- Localização: `src/components/equity-brain/notes/EntityNotes.tsx`
- Lista (pinadas no topo) + botão "Nova nota" → editor Markdown (react-markdown + textarea com toolbar simples; sem upload de imagem no MVP).
- Cada nota: título, autor, badge de visibility, pin/unpin, edit, delete, tags chips.
- Toggle de filtro por visibility, busca por título/tag.

Hook: `useEntityNotes(entityType, entityId)` via React Query.

### 2.4 Integração nas páginas

| Página | Onde |
|--------|------|
| `MandateDetailPage` | Nova tab "Notas" (6ª tab, depois de Documentos) |
| `BuyerDetailPage`   | Nova tab/seção "Notas" |
| `CompanyDetail` (criada no Bloco 1.3) | Tab "Notas" |

Visibilities permitidas no MVP:
- Mandato: `internal`, `public` (mostro `client` só se Pablo decidir abrir — ver pergunta 1 abaixo)
- Buyer M&A: `internal` apenas (não há cliente nem buyer com NDA aqui)
- Empresa: `internal`, `buyer` (gated por `disclosure_grants`), `public`

### 2.5 Migração de dados legacy (opcional, ver pergunta 2)

Se aprovado: seed converte `mandates.observacoes`, `buyers.observacoes`+`cautela_motivo`, `companies.raw_data->>'notas'` em 1 nota pinada `internal` por entidade.

**Estimativa Bloco 2:** 10-12h (schema 2h · RLS 1h · component 4h · integrações 3h · migração legacy 1-2h).

---

## Diagrama

```text
[Bloco 1] gaps front×back     ─ 4-6h  ─ Mandato, Buyer M&A, Empresa
       │
       ▼
[Bloco 2] entity_notes + UI   ─ 10-12h
       │
       ▼  (após validação)
[Bloco 3] @mentions / backlinks  (próxima fase)
[Bloco 4] Daily Notes /diario
[Bloco 5] Templates
[Bloco 6] Tags hierárquicas
[Bloco 7] Smart Connections (pgvector — reaproveita `compute-semantic-embeddings`)
```

---

## Perguntas restantes (preciso para travar Bloco 2)

1. **Mandato com visibility='client'**: o mandato tem um dono cliente real (ex.: vendedor da empresa)? Se sim, qual coluna mapeia para o uid? Se não, removo `client` do enum de visibility do mandato e mantenho só `internal` + `public`.

2. **Migrar dados legacy** (`observacoes`/`cautela_motivo`/`raw_data->>notas`) como 1ª nota pinada `internal`? Sim / Não.

3. **Imagens em notas**: bloquear no MVP (só texto + markdown) ou já criar bucket `entity-notes-images`? Recomendo bloquear no MVP.

4. **Histórico de versões** (tabela `entity_note_revisions`): MVP ou pra depois? Recomendo pra depois.

5. **Página de Empresa nova** (`/equity-brain/company/:id`): Pablo confirma criar agora no Bloco 1.3? (alternativa: adiar e só montar `<EntityNotes/>` embutido onde `CompanyProfileCard` já é usado).

Responda essas 5 e eu fecho o plano detalhado do Bloco 1 com queries dirigidas e abro o PR.
