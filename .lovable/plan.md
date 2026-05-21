
# Esteira Operacional do Advisor — Roadmap + Bloco 1 detalhado

## Fase 0 — Auditoria (read-only, já feita agora)

**Pipeline e match (Bloco 1, 3)**
- Páginas existentes: `src/pages/equity-brain/PipelinePage.tsx`, `PipelineKanbanPage.tsx`, `PipelineHistoryPage.tsx`, `MatchInboxPage.tsx`, `MatchDetailPage.tsx`, `MandateDetailPage.tsx`, `MandateFormPage.tsx`.
- Componentes: `FinancialPipelinePanel`, `PipelineFunnel`, `PipelineStagesEditor`, `MatchDetailDrawer`, `MatchInboxRow`. Hooks `useMatchInbox`, `usePipelineStages`.
- Não existe aba "Prospecção" hoje no Pipeline; o Kanban é dirigido por `eb_pipeline_stages` (tabela editável por admin).

**Tabelas de "lead/contato pré-mandato"**
- Não existe `prospects` / `leads` / `prospect_contacts`. Existe `eb_contacts` (contatos vinculados a entidades — empresa/mandato/buyer; campos: nome, cargo, telefone_e164, email, etc.) e `mari_leads` (leads do /mari calculator).
- Mandatos vivem em `eb_mandates` (com `pipeline_stage`, `deal_type`, `responsavel_id`, `comissao_pct`, contato no próprio registro). Vistas: `eb_mandates_enriched`, `eb_v_mandates_full`.
- → **Decisão:** criar tabela nova `public.prospect_contacts` (não cabe em `eb_contacts` porque o conceito é diferente: lead pré-mandato com endereço postal, status próprio, side sell/buy). Vincular a `eb_mandates.id` quando converter.

**Bloco 2 (cartas/gráfica)**
- Não existe `app_settings` genérica. Existem `api_settings`, `integrations_config` (key/value). → reaproveitar `integrations_config` (chaves `printshop.*`) em vez de criar tabela nova.
- Não há edge function Resend nem template de carta. Não há Puppeteer/jsPDF no backend (só client-side em `ValuationReportDialog`/`DCFReportDialog`).
- → Bloco 2 vai introduzir: bucket `prospect-letters`, edge `prospect-generate-letters` (PDF server-side), edge `prospect-send-batch-to-printshop` (Resend).

**Bloco 3 (deal_pairs)**
- Não existe `deal_pairs`. Match aprovado em `MatchDetailPage` hoje apenas marca match no inbox.
- `eb_mandates` tem `deal_type` (sell/buy) — vai servir de base para o pareamento.

**Bloco 4 (NBO/NDA legal)**
- `doc_templates` já tem `legal_nda_v1`, `legal_nbo_v1`, `legal_spa_v1`, `legal_ts_v1`, `nda_mutuo`, `loi_v1`, etc. com `template_body`, `customizable_fields`, `static_clauses`, `parts`, `preferred_model`.
- `LegalDocumentGenerator.tsx` + edge `mari-generate-document` + tabelas `deal_documents`, `legal_homologations`, `internal_signatures` já existem (memória `legal-document-ai-pipeline`).
- → Bloco 4 vai: criar `nbo_drafts` (estado do wizard 7 steps), reescrever `template_body` dos templates `legal_nda_v1` e `legal_nbo_v1` para refletir os modelos oficiais Vispe dos Apêndices B e C, criar UI do wizard.

**Bloco 5 (email + PDF consolidado)**
- Dependências: Resend (Bloco 2), `deal_documents` (já existe), `internal_signatures` (já existe), `legal_homologations` (já existe).

## Roadmap macro (5 blocos)

| Bloco | Objetivo | Estimativa | Dependências |
|------|---------|-----------:|-------------|
| **1** | Aba Prospecção no Pipeline (lista, filtros, seleção em lote, modal +contato) | 12–16h | nenhuma |
| **2** | PDF de carta + envio Resend pra gráfica + admin config + histórico de lotes | 18–24h | Bloco 1 (`prospect_contacts.status='letter_queued'`) |
| **3** | Fusão de mandatos em `deal_pairs` no aprovação do match + segregação de parceiros via view | 16–22h | nenhuma (independe de 1 e 2) |
| **4** | Wizard NBO 7 steps + reescrita templates oficiais NDA/NBO | 22–30h | Bloco 3 (`deal_pair_id` é o owner do draft) |
| **5** | Email automático pós-assinatura + PDF consolidado do deal | 12–16h | Bloco 2 (Resend) + Bloco 4 (docs assinados) |

Cada bloco entrega PR isolado, smoke test e PAUSE para Pablo validar antes do próximo.

