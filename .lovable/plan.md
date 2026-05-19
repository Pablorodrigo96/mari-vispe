
# Fase 0 — Descoberta (read-only)

Auditoria executada direto no banco (`public` + `equity_brain`), filesystem (`supabase/functions`, `src/pages/equity-brain`, `src/components/equity-brain`, `src/hooks`) e enums. Nenhuma migration, nenhum código.

---

## 0.1 — Arquitetura atual mapeada

### Estágios do pipeline (HOJE)

Tabela `public.eb_pipeline_stages` (6 etapas, SLA em dias):

| pos | key | label | sla_days | terminal |
|---|---|---|---|---|
| 1 | match | Match | 7 | não |
| 2 | nbo | NBO | 14 | não |
| 3 | due_diligence | Due Diligence | 30 | não |
| 4 | spa | SPA | 21 | não |
| 5 | closing | Closing | 14 | não |
| 6 | closed | Closed | 0 | sim |

Transições logadas em `public.eb_pipeline_transitions` (545 registros, com `time_in_previous_stage_seconds`). Enum redundante `equity_brain.pipeline_stage` espelha as 6 etapas.

**Gap:** prompt pede 12 etapas (Prospecção, Mandato, Q&A Preliminar, Teaser, RoadShow, Match, NDA, Q&A, NBO, DD, Negociações, SPA). Faltam 6.

### Entidades core (equity_brain)

| tabela | linhas | papel |
|---|---:|---|
| `mandates` | 529 | unidade central de deal (vendedor) — é o "deal" real hoje |
| `buyers` | 503 | compradores institucionais |
| `matches` | 159.601 | matriz buyer↔mandate (engine v2) |
| `companies` | 395 | espelho de listings + cold market (ANATEL) |
| `crm_activities` | 634 | timeline (call/email/whatsapp/meeting/note) |
| `crm_documents` | 0 | já existe schema, sem uso |
| `crm_tasks` | 0 | já existe, sem uso |
| `ai_runs` | 3 | log IA (model, tokens_in/out, cost_usd, latency_ms, parsed_output) |
| `access_logs` | 51 | LGPD/disclosure (entity, action, disclosure_mode) |
| `disclosure_requests` / `disclosure_grants` | 0/? | fluxo de revelar identidade cega |
| `deal_events` | 101 | sinais para adaptive loop bayesiano |
| `events` | 4.274 | fila genérica |
| `deals` (eb) | 0 | tabela existe mas vazia — `UnifiedDealPage` consome via view |

Public relevante: `listings` (83), `listing_financial_docs` (0), `due_diligence_audits` (0), `interest_logs`, `api_usage_logs` (65.041, com cost_usd/brl, tokens, feature, function_name), `api_pricing`, `user_roles` (18).

### Edge functions já existentes (96 funções)

- IA/orquestração: `mari-brain`, `mari-chat`, `mari-draft-message`, `mari-summarize-deal`, `mari-generate-insights`, `mari-suggest-actions`, `generate-dashboard-insight`, `enrich-buyer-via-ai`, `analyze-financial-doc`, `claude-generate-pitch`, `claude-analyze-call`, `extract-news-event`, `generate-whatsapp-draft`
- Match/score: `match-buyer`, `match-company-v2`, `matching-engine`, `calculate-scores`, `calculate-sav-score`, `compute-signals`, `refresh-opportunities`, `process-match-queue`
- Sync/import: `sync-listings-to-equity-brain`, `eb-import`, `eb-import-monday`, `eb-import-anatel`, `sync-companies-from-cnpj`
- WhatsApp: `whatsapp-webhook`, `setup-advisor-whatsapp`, `send-message`, `whatsapp-classify-batch`
- Telemetria/cron: `setup-equity-brain-crons`, `bootstrap-cron-secrets`, `compute-drift-snapshot`, `mari-smoke-tests`
- Pagamentos: `create-checkout`, `customer-portal`, `verify-payment`

**Sem equivalente atual:** geração de NDA, NBO, SPA, mandato; assinatura digital; carta física; data room estruturado; checklist DD operacional; red flags; negotiation issues; Q&A formal entre partes.

### Páginas EB e CRM atuais

