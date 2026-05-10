
# Fase 6 — Núcleo de Conhecimento Mari

## REGRA ZERO respeitada — este plano entrega APENAS o Bloco 0 (Auditorias 1, 2 e 3). Nada de código até Pablo validar.

Após validação, os Blocos 1-7 serão planejados/implementados em sequência, cada um com PARADA pra revisão.

---

## Auditoria 1 — Backend atual

### Schemas em uso
- `public` (106 tabelas + 38 views) — App principal (listings, buyer_profiles, etc.) + mirror eb_* (views) do Equity Brain
- `equity_brain` (70 objetos: 53 tabelas, 13 views, 4 matviews) — Núcleo CRM/Matching M&A

Importante: tudo que aparece como `eb_*` em `public` é **view** que aponta pro schema `equity_brain` real (com RLS aplicada).

### Entidades-alvo identificadas (onde notas/backlinks fazem sentido)

| Entidade   | Tabela canônica            | ID  | Campo livre hoje | Acesso via view pública |
|------------|----------------------------|-----|------------------|-------------------------|
| Listing    | `public.listings`          | id  | `description`, `additional_info`, `sale_reason` | `listings_blind` |
| Mandato    | `equity_brain.mandates`    | id  | `observacoes` (1 string) | `eb_mandates` |
| Buyer (M&A)| `equity_brain.buyers`      | id  | `observacoes`, `cautela_motivo` | `eb_buyers`, `eb_buyers_enriched` |
| Empresa    | `equity_brain.companies`   | id  | `raw_data` jsonb | `eb_companies`, `eb_companies_enriched`, `companies_blind` |
| Contato    | `equity_brain.contacts`    | id  | `notas` (text) | `eb_contacts` |
| Buyer cliente | `public.buyer_profiles` | id  | `description` | `public_buyer_profiles` |
| Match      | `equity_brain.matches`     | id  | — | `eb_matches_enriched` |
| Deal       | `equity_brain.deals`       | id  | — | (sem view pública) |
| Advisor    | `auth.users` + `user_roles`+ `profiles` | uid | — | — |
| Captação   | `public.capital_requests`  | id  | `objective` | — |

**Hoje cada entidade tem 1 campo de texto livre** — capacidade muito inferior ao que o Bloco 2 propõe (notas múltiplas, RLS por visibility, histórico, markdown).

### Edge functions relevantes (84 total) — agrupadas por uso
- **Mari/IA**: `mari-brain`, `mari-chat`, `mari-summarize-deal/thread`, `mari-suggest-actions`, `mari-score-temperature`, `mari-generate-insights`, `mari-draft-message`, `generate-dashboard-insight`
- **CRM**: `crm-detect-new-matches`, `crm-log-activity`, `news-to-crm-alert`, `process-event`, `drain-events-bulk`
- **Matching**: `match-batch`, `match-buyer`, `match-company-v2`, `matching-engine`, `process-match-queue`, `rematch-buyer`
- **Ingestão**: `eb-import-anatel/monday`, `enrich-company-via-rfb`, `ingest-company-news`, `extract-news-event`, `sync-listings-to-equity-brain`
- **Embeddings (REUTILIZÁVEL no Bloco 7)**: `compute-semantic-embeddings`, `embed-signal`

### Triggers / cron
- `setup-equity-brain-crons` orquestra crons. Não há nada de "notas" ou "backlinks" hoje.

### O que NÃO existe (e o Bloco 2-7 vai criar)
- ❌ Tabela polimórfica de notas (`entity_notes`)
- ❌ Backlinks / menções (`entity_mentions`)
- ❌ Daily notes do advisor
- ❌ Templates de mandato
- ❌ Tags hierárquicas
- ❌ Embeddings de notas

---

## Auditoria 2 — Frontend atual