## Bloco 1 — Detalhado (entrega agora)

### 1.1 Migration: `public.prospect_contacts`

Campos (resumo): owner_advisor_id, side (buy/sell), contact_name + first_name gerado, company_name, cnpj, city, state, sector, email/phone/whatsapp, postal_address + zipcode, status (new/letter_queued/letter_sent/letter_delivered/contacted/meeting_scheduled/mandate_signed/no_response/declined/archived), source (outbound/cfo_referral/partner_referral/inbound/event/other), source_notes, converted_to_mandate_id FK→`eb_mandates(id)` ON DELETE SET NULL, converted_at, notes, tags text[], last_contact_at, next_followup_at, timestamps.

Índices: owner_advisor_id; status (parcial sem archived/mandate_signed); side; next_followup_at parcial.

### 1.2 RLS

- `prospect_owner_all` — advisor dono (USING/WITH CHECK `owner_advisor_id = auth.uid()`).
- `prospect_admin_all` — `has_role(auth.uid(), 'admin')`.
- `prospect_franchisee_read` — franqueado vê contatos cuja UF está em `franchisee_regions.states` do user (reaproveita schema atual; sem `franchise_id` próprio).

### 1.3 UI

- **Página:** adicionar aba "Prospecção" como primeira em `src/pages/equity-brain/PipelinePage.tsx` (ou rota `/equity-brain/pipeline?tab=prospeccao`).
- **Componente novo:** `src/pages/equity-brain/pipeline/ProspectionTab.tsx`.
- Layout: tabela densa (linhas 36px, `tabular-nums`), filtros sticky (lado, status, setor, busca) via query params, sticky bottom bar de ações em lote quando ≥1 selecionado.
- Seleção: Shift+click range, Cmd/Ctrl+click toggle.
- Botão "Gerar carta em lote" desabilita se algum selecionado não tem `postal_address` (toast + linhas em âmbar). Em Bloco 1 o botão só valida — geração real entra no Bloco 2.
- Paginação infinite scroll (50/página).
- Estado vazio: "Nenhum contato em prospecção. Cadastre o primeiro."
- **Modal +Novo contato:** campos do schema, CNPJ → autocomplete via `company-lookup` edge (já existe), validação CNPJ/UF/CEP, submit cria com `owner_advisor_id=auth.uid()`, `status='new'`.

### 1.4 Hook

`src/hooks/useProspectContacts.ts` com `useProspectContacts(filters, page)`, `useCreateProspectContact()`, `useUpdateProspectStatus()` (bulk via `.in('id', ids)`). React Query, invalidação `['prospect-contacts', filters]`.

### 1.5 Sidebar

- Nenhuma mudança — aba vive dentro de Pipeline.

### 1.6 Smoke test obrigatório

1. Criar 5 contatos (3 sell, 2 buy).
2. Shift+click 3 → barra "3 selecionados".
3. Filtro `side=sell` mostra 3.
4. Selecionar contato sem endereço + 1 com endereço → "Gerar carta em lote" mostra erro + destaca âmbar.
5. Mudar status de 2 em lote.
6. Login como advisor B → não vê contatos do A.
7. Mobile 375px: filtros viram dropdown, tabela vira lista de cards.

### 1.7 Entregáveis Bloco 1

- Migration aplicada
- RLS validada com 2 advisors
- Aba "Prospecção" funcional
- Modal de novo contato com validações
- Seleção em lote operacional (validação only)
- Smoke test com screenshots (desktop, mobile, modal, estado vazio)
- Sem `any` introduzido

## Detalhes técnicos / decisões

- **Schema:** tudo em `public` (não há schema `equity_brain` no projeto). Manter padrão do codebase.
- **FK em mandato:** `converted_to_mandate_id REFERENCES public.eb_mandates(id)` (não `deals`, pois mandato é a tabela canônica).
- **Numeradores e codenames** ficam para Blocos 2/3.
- **Sem emoji** na UI (regra do prompt). `tabular-nums` em datas. Verde Volt restrito a CTA primário + selo de status ativo.
- **Mobile-first:** testar em 375px antes de fechar.
- **Audit:** `audit_events` ganha `event_type='prospect_contact_created'` e `'prospect_contact_bulk_status_change'`.

## Fora de escopo Bloco 1

- Geração de PDF, envio pra gráfica, integração Resend → Bloco 2.
- Importação massiva (CSV/Excel) de leads → backlog.
- Workflows automáticos de follow-up → backlog.

## ⏸ Pause pós-Bloco 1

Após implementação, entrego diff + 4 screenshots + log do smoke. Pablo valida e libera Bloco 2.
