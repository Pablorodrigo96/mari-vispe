
# Fase 6 — Núcleo de Conhecimento Mari (v2)

Plano enxuto e honesto sobre o estado real do código. **A Fase 6 já está ~40% construída** — `entity_notes`, `entity_note_mentions`, embedding, `/diario`, 3 funções Claude e `ai_runs` já existem. O plano abaixo respeita isso e foca em deltas + integração, não em reconstruir.

---

## BLOCO 0 — AUDITORIAS (executadas agora)

### Auditoria 1 — Backend

**Já existe em `equity_brain`:**
- `entity_notes` (id, entity_type ENUM, entity_id TEXT, author_id, title, body_md, visibility ENUM, pinned, tags[], body_tsv, **embedding pgvector**, embedding_text_hash, timestamps)
- `entity_note_mentions` (Bloco 3 parcial)
- `ai_runs` — log universal das 3 funções Claude
- `opportunities_ready.ai_thesis_summary` (texto da tese) + `ai_pitch`
- `matches.ai_pitch` (pitches Claude gravados no match)
- `deals`, `mandates`, `buyers`, `company_*`, `mandate_summaries` (RLS reforçada)
- Listings/`buyer_profiles` no `public`, com views `_blind`

**Não existe (precisa decidir):**
- `entity_notes_history` (versionamento) — proposto pelo prompt, ausente
- `generated_pitches` / `call_analyses` dedicados — Claude grava só em `ai_runs` + colunas `ai_pitch`/`ai_thesis_summary`. `claude-analyze-call` **não persiste output estruturado** fora do `ai_runs.output_json`.
- `note_templates` (Bloco 5)
- `entity_tags` hierárquicas dedicadas (Bloco 6 — hoje só `tags text[]` em `entity_notes`)
- `advisor_daily_notes` dedicada — `/diario` usa `entity_notes` com `entity_type='daily'` (ver `useDailyNote.ts`)

**Colunas faltantes em `entity_notes`** (vs proposta v2): `source`, `source_ref_id`, `section_order`, `version`. Adicionar via ALTER (não destrutivo).

### Auditoria 2 — Frontend

**Páginas de detalhe existentes:**
| Entidade | Rota | Componente | Aba Notas? | Integração Claude existente |
|---|---|---|---|---|
| Empresa/Deal | `/equity-brain/empresa/:cnpj` | `DealDetailPage` + `DealCard` | ✅ tab "Notas" (`EntityNotes`) já presente | `ClassifyThesisCard` (Claude tese) já renderiza |
| Mandato | `/equity-brain/mandato/:id` | `MandateDetailPage` | a confirmar | — |
| Buyer | `/equity-brain/buyer/:id` | `BuyerDetailPage` | a confirmar | — |
| Match | `/equity-brain/match/:id` | `MatchDetailPage` + `MatchDetailDrawer` | a confirmar | `ai_pitch` exibido |
| Listing | `/anuncio/:id` | `ListingDetail` | sem notas (público) | — |
| Daily | `/equity-brain/diario` | `DailyDiaryPage` | hub do advisor | — |

**Hooks/infra já prontos:**
- `useEntityNotes`, `useDailyNote`, `useNoteSearch`, `useNotesSimilar`, `useNotesByTag`, `useTopTags`
- `embed-note` edge function + cron de embeddings (Bloco 7 quase pronto)
- `mentionParser.ts`, `NoteRenderer` com renderização de @menções

**`_archive/` ignorar** (intencional): `BoardPage`, `CrmHubPage`, `DashboardPage`, etc.

### Auditoria 3 — Matriz de decisão

| Entidade | Onde adicionar | RLS | Integração Claude |
|---|---|---|---|
| company/deal | já tem | admin/advisor | `ai_thesis_summary` vira nota `source='ai_thesis'` pinned |
| buyer | adicionar tab | admin/advisor | pitches viram notas `source='ai_pitch'` |
| mandate | adicionar tab | admin/advisor | templates (Bloco 5) |
| match | drawer já mostra `ai_pitch` | admin/advisor | espelhar como nota internal |
| listing | **NÃO adicionar** notas internas em rota pública | — | — |
| daily | já existe via `entity_type='daily'` | author-only | feed agregando `ai_runs` 24h |

---

## BLOCOS 1–8 (delta sobre o existente)

