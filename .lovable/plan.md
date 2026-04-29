
# Próxima etapa — Fase 3.B: Ativar Mari nas fichas 360° + ciclo automático

A infraestrutura da Fase 3 (edge functions + tabelas + componentes) já existe, mas **só o Hub usa**. As fichas individuais (Mandato 360° e Buyer 360°) ainda não mostram temperatura, sumário de conversa, tarefas, nem botão "Pergunte à Mari". Também falta o ciclo automático que mantém tudo atualizado.

## O que entrega

### 1. Mandato 360° + Buyer 360° integrados com Mari
Em `MandateDetailPage.tsx` e `BuyerDetailPage.tsx`:
- **Header**: `<TemperatureBadge />` ao lado do nome (hot 🔥 / warm 🌤 / cold ❄️) com tooltip explicando o motivo (`temperature_reason`).
- **Drawer "Pergunte à Mari"**: botão fixo no canto que abre `<AskMariDrawer />` já com contexto do mandato/buyer pré-carregado (id passado como prop).
- **Tarefas do contato**: nova aba/seção `<TasksWidget filter={mandateId | buyerId} />` listando tarefas abertas, com botão "+ Nova tarefa" e checkbox para concluir.
- **Sumário inteligente da timeline**: botão "Resumir conversa" no topo da `<ActivityTimeline />` que dispara `mari-summarize-thread` e renderiza `<ConversationSummary />` (3 bullets + sentimento + pendências).
- **Próximas ações específicas**: filtrar `<NextActionsPanel scope="mandate" id={...} />` para mostrar só sugestões daquele contato.

### 2. Ciclo automático (cron + triggers)
- **pg_cron diário (3h da manhã)**: chama `mari-score-temperature` para recalcular temperatura de todos mandatos/buyers ativos. Atualiza colunas `temperature` e `temperature_reason`.
- **Trigger pós-atividade**: ao inserir em `equity_brain.activities`, agendar via `pg_net` chamada assíncrona ao `mari-score-temperature` só para o contato afetado (mantém hot/cold em tempo quase-real).
- **Notificação de tarefas vencidas**: cron diário (8h) cria notificação na tabela `notifications` para o `assignee_id` de cada tarefa `crm_tasks` com `due_date < hoje` e `status='open'`.

### 3. Auditoria de acesso (LGPD-ready)
- **Hook `useAccessLog`**: dispara INSERT em `equity_brain.access_logs` (`{user_id, entity_type, entity_id, action: 'view'}`) ao montar `MandateDetailPage` e `BuyerDetailPage`.
- **Página admin `/equity-brain/crm/admin/auditoria`**: tabela com últimos 500 acessos (quem viu o quê, quando), filtros por advisor e período. Apenas admins.
- **Botão "Exportar CSV"** com os logs filtrados.

### 4. Indicadores de aprendizado visíveis
No Hub e nas fichas:
- `<LearningInsightsCard />` (já criado) ganha conexão real: mostra "X interações aprendidas nas últimas 24h", "Y matches recalculados", "Z preferências reveladas" (consulta `deal_events` + `buyer_revealed_thetas`).

## O que NÃO entra agora
- Kanban arrastável de pipeline (fica para Fase 4).
- Integrações externas (Email/Calendar/CNPJ enrichment) — Fase 4.
- Mobile PWA push — Fase 4.

## Detalhes técnicos

**Migration nova**:
```sql
-- pg_cron: temperatura diária
select cron.schedule('mari-temperature-daily', '0 3 * * *', $$
  select net.http_post(
    url := 'https://eiprjgotjruiutztjavp.supabase.co/functions/v1/mari-score-temperature',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer <service>"}'::jsonb,
    body := '{"mode":"batch"}'::jsonb
  );
$$);

-- pg_cron: tarefas vencidas → notificações
select cron.schedule('crm-tasks-overdue', '0 8 * * *', $$
  insert into public.notifications (user_id, type, title, content)
  select assignee_id, 'task_overdue',
         'Tarefa vencida: ' || title,
         'Vencimento: ' || due_date::text
  from equity_brain.crm_tasks
  where status = 'open' and due_date < current_date and assignee_id is not null;
$$);

-- Trigger: recalcular temperatura ao inserir activity
create or replace function equity_brain.tg_rescore_on_activity()
returns trigger language plpgsql security definer as $$
begin
  perform net.http_post(
    url := 'https://eiprjgotjruiutztjavp.supabase.co/functions/v1/mari-score-temperature',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := jsonb_build_object('entity_type', NEW.entity_type, 'entity_id', NEW.entity_id)
  );
  return NEW;
end$$;
create trigger after_activity_rescore
  after insert on equity_brain.activities
  for each row execute function equity_brain.tg_rescore_on_activity();
```

**Edge function `mari-score-temperature`** ganha modo `batch` (sem id → roda para todos ativos) e modo single (id específico).

**Hooks novos**:
- `useAccessLog(entityType, entityId)` — useEffect dispara INSERT.
- `useEntityTasks(entityType, entityId)` — wrapper de `useCrmTasks` filtrado.

**Componentes a editar** (não recriar):
- `MandateDetailPage.tsx` / `BuyerDetailPage.tsx` — adicionar TemperatureBadge no header, drawer Mari, seção Tarefas, botão "Resumir".
- `LearningInsightsCard.tsx` — trocar mock por queries reais a `deal_events` e `buyer_revealed_thetas`.

**Páginas novas**:
- `src/pages/equity-brain/AccessAuditPage.tsx` (rota `/equity-brain/crm/admin/auditoria`).

## Resultado
Após esta fase, abrir uma ficha de mandato/buyer mostra **na hora**: temperatura atual, tarefas pendentes, próximas ações sugeridas pela IA, botão pra perguntar qualquer coisa à Mari, e o sumário inteligente das últimas conversas. Tudo se mantém atualizado sozinho via cron + triggers, e o admin tem rastro completo de quem viu o quê para LGPD.

**Aprovar para começar?**