`UnifiedDealPage`, `DealDetailPage`, `MandateDetailPage`, `MandateFormPage`, `PipelineKanbanPage`, `PipelineHistoryPage`, `MatchInboxPage`, `MatchDetailPage`, `ExecutiveDashboardPage`, `DashboardCoveragePage`, `DisclosuresPage`, `AccessAuditPage`, `ExportsPage`, `ImportsPage`, `OportunidadesPage`. Hooks: `useDeal`, `useCrm`, `useCrmTasks`, `useMatchInbox`, `usePipelineStages`, `useMatchById`.

### Logging de IA (HOJE)

Dois caminhos coexistem:
- `public.api_usage_logs` (65k rows) — usado por Lovable Gateway, tem `feature`, `function_name`, `cost_usd`, `cost_brl`, `model`, `user_id`, `metadata`.
- `equity_brain.ai_runs` (3 rows) — schema antigo apontando p/ Claude; pouco usado.

**Consolidação recomendada:** padronizar em `api_usage_logs` (mais rico, já tem custo em BRL e pricing pluggable).

### Roles existentes

Enum `app_role`: `seller, buyer, advisor, admin, franchisee`. **Não existem** `legal` nem `observer` (pedidos pelo prompt). 18 atribuições ativas.

---

## 0.2 — Gaps por requisito do prompt

| Requisito do prompt | Já existe | Estende | Cria novo |
|---|---|---|---|
| SLA por etapa com benchmark/meta (`deal_stage_history`) | `eb_pipeline_transitions` (parcial: tem duração real) | Adiciona `target_days/hours`, `actual_hours`, `delta`, `exit_reason`, FK `responsible_user_id` | Tabela complementar `deal_stage_targets` (benchmark vs meta) e VIEW `deal_sla_report` |
| 12 etapas do pipeline | 6 etapas em `eb_pipeline_stages` | Insere 6 novas (`prospeccao, mandato, qna_prelim, teaser, roadshow, nda, qna, negociacoes`) + reordena `position` | nada estrutural |
| `stage_tasks` (tarefas obrigatórias por etapa) | `crm_tasks` (vazia, genérica por entity) | Estende com `stage_key`, `is_required`, `blocks_advance` | template `stage_task_templates` p/ semear por etapa |
| `documents` + `document_templates` | `crm_documents` (vazia) | Estende com `template_id`, `version`, `parent_doc_id`, `approval_status` | `document_templates` (kind, body_md/html, variables jsonb), `document_versions` |
| `approvals` | nada formal | — | `document_approvals` (doc_id, approver_id, decision, reason, at) |
| `audit_events` | `access_logs` (LGPD/identidade) + `eb_pipeline_transitions` (etapa) | — | `audit_events` genérico (actor, action, entity_type, entity_id, before/after jsonb) OU estender `access_logs` (recomendado: novo, semântica diferente) |
| `ai_runs` consolidado | `api_usage_logs` (rich) + `equity_brain.ai_runs` (legado) | Adiciona em `api_usage_logs.metadata` chaves `deal_id`, `feature_step`, `prompt_hash`; **deprecar** `ai_runs` legado sem dropar | View `ai_costs_by_deal` |
| `data_room_files` | `crm_documents` + `listing_financial_docs` | Reaproveita `crm_documents` com `kind='dataroom'` | bucket Storage dedicado `dataroom/{deal_id}/...` com policy de release-por-NDA |
| `dd_checklist_items` | `due_diligence_audits` (12 itens fixos, JSON) | — (audit é outro escopo, é diagnóstico do vendedor) | `dd_checklist_items` (deal_id, categoria, item, status, responsavel, prazo, anexos[]) + `dd_checklist_templates` |
| `red_flags` | nada | — | `red_flags` (deal_id, categoria, severidade, impacto_$, impacto_jur, recomendacao, status, responsavel) |
| `qna_items` | `crm_activities` (kind=note) | — | `qna_items` (deal_id, author, target, categoria, status, prioridade, prazo, answer_text, attachments[]) |
| `negotiation_issues` | nada | — | `negotiation_issues` (deal_id, tema, posicao_buyer, posicao_seller, recomendacao, impacto_preco, impacto_spa, status) |
| `outreach_campaigns` + `physical_letters` | nada | — | `outreach_campaigns`, `outreach_targets` (lista de CNPJs), `physical_letters` (status mock) |
| Adapter `SignatureProvider` | nada | — | interface TS + mock + tabela `signature_envelopes` |
| Adapter `PhysicalMailProvider` | nada | — | interface TS + mock |
| `AIOrchestrator` | edge functions soltas | Adiciona wrappers `generateTeaser`, `draftNBO`, `analyzeSPA` reusando `mari-*` | service TS centralizando (camada cliente) + log em `api_usage_logs` com `feature` consistente |
| Dashboard `/admin/sla` | nada | — | nova rota + componente lendo `deal_sla_report` |
| Dashboard `/admin/ai-costs` | parcial: `AdminApiMonitor` | Estende com filtro por feature/deal e top 10 deals caros | guards de orçamento (`api_settings`) |
| Roles `legal`, `observer` | enum tem 5 valores | Decisão Pablo (0.4) | adicionar enum value OU flag em profiles (proposta abaixo) |