### Páginas de detalhe das entidades-alvo
| Entidade  | Rota                              | Componente                    | Status |
|-----------|-----------------------------------|-------------------------------|--------|
| Listing   | `/anuncio/:id` (público)          | `pages/ListingDetail.tsx`     | OK |
| Listing (advisor) | `/meus-anuncios/:id`     | `pages/ListingCockpit.tsx`    | OK — com `EntityDocChecklist` |
| Mandato   | `/equity-brain/crm/mandate/:id`   | `pages/equity-brain/MandateDetailPage.tsx` | OK — 5 tabs (Visão, Matches, News, WhatsApp, Documentos) |
| Buyer M&A | `/equity-brain/crm/buyer/:id`     | `pages/equity-brain/BuyerDetailPage.tsx` | OK |
| Empresa   | `/equity-brain/company/...` (parcial) | `components/equity-brain/CompanyProfileCard.tsx` | Parcial — usa cards reutilizados |
| Match     | `/equity-brain/crm/match/:id`     | `pages/equity-brain/MatchDetailPage.tsx` | OK |
| Deal      | `/equity-brain/deal/:id`          | `pages/equity-brain/UnifiedDealPage.tsx` (3 colunas) | OK |
| Contato (pessoa) | — (não existe rota dedicada) | — | **❌ AUSENTE** |
| Advisor (perfil interno) | — | — | **❌ AUSENTE** |
| Captação  | `/captacao/:id`                   | `pages/CapitalRequestDetail.tsx` | OK |
| Buyer cliente (perfil app) | `/meus-compradores` (lista) | `pages/RegisterBuyer.tsx`+ list | Sem página de detalhe individual |

### Gaps front × back detectados (a confirmar com Pablo)

Esses são **hipóteses** baseadas na varredura — Bloco 1 precisa de validação dirigida. Sinais fortes:

1. **`eb_mandates_enriched` tem 25+ colunas** (`probability`, `expected_close_at`, `temperature_reason`, `pipeline_stage`, `outcome`, `valor_operacao`, `faturamento_vispe`, `data_inicio/fechamento`, `regiao`, etc.) — `MandateDetailPage` mostra apenas ~6 no header. Resto vive parcialmente em `FinancialPipelinePanel` e `TopMatchesHeader`. **A confirmar:** quais campos da Fase 4 (M&A Monday Replacement) chegaram à UI.
2. **`equity_brain.buyers` tem** `archetype_id`, `pause_signal`, `prioridade_global`, `cautela_flag/motivo`, `vertical_principal` — verificar se `BuyerDetailPage` renderiza todos.
3. **`equity_brain.companies` tem** `embedding_computed_at`, `qualification_status`, `qualified_at/by`, `qualification_source`, `linked_buyer_id`, `codename` — confirmar se aparecem em algum CompanyDetail.
4. **`mandate_summaries` (AI)** — usado em `ConversationSummary`? Confirmar cobertura.
5. **`market_waves`, `drift_snapshots`** — Fase Onda C/D entregou cards; verificar se todos renderizam.

**Reportarei a lista FINAL de gaps com prints/queries em Bloco 1, após Pablo confirmar quais entidades priorizar.**

---

## Auditoria 3 — Decisões de implementação (proposta)

Para cada entidade-alvo, onde colocar notas + quem vê:

