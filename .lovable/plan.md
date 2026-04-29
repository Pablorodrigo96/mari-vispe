## Equity Brain CRM — Fase 2: Hub Dashboard, 360°, WhatsApp embed e Match adaptativo v2

Construir, sobre a Fase 1 já entregue (tabelas `mandates`, `contacts`, `crm_activities`, `buyer_preferences_history`, trigger de rematch e edge `rematch-buyer`), o Hub estilo Monday + visão 360° + WhatsApp Web embarcado + loop de aprendizado contínuo do Equity Brain v2.

---

### 1. Hub `/equity-brain/crm` — Dashboard primeiro, listas depois

Layout em duas faixas:

```text
┌──────────────────────────────────────────────────────────────┐
│ KPIs (8 cards): Mandatos ativos · Buyers ativos ·            │
│ Matches gerados (7d) · Match score médio · WhatsApp enviados │
│ (7d) · Teasers entregues · Pipeline R$ · Comissão estimada   │
├──────────────────────────────────────────────────────────────┤
│ Gráficos (Recharts):                                         │
│  • Funil de pipeline (Prospecção→NDA→Teaser→LOI→Fechado)     │
│  • Evolução semanal de matches e atividades (linha dupla)    │
│  • Heatmap regional dos buyers ativos (por UF)               │
│  • Top 10 setores mais demandados vs ofertados (barras)      │
├──────────────────────────────────────────────────────────────┤
│ Sub-abas: [Mandatos] [Buyers] [Atividades recentes]          │
│ Tabela densa, busca, filtros por status/setor/UF/responsável │
└──────────────────────────────────────────────────────────────┘
```

Tabelas reaproveitam `MandatesTable` e `BuyersTable` da Fase 1, agora com filtros avançados e ordenação por score/última atividade.

---

### 2. Visão 360° — `/equity-brain/crm/mandates/:id` e `/buyers/:id`

Layout com header fixo + 4 abas:

```text
Header: Nome · Status · Setor/Região · Ticket · Responsável · Ações rápidas
─────────────────────────────────────────────────────────────────
Aba 1 — Visão geral + Timeline
  • Bloco resumo + KPIs do registro
  • ActivityTimeline (Fase 1) com filtros por tipo
Aba 2 — Matches (SHAP)
  • Lista ranqueada de contrapartes com score
  • Drawer com explicação SHAP (setor/região/ticket/maturidade)
  • Ações: Enviar teaser · Marcar interesse · Descartar (gera deal_event)
Aba 3 — WhatsApp
  • Iframe https://web.whatsapp.com/send?phone=… (E.164)
  • Painel lateral com templates e botão "registrar envio"
  • Auto-log de cada template usado em crm_activities
Aba 4 — Documentos & Pipeline
  • Upload/listagem de NDA, teaser, infopack (Storage bucket crm-docs)
  • Versionamento simples (v1, v2…) e rastreio de quem recebeu
  • Bloco financeiro: ticket, comissão %, comissão R$ estimada,
    probabilidade, data prevista de fechamento (editáveis)
```

Ações rápidas no header: Enviar WhatsApp · Registrar nota · Mudar status · Reatribuir responsável.

---

### 3. WhatsApp embarcado (wa.me + iframe)

- Componente `WhatsAppWebFrame` carrega `https://web.whatsapp.com/send?phone={E164}&text={template}` em iframe sandbox.
- Aviso visual: "É necessário estar logado no WhatsApp Web neste navegador (QR code uma vez)".
- Templates pré-prontos (mandato e buyer) com placeholders `{nome}`, `{empresa}`, `{ticker}`, `{teaser_url}`.
- Cada uso de template grava `crm_activities` com `kind='whatsapp_sent'`, `meta={template, phone, content_preview}`.
- Fallback: botão "Abrir em nova aba" usando `wa.me` (caso iframe seja bloqueado pelo WhatsApp).

---

### 4. Match adaptativo — Aprendizado contínuo (Equity Brain v2)

Aproveitar o loop bayesiano já existente (`buyer_revealed_thetas` + `deal_events`):

