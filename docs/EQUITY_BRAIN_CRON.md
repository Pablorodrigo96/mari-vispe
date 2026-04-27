# Equity Brain — Cron de recompute de scores

> **Status:** preparado, **NÃO ativo**. Ative manualmente quando quiser.

A Fase 2 prevê recálculo diário dos scores das empresas mais ativas. O snippet
abaixo agenda a chamada via `pg_cron` + `pg_net` (extensões já habilitadas no
projeto na Fase 1).

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
