# Equity Brain — Crons (recompute scores + refresh opportunities)

> **Status:** preparado, **NÃO ativo**. Ative manualmente quando quiser.

As Fases 2 e 5 preveem jobs diários:
- **Fase 2** — recálculo dos scores das empresas mais ativas.
- **Fase 5** — refresh da warm layer `opportunities_ready`.

Ambos rodam via `pg_cron` + `pg_net` (extensões já habilitadas no projeto na Fase 1).

## Por que não está no migration

O SQL contém **service role key** específica do ambiente. Migrations rodam em
todos os ambientes (preview, prod, remix de outros usuários) — colocar segredo
ali vazaria a chave. Por isso, este snippet é executado uma única vez via
`psql` ou ferramenta admin, não via migration.

## Snippet

Substitua `<SERVICE_ROLE_KEY>` pela `SUPABASE_SERVICE_ROLE_KEY` real do
projeto antes de executar:

```sql
SELECT cron.schedule(
  'equity-brain-recompute-scores-daily',
  '0 5 * * *',  -- 05:00 UTC = 02:00 BRT (horário de baixa carga)
  $$
  SELECT net.http_post(
    url     := 'https://eiprjgotjruiutztjavp.functions.supabase.co/calculate-scores',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer <SERVICE_ROLE_KEY>"}'::jsonb,
    body    := '{"limit":5000}'::jsonb
  );
  $$
);
```

## Estratégia de paginação (Fase 5)

Uma chamada de 5.000 empresas leva ~10–30s na edge. Para cobrir os ~50k top
CNPJs, prevemos na Fase 5 uma das duas opções:

1. **Multi-cron**: 10 jobs disparados de hora em hora, cada um com filtro por
   `setor_ma` ou `uf` diferente.
2. **Cursor server-side**: edge function com `offset` paginado, encadeada por
   uma orquestradora.

Por ora (Fase 2), a chamada manual ou cron único de 5k já é suficiente para o
piloto ISP/RS.

## Para desativar

```sql
SELECT cron.unschedule('equity-brain-recompute-scores-daily');
```

## Para inspecionar execuções

```sql
SELECT * FROM cron.job WHERE jobname = 'equity-brain-recompute-scores-daily';
SELECT * FROM cron.job_run_details
 WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'equity-brain-recompute-scores-daily')
 ORDER BY start_time DESC LIMIT 20;
```

---

# Fase 5 — Refresh diário de `opportunities_ready`

Reconstrói a warm layer (top 50k oportunidades) a partir de `matches_enriched`.
Job programado para **06:00 UTC = 03:00 BRT** (baixa carga). O upsert preserva
`status` e `assigned_bdr` de oportunidades já existentes (não atropela o
trabalho do BDR).

## Snippet

Substitua `<SERVICE_ROLE_KEY>` pela `SUPABASE_SERVICE_ROLE_KEY` real:

```sql
SELECT cron.schedule(
  'refresh-opportunities-daily',
  '0 6 * * *',  -- 06:00 UTC = 03:00 BRT
  $$
  SELECT net.http_post(
    url     := 'https://eiprjgotjruiutztjavp.functions.supabase.co/refresh-opportunities',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer <SERVICE_ROLE_KEY>"}'::jsonb,
    body    := '{"top_n":50000}'::jsonb
  );
  $$
);
```

## Para desativar

```sql
SELECT cron.unschedule('refresh-opportunities-daily');
```

## Para inspecionar execuções

```sql
SELECT * FROM cron.job WHERE jobname = 'refresh-opportunities-daily';
SELECT * FROM cron.job_run_details
 WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'refresh-opportunities-daily')
 ORDER BY start_time DESC LIMIT 20;
```

## Estratégia se 50k ficar pesado

- Comece com `top_n=5000` e aumente gradualmente.
- Para distribuir carga, troque o cron único por **vários jobs** com filtros
  específicos (`setor_ma`, `uf`) disparados em horários alternados, ex:
  ```sql
  -- ISPs do Sul às 03h BRT
  SELECT cron.schedule('refresh-opp-isp-sul', '0 6 * * *', $$
    SELECT net.http_post(
      url := 'https://eiprjgotjruiutztjavp.functions.supabase.co/refresh-opportunities',
      headers := '{"Content-Type":"application/json","Authorization":"Bearer <SERVICE_ROLE_KEY>"}'::jsonb,
      body := '{"setor_ma":"isp_telecom","uf":"RS","top_n":5000}'::jsonb
    );
  $$);
  ```

---

# Fase 7 — Consumidor de eventos (`process-event` a cada 1 min)

A Fase 7 é event-driven: triggers em `company_signals`, `call_feedback` e
`buyer_theses` empilham linhas em `equity_brain.events`. O consumidor
`process-event` deve rodar a cada 1 minuto para drenar a fila e disparar
recompute incremental de scores e matches só das entidades afetadas.

`feedback-from-call` já dispara `process-event` em fire-and-forget após cada
call, mas o cron garante que nada fica preso (eventos manuais via SQL,
falhas de rede, etc.).

## Snippet

Substitua `<SERVICE_ROLE_KEY>` pela `SUPABASE_SERVICE_ROLE_KEY` real:

```sql
SELECT cron.schedule(
  'process-events-every-minute',
  '* * * * *',  -- toda minuto
  $$
  SELECT net.http_post(
    url     := 'https://eiprjgotjruiutztjavp.functions.supabase.co/process-event',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer <SERVICE_ROLE_KEY>"}'::jsonb,
    body    := '{}'::jsonb
  );
  $$
);
```

## Para desativar

```sql
SELECT cron.unschedule('process-events-every-minute');
```

## Monitoramento de backlog

```sql
-- Quantos eventos ainda na fila?
SELECT count(*) AS unprocessed FROM equity_brain.events WHERE processed_at IS NULL;

-- Distribuição por status
SELECT processed_status, count(*)
FROM equity_brain.events
GROUP BY 1;

-- Erros recentes (a investigar)
SELECT id, event_type, entity_id, retry_count, error_message, created_at
FROM equity_brain.events
WHERE processed_status = 'error'
ORDER BY created_at DESC LIMIT 20;

-- Eventos que estão presos com retry_count > 0 mas ainda não dropados
SELECT id, event_type, entity_id, retry_count, error_message
FROM equity_brain.events
WHERE processed_at IS NULL AND retry_count > 0
ORDER BY retry_count DESC LIMIT 20;
```

**Alerta sugerido**: se `unprocessed > 1000`, algo está travado — investigue
logs do `process-event`, verifique se `calculate-scores` / `match-company` /
`match-buyer` estão respondendo.