1. **Captura de sinais** (novos `deal_events` automáticos):
   - `interest_marked`, `teaser_sent`, `match_dismissed`, `whatsapp_sent`, `status_changed`.
   - Disparados pelas ações da visão 360° e do WhatsApp.
2. **Mudança explícita de preferência** (já implementado na Fase 1):
   - Trigger `tg_buyer_pref_change` registra histórico e chama `rematch-buyer`.
3. **Atualização adaptativa**:
   - Edge function existente do v2 consome novos eventos e ajusta `buyer_revealed_thetas` (peso de setor/região/ticket).
   - `rematch-buyer` passa a considerar tanto preferências declaradas quanto reveladas.
4. **UI de transparência**:
   - Card "Como o Mari está aprendendo sobre este buyer" mostra deltas dos pesos (ex.: "Região MG +18% nas últimas 2 semanas").
   - Badge "Novos matches" no card do buyer quando rematch produz top-N alterado.

Sem confirmação prévia: rematch é silencioso, mas notifica o responsável quando aparece match com score > 0.80 que não estava no top 5 anterior.

---

### 5. Banco de dados (migrations adicionais)

```sql
-- Documentos do CRM (mandato/buyer)
create table equity_brain.crm_documents (
  id uuid primary key default gen_random_uuid(),
  entity_type text check (entity_type in ('mandate','buyer')),
  entity_id uuid not null,
  doc_kind text,            -- nda | teaser | infopack | outro
  version int default 1,
  file_url text not null,
  uploaded_by uuid,
  created_at timestamptz default now()
);

-- Pipeline financeiro por mandato/buyer
alter table equity_brain.mandates
  add column if not exists probability int default 30,
  add column if not exists expected_close_at date,
  add column if not exists commission_pct numeric default 5;

-- Snapshot de top matches para detectar "novos"
create table equity_brain.match_snapshots (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null,
  top_mandate_ids uuid[],
  taken_at timestamptz default now()
);
```

Bucket de Storage `crm-docs` (privado) com RLS por admin/advisor.

RLS em todas as novas tabelas: admin = full; advisor = leitura/escrita do que estiver atribuído; demais = sem acesso.

---

### 6. Edge functions

- **`crm-log-activity`** — endpoint único para registrar atividades a partir do front (whatsapp, nota, status, doc).
- **`crm-detect-new-matches`** — comparara snapshot atual vs anterior e dispara notificação ao responsável quando houver entrada nova com score alto. Roda ao final de `rematch-buyer`.
- **`rematch-buyer`** (já existe) — passa a salvar snapshot e chamar `crm-detect-new-matches`.

---

### 7. Navegação e roteamento

- `EBSidebar`: novo grupo "CRM" com itens **Hub**, **Mandatos**, **Buyers**, **Atividades**.
- Rotas em `App.tsx`:
  - `/equity-brain/crm` (Hub)
  - `/equity-brain/crm/mandates/:id`
  - `/equity-brain/crm/buyers/:id`
- Permissão: admin + role `advisor` (a criar via `app_role`).

---

### 8. Entregáveis da fase

1. Migration nova (documents, pipeline fields, snapshots, bucket, RLS, role advisor).
2. Edge functions `crm-log-activity` e `crm-detect-new-matches`; ajuste no `rematch-buyer`.
3. Páginas: `CrmHub.tsx`, `MandateDetail.tsx`, `BuyerDetail.tsx`.
4. Componentes: `KpiGrid`, `PipelineFunnel`, `MatchesPanel` (com SHAP drawer), `WhatsAppWebFrame`, `DocumentsPanel`, `FinancialPipelinePanel`, `LearningInsightsCard`.
5. Hooks: estender `useCrm` com `useMandate`, `useBuyer`, `useMatchesFor`, `useCrmDocuments`, `useFinancialPipeline`, `useLearningInsights`.
6. Atualização de `EBSidebar` e `App.tsx`.

---

### Memórias a salvar após implementação

- `mem://features/eb-crm-hub` — estrutura dashboard-first.
- `mem://features/eb-crm-360` — abas e ações rápidas.
- `mem://integrations/whatsapp-web-embed` — padrão de iframe e log.
- `mem://features/eb-crm-adaptive-match` — extensão do loop v2 com sinais do CRM.
