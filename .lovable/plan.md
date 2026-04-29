## Objetivo

Trazer a operação Buyside/Sellside que você opera hoje no Monday para dentro do Equity Brain, mantendo:
- Cadastro rico de **Vendedores** (mandatos sellside) e **Compradores** (buyside) com contato, estado, região, setor.
- **Dashboards** consolidados (totais, status, evolução, por região/setor/responsável).
- **WhatsApp dentro da ficha** do contato (linkado por telefone, com histórico de mensagens enviadas pelo time).
- E o que o Monday não dá: **match automático e adaptativo** — quando o BDR atualiza uma preferência ("não quero mais SP, quero MG"), o motor recalcula matches em segundos e o Painel de Oportunidades reflete na hora.

## O que já temos (não vamos refazer)

- `equity_brain.buyers` — já guarda `ufs_interesse`, `setores_interesse`, `ticket_min/max`, `vertical_principal`, `responsavel_id`, `status`, `pause_signal`, `cautela_flag`, `embedding`.
- `equity_brain.companies` + `has_listing` — vendedores reais + universo nacional.
- `equity_brain.matches` + edge function `match-company-v2` — motor de match com explainability (SHAP).
- `equity_brain.buyer_revealed_thetas` + `update-buyer-revealed-thetas` — aprendizado bayesiano a partir de feedback.
- `equity_brain.deal_events` — eventos de deal (advance/lost/win) já alimentam o motor.
- Páginas: `/equity-brain/buyers`, `/oportunidades`, `/board`, `/dashboard`.

## O que vamos construir

### 1. Modelo de dados — virar um CRM de verdade

Novas tabelas em `equity_brain` (todas com RLS admin/advisor only):

**`mandates` (Sellside — equivalente "Vendedores" do Monday)**
Hoje cada vendedor está implícito em `companies` com `has_listing=true`. Vamos formalizar o **mandato comercial** (contrato Vispe ↔ vendedor):
- `id`, `company_cnpj` (FK companies), `status` enum (`vigente`, `vencido`, `vendemos`, `em_negociacao`, `vendeu_sozinho`, `cancelado`), `exclusividade boolean`, `data_assinatura`, `data_vencimento`, `comissao_pct`, `valor_pedido`, `responsavel_id`, `observacoes`, `region_calc` (gerada do UF da company).

**`contacts` (pessoas — usado por mandate e buyer)**
Inspirado na coluna "Nome do Contato/Telefone/E-mail" das suas planilhas:
- `id`, `entity_type` ('mandate'|'buyer'), `entity_id`, `nome`, `cargo`, `telefone_e164`, `email`, `is_primary`, `whatsapp_opt_in boolean default true`, `notas`.
- Telefone normalizado em E.164 já abre direto no `wa.me/...` (reaproveita `getWhatsAppLink` que já existe em `src/lib/whatsapp.ts`).

**`crm_activities` (timeline unificada — calls/emails/whats/notas)**
- `id`, `entity_type`, `entity_id` (mandate ou buyer), `contact_id` nullable, `kind` ('whatsapp'|'call'|'email'|'meeting'|'note'|'status_change'|'preference_change'), `direction` ('out'|'in'|'system'), `body`, `metadata jsonb`, `created_by`, `created_at`.
- Toda mudança de preferência do buyer e cada WhatsApp enviado vira uma linha aqui → vira a "timeline" da ficha.

**`buyer_preferences_history`**
Snapshot do que mudou em `buyers` (ufs_interesse, setores_interesse, ticket, etc), com `changed_by`, `changed_at`, `diff jsonb`. Trigger preenche automaticamente quando o BDR salva. Serve para auditoria + para o motor saber que precisa rerodar matches.

### 2. Match adaptativo em tempo real

Trigger SQL `on_buyer_preferences_changed` em `equity_brain.buyers`:
- Detecta mudança em `ufs_interesse`, `setores_interesse`, `ticket_min/max`, `vertical_principal`, `pause_signal`.
- Insere job em `equity_brain.engine_runs` com `kind='rematch_buyer'` e `payload={buyer_id}`.
- Insere `crm_activities` com `kind='preference_change'` e diff legível ("Removeu SP, Adicionou MG").

Edge function nova **`rematch-buyer`** (admin/advisor):
- Recebe `buyer_id`, recalcula matches só desse buyer rodando a lógica do `match-company-v2` em modo single-buyer.
- Marca `is_current=false` nos matches antigos do buyer e insere os novos.
- Idempotente, retorna { added, removed, kept }.

