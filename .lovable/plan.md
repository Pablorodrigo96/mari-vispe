## Sub-tarefa 3 — `security_invoker=on` em 16 views públicas

### Descoberta (read-only)

Inventário atualizado de `pg_class` em `public` confirmou:

- **Total de views (`relkind='v'`)**: 60
- **Já com `security_invoker`**: 44 ✅
- **Faltando `security_invoker`**: **16**
- **Materialized views reais (`relkind='m'`)**: **0** — os antigos `mv_dashboard_*` são views normais (já com `security_invoker=true`). Não há MV para tratar com wrapper.

Isso simplifica drasticamente o plano original (Sub-tarefa 3 caiu de ~23 alvos com wrappers para 16 ALTER VIEW simples, zero código front-end).

### 16 views alvo

Agrupadas por domínio para facilitar smoke test:

**Grupo A — EB / CRM (6)**
1. `eb_companies`
2. `eb_companies_enriched`
3. `eb_companies_scored`
4. `eb_mandates`
5. `eb_opportunities_ready`
6. `eb_v_deal_metrics`
7. `eb_crm_audit_v2`

**Grupo B — Analytics (7)**
8. `v_analytics_browsers`
9. `v_analytics_cta`
10. `v_analytics_devices`
11. `v_analytics_exit_pages`
12. `v_analytics_funnel`
13. `v_analytics_hourly_heatmap`
14. `v_analytics_retention`

**Grupo C — Misc (2)**
15. `api_usage_daily_summary`
16. `mari_insights`

### Execução (1 migration única)

Uma única migração com 16 `ALTER VIEW ... SET (security_invoker = on);`. Sem mudanças em RLS, sem mudanças em código front-end, sem alteração de schema. Operação idempotente e reversível.

```sql
ALTER VIEW public.eb_companies SET (security_invoker = on);
ALTER VIEW public.eb_companies_enriched SET (security_invoker = on);
-- ... (14 outras)
```

### Por que isso resolve

Com `security_invoker=on`, a view passa a respeitar as RLS policies do **usuário que consulta** em vez das do criador da view (superuser/postgres). Isso fecha a brecha em que tabelas RLS-protegidas vazavam dados via view.

### Validação pós-migration

1. **Linter** roda automático após migration → contagem de "Security Definer View" deve cair em ~16.
2. **Smoke front-end** (manual, Pablo no painel `/painel`, `/equity-brain/crm`, `/admin/analytics`):
   - Painéis EB carregam normalmente para admin/advisor.
   - Vendedor-puro continua sem ver dados sensíveis (codename funcionando).
   - Dashboard analytics renderiza gráficos para admin.
3. **Risco**: se alguma view referenciava tabela sem RLS adequada, query pode passar a retornar 0 linhas para certos roles. Mitigação: rollback rápido com `ALTER VIEW ... RESET (security_invoker)` ou `SET (security_invoker = off)`.

### Detalhes técnicos

- Não há `relkind='m'` em `public` → o plano original de "criar wrapper views para 4 MVs" é descartado por inexistência.
- Não há mudanças em `src/`; o front-end consome as views via Supabase client e não muda contrato.
- `mem://index.md` ganha uma linha em Core: "Todas as views em `public` rodam com `security_invoker=on`."

### Próximo passo após aprovação

Após smoke OK, libero **Sub-tarefa 4** (políticas abertas em `equity_brain.deals`: trocar 3 USING(true) por policies por role).
