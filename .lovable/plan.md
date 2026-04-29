## Equity Brain CRM — Fase 3: Mari Copilot (IA proativa) + Permissões por advisor

Sobre a Fase 2 já entregue (Hub dashboard, 360° de mandato/buyer, WhatsApp embed, learning loop v2), trazer uma camada de IA proativa que age como copiloto do advisor — sugerindo próximas ações, resumindo conversas, classificando temperatura dos leads e criando tarefas — e uma camada transversal de permissões granulares por advisor para controlar carteira.

---

### 1. Mari Copilot — IA proativa no CRM

#### 1.1 Painel "Próximas ações" (Hub)
Novo card no topo do `/equity-brain/crm` com até 10 sugestões priorizadas:

```text
┌────────────────────────────────────────────────────────────────┐
│ Próximas ações sugeridas pela Mari               [Atualizar]   │
├────────────────────────────────────────────────────────────────┤
│ [URGENTE] Follow-up com Buyer #F042 — teaser enviado há 6 dias │
│           sem resposta. Score 0.87.        [WhatsApp] [Ignorar]│
│ [HOT]     Mandato "Indústria SP" virou hot — 3 buyers          │
│           interagiram em 48h.              [Ver matches]       │
│ [TAREFA]  Agendar call com João (Buyer #F019) — pediu reunião  │
│           ontem no WhatsApp.               [Criar tarefa]      │
└────────────────────────────────────────────────────────────────┘
```

Geradas por edge function `mari-suggest-actions` que combina sinais: dias sem atividade, score de match, último evento, temperatura, SLA. Usa `google/gemini-2.5-flash` para redigir a frase em PT-BR.

#### 1.2 Resumo automático de conversas WhatsApp
Na aba WhatsApp do 360°, botão "Resumir conversa" envia o histórico de `crm_activities` (kind = `whatsapp_sent` + notas manuais coladas) para `mari-summarize-thread`, que devolve:
- Resumo em 3 bullets
- Próximos passos sugeridos
- Sentimento (positivo / neutro / negativo)
- Itens pendentes do advisor

Resultado fica salvo em `crm_activities` como `kind='ai_summary'`.

#### 1.3 Classificação de temperatura (hot / warm / cold)
Edge function `mari-score-temperature` roda diariamente (pg_cron) e por trigger ao registrar atividade. Fórmula híbrida:
- Heurística: dias desde última interação, número de eventos, status pipeline
- IA: lê últimas 5 atividades + notas e ajusta com Gemini

Persistido em `equity_brain.contacts.temperature` + `temperature_updated_at`. Badge no 360° e nos cards do Hub.

#### 1.4 Tarefas geradas por IA
Nova tabela `equity_brain.crm_tasks` (título, due_date, assignee, source = `ai|manual`, related_entity). Mari pode propor tarefas a partir de:
- Resumo de WhatsApp ("ele pediu para enviar infopack até sexta")
- Detecção de SLA ("buyer sem follow-up há 7 dias")
- Mudança de status do mandato

Tarefas aparecem em widget no Hub e na aba Visão Geral do 360°. Advisor aceita / edita / descarta.

#### 1.5 Ask Mari (chat contextual no 360°)
Drawer lateral em `MandateDetailPage` e `BuyerDetailPage` com chat estilo copiloto. Recebe contexto completo do registro (atividades, matches, docs, pipeline) e responde perguntas como:
- "Por que esse buyer não fechou?"
- "Quais 3 buyers eu deveria contactar essa semana?"
- "Redige um WhatsApp de follow-up para esse mandato"

Edge function `mari-chat` mantém histórico em `equity_brain.mari_chat_messages`.

---

### 2. Permissões granulares por advisor

#### 2.1 Carteira por advisor
- Adicionar `owner_user_id uuid` em `equity_brain.mandates` e `equity_brain.contacts`.
- RLS: advisor vê apenas registros onde `owner_user_id = auth.uid()`; admin vê tudo.
- Backfill: migrações atribuem registros existentes ao primeiro admin (auditável).

#### 2.2 Reatribuição e transferência
- Página `/equity-brain/crm/admin/permissoes` (admin only) com:
  - Tabela de advisors + contagem de mandatos/buyers
  - Botões "Transferir carteira" (todos os registros de A → B) e "Reatribuir individual"
  - Cada transferência grava em `crm_activities` (kind=`reassigned`) e em `equity_brain.access_logs`.

#### 2.3 Logs de acesso
Nova tabela `equity_brain.access_logs` (user_id, entity_type, entity_id, action `view|edit|export`, ip, created_at). Trigger leve só em `view` da página 360° (chamada explícita do front, não query a query).

#### 2.4 UI de propriedade
- Avatar + nome do owner no header do 360°.
- Filtro "Meus / Todos / Advisor X" no Hub (admin-only para o "Advisor X").
- Notificações de match novo passam a respeitar owner.