| Entidade | Onde adicionar `<EntityNotes/>` | Visibilidades aplicáveis | Quem vê |
|----------|--------------------------------|--------------------------|---------|
| Mandato  | Nova tab "Notas" ou seção em "Visão geral" de `MandateDetailPage` | internal, client | advisor/admin (internal); + dono do listing vinculado (client) |
| Buyer M&A| Aba "Notas" em `BuyerDetailPage` | internal | advisor/admin apenas (buyers M&A são entidades internas) |
| Empresa  | Card "Notas" em `CompanyProfileCard` | internal, client, buyer | advisor/admin; dono se tem listing; buyers com NDA (`disclosure_grants`) para `buyer` |
| Listing  | Seção "Notas internas" em `ListingCockpit` (visão advisor) e `ListingDetail` (cliente vê só visibility=client) | internal, client, public | advisor/admin; dono (client); público (public) |
| Contato (pessoa) | **Criar rota nova** `/equity-brain/crm/contact/:id` | internal | advisor/admin |
| Advisor (perfil) | Nova rota `/equity-brain/advisor/:id` (admin) ou tab no MyProfile (próprio) | internal | admin (vê todos); self (vê próprio) |
| Captação | Aba "Notas" em `CapitalRequestDetail` | internal, client | advisor/admin; dono (client) |
| Deal     | Coluna "Notas" em `UnifiedDealPage` (já é 3 colunas) | internal | advisor/admin |
| Daily Notes | Rota nova `/diario` | self | advisor (próprio); admin (todos) |

### Mapeamento de visibility → predicates RLS (proposta)

```sql
visibility='internal' → has_role(auth.uid(),'advisor') OR has_role(auth.uid(),'admin')
visibility='client'   → internal-roles OR auth.uid() = owner_of(entity_type, entity_id)
visibility='buyer'    → internal-roles OR EXISTS (
    SELECT 1 FROM equity_brain.disclosure_grants
    WHERE grantee_user_id=auth.uid() AND entity_id=$entity_id AND status='active'
)
visibility='public'   → true
```

`owner_of()` será uma SECURITY DEFINER function que mapeia (entity_type, entity_id) → owner uid (ex.: `listings.user_id`, `buyer_profiles.user_id`, `capital_requests.user_id`). Para mandato/buyer M&A/contato/empresa interna não há "owner cliente" — visibility='client' não se aplica nessas (validação no insert).

### Pontos abertos para Pablo confirmar antes do Bloco 1

1. **Migrar `observacoes`/`notas`/`additional_info` existentes** para `entity_notes` como nota inicial pinada, **OU** manter campos legacy e usar `entity_notes` só para conteúdo novo? (recomendo migrar via seed na ativação)
2. **Pessoas (contatos)** precisam de página de detalhe própria (`/equity-brain/crm/contact/:id`)? Hoje aparecem apenas embutidos no mandato/buyer.
3. **Buyer M&A** suporta `visibility='client'`? Não há "cliente" — propor apenas `internal`.
4. **Storage de imagens em notas**: criar bucket `entity-notes-images` ou bloquear imagens no MVP?
5. **Histórico de versões** (Bloco 2.1 opcional): ativar desde o início ou deixar pra Bloco 2.5?
6. **Prioridade de entidades no Bloco 2**: implementar TODAS de uma vez ou começar por Mandato + Buyer + Empresa e expandir?

---

## Próximos passos

```text
[Bloco 0] ─── ESTE PLANO ─── aguardando ✅ de Pablo
   │
   ▼
[Bloco 1] Gaps front × back — preciso de respostas para os 6 pontos abertos acima
   │
   ▼
[Bloco 2] entity_notes + <EntityNotes/>      (8-12h)
   │
   ▼
[Bloco 3] Backlinks @ + entity_mentions      (6-8h)
   │
   ▼
[Bloco 4] Daily Notes /diario                (4-6h)
   │
   ▼
[Bloco 5] Templates de mandato               (4-6h)
   │
   ▼
[Bloco 6] Tags hierárquicas                  (3-5h)
   │
   ▼
[Bloco 7] Smart Connections (pgvector)       (4-6h, reaproveita compute-semantic-embeddings)
```

## Pronto para Bloco 1?

Aguardando Pablo:
1. Validar lista de entidades-alvo da Auditoria 1.
2. Confirmar/corrigir mapeamento de páginas da Auditoria 2.
3. Responder os 6 pontos abertos da Auditoria 3.

Após o ✅, abrirei novo plano focado APENAS no Bloco 1 (gaps front × back) com queries dirigidas pra cada entidade priorizada.