---

## 0.3 — Plano técnico Fase 1 (Fundação)

Objetivo da Fase 1 segundo o prompt: benchmark/horas, dashboard SLA, stage tasks, audit events, estrutura segura de documentos/templates, dashboard de custos IA. **Tudo retrocompatível.**

### Bloco 1.1 — Pipeline em 12 etapas + benchmark

**Migração (todas IF NOT EXISTS / ADD COLUMN nullable):**

1. `ALTER TABLE eb_pipeline_stages ADD COLUMN target_days numeric, target_hours numeric, baseline_days numeric, baseline_hours numeric` (preenche meta e benchmark do prompt para as 12 etapas).
2. INSERT (ON CONFLICT DO NOTHING) das 6 novas etapas: `prospeccao, mandato, qna_prelim, teaser, roadshow, nda, qna, negociacoes`. Reordena `position` num passo único atômico.
3. `ALTER TABLE eb_pipeline_transitions ADD COLUMN actual_hours numeric, target_days numeric, target_hours numeric, delta_days numeric, delta_hours numeric, responsible_user_id uuid, exit_reason text` — preenchidos por trigger no INSERT.
4. **Compat:** etapas legadas `match, nbo, due_diligence, spa, closing, closed` mantidas; nenhum mandate referencia stage que vá sumir.

**Risco:** front (`PipelineKanbanPage`, `PipelineHistoryPage`, `useDeal`, `useCrm`) renderiza colunas dinamicamente a partir de `eb_pipeline_stages`. Adicionar etapas só amplia o quadro — não quebra. **Mas:** validar com Pablo se quer mostrar as 12 imediatamente ou esconder atrás de feature flag `pipeline_v2_full`.

### Bloco 1.2 — Stage tasks

Novas tabelas:
- `stage_task_templates` (stage_key, title, description, is_required, blocks_advance, default_owner_role, default_sla_hours).
- `deal_stage_tasks` (mandate_id, stage_key, template_id, title, status, assignee_id, due_at, completed_at, blocks_advance).

Seed inicial com 3-5 tarefas por etapa (vendor checklist do prompt). Hook `useStageTasks(mandateId, stage)`.

### Bloco 1.3 — Audit events

Nova tabela `audit_events` (id, actor_id, actor_role, action, entity_type, entity_id, mandate_id, before jsonb, after jsonb, at). RLS: admin/advisor leem tudo; demais só os do próprio mandate.

Trigger genérico `fn_audit_log` invocável por outras tabelas (NDA enviado, doc aprovado, etapa avançada, red flag criada). **Não toca `access_logs`** — ele segue dedicado a disclosure/LGPD.

### Bloco 1.4 — Documents + templates (estende `crm_documents`)

- `ALTER TABLE equity_brain.crm_documents ADD COLUMN template_id uuid, version integer DEFAULT 1, parent_doc_id uuid, approval_status text DEFAULT 'draft', kind text` (kind = mandato/nda/nbo/spa/teaser/dataroom/carta_fisica/outro).
- `document_templates` (id, kind, name, body_md, variables jsonb, version, active).
- `document_versions` (doc_id, version, body_rendered, created_by, created_at, snapshot completo).
- `document_approvals` (doc_id, approver_id, decision, reason, at).

Service TS `DocumentService` chama `renderTemplate` (template handlebars-style server-side).

### Bloco 1.5 — Telemetria de IA consolidada

- `ALTER TABLE api_usage_logs ADD COLUMN deal_id uuid, stage_key text` (nullable).
- Wrapper TS `aiCall({ feature, dealId, stageKey, ... })` que **sempre** insere em `api_usage_logs` antes/depois da chamada Lovable Gateway, com `cost_usd` calculado via `api_pricing`.
- Refatora 1-2 edge functions piloto (`mari-summarize-deal`, `analyze-financial-doc`) pra usar o wrapper. Outras seguem como estão (não-quebra).
- View `ai_costs_by_deal` (mandate_id, total_cost_usd, total_tokens, top features).

