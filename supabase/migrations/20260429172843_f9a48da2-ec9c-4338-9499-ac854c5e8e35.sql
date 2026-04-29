
-- ===== Extensions =====
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- ===== Trigger: recalcular temperatura ao inserir nova atividade =====
create or replace function equity_brain.tg_rescore_on_activity()
returns trigger
language plpgsql
security definer
set search_path = public, equity_brain
as $$
declare
  fn_url text := 'https://eiprjgotjruiutztjavp.supabase.co/functions/v1/mari-score-temperature';
  anon_key text := 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpcHJqZ290anJ1aXV0enRqYXZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1Nzk5MzYsImV4cCI6MjA4NDE1NTkzNn0.Pnr16DQlNBayUDEcFTvMqch_tZqodKywyVHOtmT6jjE';
begin
  perform net.http_post(
    url := fn_url,
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'apikey', anon_key,
      'Authorization', 'Bearer ' || anon_key
    ),
    body := jsonb_build_object(
      'entity_type', NEW.entity_type::text,
      'entity_id',   NEW.entity_id
    )
  );
  return NEW;
exception when others then
  -- nunca derrubar o INSERT por falha no rescore
  return NEW;
end$$;

drop trigger if exists after_activity_rescore on equity_brain.crm_activities;
create trigger after_activity_rescore
after insert on equity_brain.crm_activities
for each row execute function equity_brain.tg_rescore_on_activity();

-- ===== Cron: temperatura diária (batch) às 03:00 =====
do $$
begin
  if exists (select 1 from cron.job where jobname = 'mari-temperature-daily') then
    perform cron.unschedule('mari-temperature-daily');
  end if;
end$$;

select cron.schedule(
  'mari-temperature-daily',
  '0 3 * * *',
  $cron$
  select net.http_post(
    url := 'https://eiprjgotjruiutztjavp.supabase.co/functions/v1/mari-score-temperature',
    headers := jsonb_build_object(
      'Content-Type','application/json',
      'apikey','eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpcHJqZ290anJ1aXV0enRqYXZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1Nzk5MzYsImV4cCI6MjA4NDE1NTkzNn0.Pnr16DQlNBayUDEcFTvMqch_tZqodKywyVHOtmT6jjE',
      'Authorization','Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpcHJqZ290anJ1aXV0enRqYXZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1Nzk5MzYsImV4cCI6MjA4NDE1NTkzNn0.Pnr16DQlNBayUDEcFTvMqch_tZqodKywyVHOtmT6jjE'
    ),
    body := '{"mode":"batch"}'::jsonb
  );
  $cron$
);

-- ===== Cron: tarefas vencidas viram notificações às 08:00 =====
do $$
begin
  if exists (select 1 from cron.job where jobname = 'crm-tasks-overdue') then
    perform cron.unschedule('crm-tasks-overdue');
  end if;
end$$;

select cron.schedule(
  'crm-tasks-overdue',
  '0 8 * * *',
  $cron$
  insert into public.notifications (user_id, type, title, content)
  select t.assignee_id,
         'task_overdue',
         'Tarefa vencida: ' || t.title,
         coalesce('Vencimento: ' || to_char(t.due_date,'DD/MM/YYYY'), 'Sem data')
  from equity_brain.crm_tasks t
  where t.status = 'open'
    and t.due_date is not null
    and t.due_date < current_date
    and t.assignee_id is not null
    and not exists (
      select 1 from public.notifications n
      where n.user_id = t.assignee_id
        and n.type = 'task_overdue'
        and n.created_at::date = current_date
        and n.title = 'Tarefa vencida: ' || t.title
    );
  $cron$
);

-- ===== RLS auditoria: admins podem listar tudo =====
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname='equity_brain' and tablename='access_logs'
      and policyname='access_logs_admin_select'
  ) then
    create policy access_logs_admin_select
      on equity_brain.access_logs
      for select to authenticated
      using (public.has_role(auth.uid(),'admin'::public.app_role));
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname='equity_brain' and tablename='access_logs'
      and policyname='access_logs_self_insert'
  ) then
    create policy access_logs_self_insert
      on equity_brain.access_logs
      for insert to authenticated
      with check (user_id = auth.uid());
  end if;
end$$;

-- garantir RLS habilitada
alter table equity_brain.access_logs enable row level security;
