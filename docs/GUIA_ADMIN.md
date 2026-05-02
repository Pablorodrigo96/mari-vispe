# Guia do Admin — Equity Brain

Tarefas de manutenção e governança.

## Importações de dados
**/equity-brain/admin/imports** — sobe `.xlsx` ou `.csv` para popular companies, mandates, buyers, contacts, activities. Recálculos automáticos depois do upload.

## Limpeza de duplicatas
**/equity-brain/admin/dedupe** — detecta e mescla empresas/buyers duplicados.

## Paridade Monday
**/equity-brain/admin/monday-parity** — confere se a base do EB casa com a planilha legada do Monday.

## Mapeamento de Advisors
**/equity-brain/admin/advisors-mapping** — atribui mandatos órfãos a advisors. Use depois de cada importação.

## Health
**/equity-brain/admin/health** — dashboard com:
- Status dos cron jobs (refresh dashboards, geração de insights, smoke tests)
- Erros recentes em edge functions
- Resultado dos smoke tests diários

## Cobertura dos dashboards
**/equity-brain/admin/dashboard-coverage** — quais campos estão preenchidos no `eb_v_mandates_full` e impacto nos dashboards.

## Atribuir role a um usuário (SQL)

```sql
INSERT INTO public.user_roles (user_id, role) VALUES ('<uuid>', 'advisor');
-- ou 'admin'
```

Para remover:
```sql
DELETE FROM public.user_roles WHERE user_id = '<uuid>' AND role = 'advisor';
```

## Cron jobs ativos

| Nome | Cadência | O que faz |
|---|---|---|
| `refresh-dashboard-views` | a cada 60s | atualiza materialized views de dashboards |
| `mari-insights-daily` | 06:00 UTC | roda `equity_brain.generate_mari_insights_all()` |
| `daily-smoke-tests` | diário | executa `mari_ops.daily_smoke_tests()` |
| `today-summaries-refresh` | 4h | regenera resumos da Mari para top 50 cards |

Listar com:
```sql
SELECT jobname, schedule, active FROM cron.job;
```