Trigger chama `rematch-buyer` via `pg_net` (já está nas extensions do projeto). Resultado: o BDR salva "agora quer MG" → 2 a 5 segundos depois a aba **Oportunidades** desse buyer mostra empresas de Minas no topo.

Bônus aprendizado adaptativo: já existe `update-buyer-revealed-thetas` que atualiza o vetor latente do buyer a partir de `deal_events`. Vamos plugar **um botão "Match Now" na ficha do buyer** que dispara a sequência: `update-buyer-revealed-thetas → rematch-buyer → refresh da view`.

### 3. Novas páginas / UI (estilo Monday)

#### a) `/equity-brain/crm` — Hub Buyside × Sellside

Layout em 2 colunas com header de KPIs (espelha sua tela "Operações Buyside & Sellside"):

```text
┌─ Total Operações | Buyside | Sellside | Em andamento | Concluídas | Canceladas ─┐
├──────────────────────────────────────────────────────────────────────────────────┤
│ Faturamento Vispe | Ticket médio | Comissão acumulada                            │
├────────────────────────────────────┬─────────────────────────────────────────────┤
│  VENDEDORES (Mandatos)             │  COMPRADORES (Buyers)                       │
│  Tabela agrupada por status        │  Tabela agrupada por status                 │
│  cols: Nome | UF | Região | Setor  │  cols: Nome | UF | Região | Setor           │
│       | Contato | Telefone | Email │       | Contato | Telefone | Email          │
│  badges coloridos por região (igual│  ações inline: WhatsApp / Ver matches       │
│  Monday: Sudeste azul, Sul verde,  │                                             │
│  Centro-Oeste laranja, Nordeste    │                                             │
│  vermelho, Norte roxo)             │                                             │
└────────────────────────────────────┴─────────────────────────────────────────────┘
```

Filtros topo: status, UF, setor, responsável, busca textual. Agrupamento toggle (status/região/responsável). Export CSV (já temos `src/lib/exportCsv.ts`).

#### b) `/equity-brain/crm/dashboard` — Dashboards

Recria os charts das suas imagens (recharts, já no projeto):
- Status das operações (barra empilhada Buyside × Sellside)
- Evolução anual de novas operações (área)
- Operações por tipo / Fase do Sellside / Operações por região (donuts)
- Operações por localidade (barra empilhada por UF)
- Valor negociado por ano (linha)
- Comissão anual da Vispe (linha)
- 3 maiores operações realizadas (barra)
- Projetos por responsável (barra empilhada por status)
- Match por estado / região / setor (já temos dados, faltava chart)

#### c) `/equity-brain/crm/mandate/:id` e `/equity-brain/crm/buyer/:id` — Ficha 360°

Layout em abas (Tabs):
- **Visão Geral** — dados cadastrais editáveis inline, status, região (badge), setor, contatos primários.
- **Preferências** (só buyer) — UFs, setores, ticket, exclusões. Ao salvar dispara rematch automático e mostra toast "12 novos matches encontrados em MG".
- **Matches** (buyer) ou **Compradores compatíveis** (mandate) — tabela ranqueada com `match_score`, motivos (chips), botão "Compartilhar via WhatsApp" que copia teaser pronto.
- **WhatsApp** — ver detalhes na seção 4.
- **Timeline** — feed unificado de `crm_activities` (whats, calls, emails, notas, mudanças de preferência, mudanças de status). Cada item com ícone, autor, data relativa.
- **Documentos** — reaproveita VDR existente.

### 4. Aba WhatsApp embutida

Não vamos integrar WhatsApp Business API agora (custa US$, requer aprovação Meta, e seu fluxo atual é manual). Vamos fazer o **assistido**:

- **Botão "Abrir WhatsApp"** em cada contato → abre `https://wa.me/{telefone}?text={template}` em nova aba (Web ou Desktop). Já é assim que vocês operam hoje, só vamos centralizar.
- **Templates rápidos** por contexto (mandate vigente, buyer interessado, follow-up 7d, envio de teaser) — selecionáveis na hora.
- **Log automático**: ao clicar "Abrir", cria `crm_activities` com kind='whatsapp', direction='out', body=template usado. Então a Timeline mostra "WhatsApp enviado por Pablo · há 2min · 'Olá André, tenho um comprador interessado…'".
- **Registro manual de resposta**: campo "Anotar resposta recebida" → cria activity com direction='in'. Mantém o histórico fiel sem custo de API.
- **Painel WhatsApp do dia** na sidebar: lista contatos sem follow-up há mais de N dias (configurável por status).