### Bloco 1 — Gaps front × back
Reportar e validar com Pablo antes de mexer. Gaps prováveis pós-Raio-X: poucos. Ações típicas: garantir que `MandateDetailPage` e `BuyerDetailPage` montem `<EntityNotes entity_type=... />`.

### Bloco 2 — Núcleo de notas (delta)
**Migração aditiva** em `equity_brain.entity_notes`:
```sql
ALTER TABLE equity_brain.entity_notes
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual'
    CHECK (source IN ('manual','ai_pitch','ai_thesis','ai_call','template')),
  ADD COLUMN IF NOT EXISTS source_ref_id uuid,
  ADD COLUMN IF NOT EXISTS section_order int DEFAULT 0,
  ADD COLUMN IF NOT EXISTS version int DEFAULT 1;

CREATE TABLE IF NOT EXISTS equity_brain.entity_notes_history (...);
CREATE TRIGGER entity_notes_version_trigger ...;
```
Frontend: badge "🤖 Gerada por Mari" + botão "Promover para manual" + "Regenerar com IA" no `NoteRenderer`/editor.

### Bloco 3 — Backlinks (delta)
`entity_note_mentions` já existe. Estender parser para também indexar menções em:
- `opportunities_ready.ai_thesis_summary` + `ai_pitch`
- `matches.ai_pitch`
- `ai_runs.output_json` (se contiver markdown com @menção)
Via trigger AFTER UPDATE nessas colunas chamando função de parse.

### Bloco 4 — Daily Notes (delta)
`/diario` já roda em `entity_notes` com `entity_type='daily'`. Adicionar:
- Feed agregado das últimas 24h: `ai_runs` (pitches/teses/calls) + `entity_notes` recentes + `deals` movidos
- Componente "Pendências IA" — pitch gerado sem follow-up registrado
- 6 zonas estruturadas (agenda, tarefas, news, mandatos, anotações, ontem) — verificar se já existem

### Bloco 5 — Templates
Nova tabela `equity_brain.note_templates` (sector, role, sections JSONB com `auto_generate` + `ai_function`).
Aplicar template num mandato: cria N entries em `entity_notes` + dispara funções Claude indicadas.

### Bloco 6 — Tags hierárquicas
Hoje há `tags text[]`. Decidir: estender com tabela `entity_tags` dedicada (`path ltree`) **OU** manter array + convenção `setor/isp/sul`. Recomendação: manter array (simples, pgvector já compensa busca) e só adicionar página de navegação por prefixo.

### Bloco 7 — Smart Connections (delta)
`embedding pgvector` + `embed-note` já existem. Falta:
- Edge function `compute-entity-embedding` agregando entidade (nome+desc+notas+ai_pitch+ai_thesis) num único vetor por entidade
- Painel "Similares" em `DealDetailPage`/`BuyerDetailPage` (RPC k-NN)

### Bloco 8 — Integração Claude (NOVO, foco da fase)
**Trigger pattern** em vez de duplicar lógica nas 3 funções:
- AFTER UPDATE de `opportunities_ready.ai_thesis_summary` → upsert nota `source='ai_thesis'`, pinned=true, entity_type='company'
- AFTER UPDATE de `matches.ai_pitch` → upsert nota `source='ai_pitch'`, entity_type='match'
- AFTER INSERT em `ai_runs` WHERE function='claude-analyze-call' → upsert nota `source='ai_call'` com body do `output_json`, entity_type derivado de `ai_runs.entity_type/id`

Vantagem: zero mudança nas edge functions Claude.

---

## ORDEM SUGERIDA

```
Bloco 0 (concluído acima) → Pablo valida
Bloco 1 (gaps) → Bloco 2 (delta schema + UI) → Bloco 8 (triggers Claude) →
Bloco 3 (parser estendido) → Bloco 4 (daily v2) →
Bloco 5 (templates) → Bloco 7 (similares) → Bloco 6 (tags nav)
```

Bloco 8 sobe antes do 3/4/5 porque dá ganho imediato (todas análises Claude existentes viram nota automaticamente).

## DECISÕES PENDENTES (Pablo)

1. **Versionamento full** (`entity_notes_history` + trigger) ou só `updated_at`? Prompt pede full — confirmar.
2. **Listings públicos**: confirmar que não levam aba notas internas (recomendação: não).
3. **Tags**: manter `tags text[]` ou criar tabela hierárquica?
4. **`claude-analyze-call`**: criar tabela `call_analyses` dedicada ou seguir só com `ai_runs` + trigger?

Confirme estas 4 e o Bloco 1 pode começar.