---

### 3. Banco de dados (migrações)

```sql
-- Permissões
alter table equity_brain.mandates add column if not exists owner_user_id uuid;
alter table equity_brain.contacts add column if not exists owner_user_id uuid;
create index on equity_brain.mandates(owner_user_id);
create index on equity_brain.contacts(owner_user_id);

-- Backfill: primeiro admin como dono dos registros legados
update equity_brain.mandates set owner_user_id = (
  select user_id from public.user_roles where role='admin' order by created_at limit 1
) where owner_user_id is null;

-- RLS
create policy "advisor sees own mandates" on equity_brain.mandates
  for select using (owner_user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
-- (políticas equivalentes para update/insert e para contacts)

-- Tarefas
create table equity_brain.crm_tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null, description text,
  due_date date, status text default 'open',           -- open|done|dismissed
  source text default 'manual',                         -- manual|ai
  entity_type text, entity_id uuid,
  assignee_id uuid, created_by uuid,
  created_at timestamptz default now(), completed_at timestamptz
);

-- Temperatura
alter table equity_brain.contacts
  add column if not exists temperature text default 'cold',  -- hot|warm|cold
  add column if not exists temperature_updated_at timestamptz;
alter table equity_brain.mandates
  add column if not exists temperature text default 'cold',
  add column if not exists temperature_updated_at timestamptz;

-- Mari chat
create table equity_brain.mari_chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  entity_type text, entity_id uuid,
  role text check (role in ('user','assistant')),
  content text not null,
  created_at timestamptz default now()
);

-- Access logs
create table equity_brain.access_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid, entity_type text, entity_id uuid,
  action text, ip text, created_at timestamptz default now()
);
```

---

### 4. Edge Functions (Deno + Lovable AI)

| Função | Trigger | Modelo | Saída |
|---|---|---|---|
| `mari-suggest-actions` | invoke do Hub | gemini-2.5-flash | JSON `[{type, entity, message, cta}]` |
| `mari-summarize-thread` | botão na aba WhatsApp | gemini-2.5-flash | resumo + sentimento + pendências |
| `mari-score-temperature` | cron diário + trigger atividade | heurística + gemini-2.5-flash-lite | atualiza coluna temperature |
| `mari-chat` | drawer 360° | gemini-2.5-pro | resposta contextual |
| `mari-task-from-summary` | chamada interna do summarize | gemini-2.5-flash | cria `crm_tasks` source=`ai` |

Todas usam `LOVABLE_API_KEY` já presente no projeto (Lovable AI Gateway, sem custo adicional de configuração).

---

### 5. Componentes novos / alterados

```text
src/components/equity-brain/crm/
  ├─ NextActionsPanel.tsx        (novo) — card no Hub
  ├─ TemperatureBadge.tsx        (novo) — hot/warm/cold
  ├─ TasksWidget.tsx             (novo) — tarefas do dia
  ├─ TaskItem.tsx                (novo)
  ├─ AskMariDrawer.tsx           (novo) — chat contextual
  ├─ ConversationSummary.tsx     (novo) — botão + render do resumo
  ├─ OwnerBadge.tsx              (novo) — avatar do dono
  └─ PermissionsAdminPage.tsx    (novo) — reatribuição em massa

src/pages/equity-brain/
  ├─ CrmHubPage.tsx              (atualizado: NextActionsPanel + TasksWidget + filtro Meus/Todos)
  ├─ MandateDetailPage.tsx       (atualizado: AskMariDrawer + OwnerBadge + tasks na overview)
  └─ BuyerDetailPage.tsx         (atualizado: idem + ConversationSummary na aba WhatsApp)

src/hooks/
  ├─ useCrmTasks.ts              (novo)
  ├─ useMariSuggestions.ts       (novo)
  └─ useAskMari.ts               (novo)
```

---

### 6. Cron e jobs

- `pg_cron` (já habilitado) chamando `mari-score-temperature` 1x/dia às 06:00 BRT.
- Trigger `after insert on equity_brain.crm_activities` que dispara `notify_temperature_recalc` (apenas marca `temperature_stale=true`; recálculo no cron evita custo a cada evento).

---

### 7. Memória do projeto

Atualizar índice com novas memórias:
- `mem://features/mari-copilot` — sugestões, tarefas IA, resumo de conversa, chat contextual.
- `mem://features/crm-permissions` — owner_user_id, RLS por advisor, página de reatribuição, access logs.
- `mem://features/crm-temperature` — heurística + IA, hot/warm/cold, cron diário.

---

### 8. Fora de escopo (próximas fases)

- Integrações externas (e-mail, Calendar, enriquecimento CNPJ) — adiado.
- PWA mobile + push notifications — adiado.
- Kanban arrastável de pipeline — adiado (Hub atual cobre via funil + listas).
- Auditoria LGPD completa (consentimento, anonimização) — apenas access_logs nesta fase.