Plano de upgrade futuro (não nesta entrega): se quiser WhatsApp real bidirecional, adicionar Twilio ou Z-API depois — a estrutura `crm_activities` já está pronta para receber webhooks.

### 5. Sidebar e navegação

Adiciona ao `EBSidebar`:
- "CRM" (icon Users) → /equity-brain/crm
- "Dashboards CRM" (icon LineChart) → /equity-brain/crm/dashboard

A busca por CNPJ no topo já leva à ficha — vamos estender para buscar também por nome de contato/telefone/email.

## Detalhes técnicos

**Migrations** (uma migration única):
1. Cria `mandates`, `contacts`, `crm_activities`, `buyer_preferences_history`.
2. RLS: SELECT/INSERT/UPDATE só para `has_role(auth.uid(),'admin')` OR `has_role(auth.uid(),'advisor')`.
3. Trigger `tg_buyer_pref_change` em `buyers` AFTER UPDATE → escreve em `buyer_preferences_history` + `crm_activities` + chama edge function via `pg_net`.
4. View `eb_mandates_enriched` joinando com companies + contatos primários.
5. View `eb_crm_kpis` agregando os 6 totais do header.
6. Backfill: cria 1 `mandate` para cada `company` com `has_listing=true` no estado `vigente`; migra contato do `listings` correspondente para `contacts`.

**Edge functions**:
- `rematch-buyer` (nova): recebe `buyer_id`, roda single-buyer match, atualiza `matches`.
- `crm-bulk-import` (nova, opcional fase 2): importa CSV exportado do Monday para popular mandates/buyers/contacts de uma vez.

**Componentes novos** (sob `src/components/equity-brain/crm/`):
- `MandatesTable.tsx`, `BuyersTable.tsx` (com agrupamento por status/região), `RegionBadge.tsx`, `StatusBadge.tsx`, `KpiHeader.tsx`, `MandateDetail.tsx`, `BuyerDetail.tsx`, `WhatsAppPanel.tsx`, `WhatsAppTemplatePicker.tsx`, `ActivityTimeline.tsx`, `PreferencesEditor.tsx`, `MatchPreview.tsx` (mini-tabela top 5 matches), `CrmDashboard.tsx`.

**Hooks**: `useMandates`, `useBuyersCrm`, `useActivities(entity)`, `useRematch(buyerId)`, `useCrmKpis`.

**Realtime**: `ALTER PUBLICATION supabase_realtime ADD TABLE crm_activities, matches;` para a Timeline e a aba Matches atualizarem sozinhas quando o motor terminar.

## Entrega em fases

**Fase 1 — Fundação CRM (esta entrega)**
Migrations, RLS, backfill, hub `/equity-brain/crm` com 2 tabelas + KPI header, fichas mandate/buyer com abas Visão Geral, Preferências, Matches, WhatsApp, Timeline. Trigger de rematch + edge function `rematch-buyer`. Templates WhatsApp + log de activities.

**Fase 2 (próxima conversa)**
Dashboards completos `/crm/dashboard`, importador CSV do Monday, painel "WhatsApp do dia", busca global por contato.

**Fase 3 (futuro)**
WhatsApp Business API (Twilio/Z-API) bidirecional, automações ("se mandato vencer em 7d, criar tarefa"), webhooks para Piperun (já temos `piperun-check-lead`).

## Confirmações antes de implementar

1. **Status do mandato** — uso os mesmos da sua planilha (`vigente`, `vencido`, `vendemos`, `em_negociacao`, `vendeu_sozinho`, `cancelado`)? Quer adicionar/remover algum?
2. **Status do buyer** — mantenho os atuais (`ativo`, `pausado`) ou crio (`aguardando`, `em_negociacao`, `vencido`)? Suas planilhas mostram "Aguardando" e "Em negociação".
3. **WhatsApp** — confirma que por agora ficamos no modelo assistido (wa.me + log manual)? Posso já deixar a estrutura pronta para Twilio depois.
4. **Backfill do Monday** — você consegue exportar CSV das duas planilhas (Vendedores e Compradores) para eu importar no go-live, ou prefere começar do zero e alimentar pelo CRM novo?