### Bloco 1.6 — Dashboards admin

- `/admin/sla`: lê `eb_pipeline_transitions` enriquecido + view `deal_sla_report` (média/p50/p90 por etapa, vs meta, vs baseline, % redução, top 10 deals lentos).
- `/admin/ai-costs`: estende `AdminApiMonitor` com tab "Por deal" + alerta visual `>50 USD acumulado`.

### Ordem sequencial recomendada Fase 1

1. Bloco 1.1 (pipeline + benchmark) ← **valida com Pablo antes de seguir**
2. Bloco 1.3 (audit_events) — fundação para todos os blocos seguintes
3. Bloco 1.2 (stage tasks)
4. Bloco 1.4 (documents + templates)
5. Bloco 1.5 (telemetria IA)
6. Bloco 1.6 (dashboards SLA + custos)

### Arquivos a criar/alterar (Fase 1)

**Criar:** 6 migrations (uma por bloco), services TS `src/services/{documents,audit,ai-orchestrator,stage-tasks}.ts`, hooks `useStageTasks`, `useDealSLA`, `useAiCostsByDeal`, páginas `src/pages/admin/AdminSLA.tsx`, `src/pages/admin/AdminAICosts.tsx` (ou tab dentro do existente).

**Alterar (cirúrgico):** `PipelineKanbanPage` e `PipelineHistoryPage` (suportar 12 etapas — provavelmente nada, já é dinâmico), `AdminSidebar.tsx` (adicionar 2 itens admin), `AdminApiMonitor.tsx` (tab por deal).

**Não tocar:** `match-buyer`, `match-company-v2`, `mari-brain` (lógica core), `useMatchInbox`, `MandateDetailPage` (só adiciona tabs depois, Fase 2+).

---

## 0.4 — Decisões pendentes para Pablo (não implementar agora)

### 1. Roles `legal` e `observer`
- **Opção A — adicionar ao enum `app_role`** (`ALTER TYPE app_role ADD VALUE 'legal'`, idem `observer`). Prós: consistente com infra atual (`has_role`, `user_roles`). Contras: enum não permite remover valor depois.
- **Opção B — flags em `profiles`** (`is_legal boolean`, `is_observer boolean`). Prós: reversível. Contras: quebra padrão "roles vivem em `user_roles`" (regra core de segurança).
- **Recomendação:** **A** (enum). Mantém RLS uniforme e o core rule "roles em `user_roles`". Custo zero, irreversível controlado.

### 2. Provider de assinatura digital
| Provider | $ por env | Vol BR | API DX | LGPD |
|---|---|---|---|---|
| **Clicksign** | ~R$ 1,40 | top BR | REST + webhook + sandbox | ok |
| ZapSign | ~R$ 0,50 | médio | REST simples | ok |
| D4Sign | ~R$ 1,80 | enterprise BR | REST + SOAP | ok |
| DocuSign | ~US$ 1,50 | global | ótimo, caro | ok |
- **Recomendação:** **Clicksign**. Balanço custo × DX × adoção BR; abundância de docs; webhook nativo encaixa direto no `SignatureProvider`. Mock interno até Fase 5.

### 3. Carta física automatizada
| Provider | $ por carta | Volume | Observação |
|---|---|---|---|
| **Pingo (Correios via API)** | R$ 6-9 | alto | API REST madura |
| Correios Personalizada (direto) | ~R$ 5 | alto | sem API real, depende EDI |
| Letter Run / outros | R$ 10+ | menor | menos adoção BR |
- **Recomendação:** **Pingo**. Único com API REST + tracking + status webhook nacional confiável. Mock até Fase 5.

### 4. Storage seguro de docs
- Hoje: Supabase Storage (já LGPD-compliant, encryption-at-rest by default no Postgres + at-rest no S3 da Supabase).
- **Recomendação:** **Manter Supabase Storage**, com bucket dedicado `dataroom-private` (não-público), policies por `mandate_id`, signed URLs com expiração curta (≤15min), e segregar `dataroom/{mandate_id}/{stage}/...`. Migrar só se volume >50GB ou exigência contratual de S3 próprio.

### 5. Versionamento de documentos
- **Snapshots completos** por versão (`document_versions.body_rendered` cheio).
- **Recomendação:** **snapshots**. Documentos M&A raramente passam de 50-100 versões por deal; diff-on-the-fly via `diff-match-patch` no front é barato. Diff-based (git-like) seria over-engineering pra ganho de storage marginal.

---

## 0.5 — Estimativa de tempo

| Fase | Horas Lovable | Blocos | Validações Pablo |
|---|---:|---:|---:|
| Fase 1 — Fundação | 12-16h | 6 (1.1 a 1.6) | 3 (após 1.1, após 1.4, no fim) |
| Fase 2 — Documentos básicos (Prospecção + NDA + NBO) | 14-18h | 4 | 2 |
| Fase 3 — Operacional (Data Room, DD, Q&A, Red Flags) | 18-22h | 5 | 2 |
| Fase 4 — Fechamento (Negociações, SPA, versionamento, IA contrato) | 14-18h | 4 | 2 |
| Fase 5 — Integrações reais (Clicksign, Pingo, storage, enriquecimento) | 10-14h | 4 | 1 (gate antes de iniciar) |
| **Total** | **68-88h** | **23** | **10** |

---

## 0.6 — Riscos identificados

1. **Pipeline 6→12 etapas pode confundir UI atual** se algum mandate estiver num stage cuja `position` mude. Mitigar: manter chaves estáveis e só alterar `position` em transação única após snapshot.
2. **Conflito com PROMPT_REFORMA_SIGNUP_ROLES** se Bloco 3-6 dele mexer em `user_roles`/`profiles` ao mesmo tempo. Mitigar: confirmar com Pablo o estado antes de qualquer mudança em roles (especificamente para Fase 0.4 item 1).
3. **Layout Premium Institucional** pode reescrever `/painel`. Não impacta Fase 1 (admin-only); impacta Fase 2+ quando criarmos cards de Prospecção no dashboard do deal — coordenar.
4. **Mapa 3D Deck.gl** mexe em `/equity-brain/pipeline` — Fase 1 só adiciona colunas dinâmicas; sem conflito imediato.
5. `equity_brain.ai_runs` (legado, 3 rows) coexiste com `api_usage_logs`. Não dropar; sinalizar como deprecated e parar de gravar.
6. **`deals` está vazio** (0 rows) — o "deal" real hoje é `mandate`. O prompt fala "deal" o tempo todo. Decisão técnica: **`mandate_id` é o `deal_id`** para todas as novas tabelas (não criar `deal_id` separado nem repopular `equity_brain.deals`). Pablo precisa confirmar antes da Fase 1.
7. RLS de tabelas novas precisa replicar padrão `has_role(uid,'admin') OR has_role(uid,'advisor')` para CRM, e isolar `legal`/`observer` quando enum for criado.
8. Custo de IA atual está em `api_usage_logs.cost_usd` mas **algumas edge functions piloto não preenchem** (ex.: `mari-brain` recente). Bloco 1.5 padroniza, mas requer revisão de 8-12 functions ao longo das fases.
9. Trigger genérico de `audit_events` em tabelas core (mandates, matches) — risco de loop ou impacto de performance. Mitigar: trigger só em INSERT/UPDATE de colunas explicitamente listadas, e usar `pg_notify` async se necessário.
10. **Backup antes de migration:** Supabase faz PITR automático; mesmo assim, antes de Bloco 1.1 confirmar com Pablo se quer snapshot manual nominal.

---

## Decisões a confirmar antes de iniciar a Fase 1

| # | Decisão | Default proposto |
|---|---|---|
| D1 | Status das iniciativas paralelas (Signup reforma Blocos 3-6, Layout Premium, Mapa 3D) | Aguarda confirmação |
| D2 | `mandate_id` = "deal" canônico nas novas tabelas | **Sim** |
| D3 | Roles `legal`/`observer` via enum (opção A) | **Sim** |
| D4 | 12 etapas visíveis imediatamente ou feature-flag `pipeline_v2_full` | **Feature flag OFF por default** |
| D5 | Manter Supabase Storage com bucket privado dedicado | **Sim** |
| D6 | Clicksign + Pingo como providers-alvo (mock até Fase 5) | **Sim** |
| D7 | Consolidar telemetria IA em `api_usage_logs` + deprecar `equity_brain.ai_runs` | **Sim** |

---

## Pronto para Fase 1?

✅ Descoberta concluída. Aguardando aprovação Pablo das decisões D1–D7 acima antes de iniciar Bloco 1.1 (pipeline + benchmark).
