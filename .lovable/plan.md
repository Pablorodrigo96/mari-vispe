
# Correção Urgente — 4 Vulnerabilidades Críticas

Plano em **4 sub-tarefas independentes**. Após cada uma faço **checkpoint** e aguardo seu OK antes de prosseguir.

## Inventário real (já levantado, read-only)

| Vuln | Estado encontrado | Confirmações |
|---|---|---|
| 1 | **6 jobs com service_role_key vazada** + 7 com anon JWT hardcoded | `eb-v2-update-thetas-daily`, `eb-v2-mandate-decay-weekly`, `eb-v2-recompute-incremental-6h`, `equity-brain-recompute-scores-daily`, `process-events-every-minute`, `refresh-opportunities-daily`. Anon (menor): `embed-note-every-10min`, `mari-insights-daily`, `mari-refresh-active-summaries-4h`, `mari-smoke-tests-6h`, `mari-temperature-daily`, `process-match-queue-every-5min`, `eb-v2-drift-snapshot-daily` |
| 2 | `public.system_bots` (1 linha: id/name/created_at) — só referenciada em 1 migration | OK para fechar como service-role-only + admin SELECT |
| 3 | **23 views/MVs** sem `security_invoker` (4 MVs + 19 views). MVs incluídas: `mv_dashboard_executivo/mandato/match/nbo` | 4 são materialized views — `security_invoker` **não se aplica a MV**; tratamento separado |
| 4 | `equity_brain.deals` tem colunas `owner_user_id`, `mandate_id`, `buyer_id`, `cnpj` + 3 policies abertas + 1 DELETE só-admin (já existe) | Modelo de owner é via `owner_user_id` + `mandate_id → mandates.advisor_id` |

## Caveats importantes (ler antes de aprovar)

1. **Rotação da service_role_key:** uso o tool `supabase--rotate_api_keys` (Lovable Cloud rotaciona, atualiza `.env`, invalida a antiga). **Edge functions param por alguns segundos** durante a rotação até o redeploy automático.
2. **`app.settings.service_role_key` NÃO está configurado** no banco hoje. O job de referência `eb-geocode-weekly` chama `current_setting('app.settings.service_role_key', true)` que retorna `NULL` silenciosamente — significa que **esse job está rodando sem autenticação há tempos** (a função aceita por `verify_jwt=false`). Vou armazenar a chave em `vault.secrets` (recomendação Supabase) e ler via função SECURITY DEFINER `private.get_service_role_key()`. Não usar `ALTER DATABASE ... SET` (proibido pelas regras do projeto).
3. **Materialized views (4) não suportam `security_invoker`.** Para essas vou: revogar GRANTs de `anon`/`authenticated` e criar wrapper views com `security_invoker=on` + policies adequadas (ou manter acesso só via RPC).
4. **Smoke tests dependem de você** logar e clicar nas telas — eu valido o que dá pelo banco (counts, RLS deny), você confirma o que dá pela UI.

---

## Sub-tarefa 1 — Service role key vazada 🔴🔴🔴

**Ordem de execução:**

1. **Rotacionar** a service_role_key via `supabase--rotate_api_keys` (invalida a vazada).
2. **Armazenar a nova chave** em `vault.secrets` + criar função `private.get_service_role_key()` SECURITY DEFINER (somente role `postgres` executa).
3. **Refatorar 6 jobs com service_key**: substituir o JWT hardcoded por `'Bearer ' || private.get_service_role_key()` via `cron.alter_job`.
4. **Refatorar 7 jobs com anon JWT**: substituir pela leitura de outra função `private.get_anon_key()` (anon não é segredo, mas centraliza para próxima rotação).
5. **Validar** que `eb-geocode-weekly` (que dependia de setting nunca configurado) volta a ter Authorization válida.
6. **Smoke test:** disparar manualmente cada um dos 13 jobs (`SELECT net.http_post(...)`) e checar status 200. Listar logs em `cron.job_run_details` últimas 2h.

**Checkpoint:** reporto tabela jobname → status HTTP. Aguardo OK.

## Sub-tarefa 2 — `public.system_bots` sem RLS 🔴

1. `ALTER TABLE public.system_bots ENABLE ROW LEVEL SECURITY`
2. Criar policy `system_bots_admin_select` para `authenticated` + `has_role(auth.uid(),'admin')`.
3. Nenhuma policy de INSERT/UPDATE/DELETE para roles públicos — só `service_role` escreve (bypass RLS).
4. Smoke test: SELECT anônimo → bloqueado; SELECT admin → 1 row; migration ainda referencia tabela só em seed → ok.

**Checkpoint:** reporto. Aguardo OK.

## Sub-tarefa 3 — 23 views/MVs sem `security_invoker` 🔴

**Categorização das 23:**

- **Grupo A — 19 views simples** (`eb_companies`, `eb_companies_enriched`, `eb_companies_scored`, `eb_mandates`, `eb_opportunities_ready`, `eb_v_deal_metrics`, `eb_crm_audit_v2`, `mari_insights`, `matches_enriched`, `v_deal_metrics`, `eb_v_mandate_pins`, `api_usage_daily_summary`, `v_analytics_browsers`, `v_analytics_cta`, `v_analytics_devices`, `v_analytics_exit_pages`, `v_analytics_funnel`, `v_analytics_hourly_heatmap`, `v_analytics_retention`): aplicar `ALTER VIEW … SET (security_invoker=on)` em **3 grupos de ~6**. Entre grupos, smoke test (você navega: /painel, /marketplace, /equity-brain/hoje, /equity-brain/crm).
- **Grupo B — 4 materialized views** (`mv_dashboard_executivo`, `mv_dashboard_mandato`, `mv_dashboard_match`, `mv_dashboard_nbo`): `security_invoker` não existe para MV. Vou:
  - `REVOKE SELECT ON … FROM anon, authenticated`
  - `GRANT SELECT TO service_role` (já implícito)
  - Criar **wrapper view** `public.<nome>_secure` com `security_invoker=on` + filtro `has_role(auth.uid(),'admin'::app_role)` (são dashboards admin)
  - Atualizar 4 referências no front (`src/`) para apontar para `_secure`. Vou listar e migrar.

**Atenção blind/identity:** as views `*_blind`, `companies_enriched`, `opportunities_public`, `listings_blind`, `eb_buyers_enriched`, `eb_mandates_enriched` etc. **já têm `security_invoker=on`** (confirmado). Risco zero ali.

**Checkpoint:** reporto após cada grupo. Aguardo OK.

## Sub-tarefa 4 — `equity_brain.deals` policies abertas 🔴

**Modelo definido** (baseado em colunas reais):

| Cmd | Quem | Condição |
|---|---|---|
| SELECT | admin | sempre |
| SELECT | advisor/franchisee | `owner_user_id = auth.uid()` **OR** `mandate_id IN (SELECT id FROM equity_brain.mandates WHERE advisor_id = auth.uid())` |
| INSERT | admin/advisor | `owner_user_id = auth.uid()` no WITH CHECK |
| UPDATE | admin | sempre |
| UPDATE | advisor | só linhas onde já é owner |
| DELETE | admin | (policy já existe) |

Demais roles (seller/buyer/anon): zero acesso.

Steps:
1. `DROP POLICY` nas 3 abertas.
2. `CREATE POLICY` nas 5 novas (admin_select, owner_select, insert_owner, admin_update, owner_update).
3. Smoke test: contar deals visíveis com diferentes JWTs (eu rodo via `SET request.jwt.claim.sub`). Você navega /equity-brain/deal/:id como advisor e admin.

**Checkpoint final:** tabela consolidada das 4 vulns + smoke geral. Memória `mem://constraints/security-baseline` atualizada para impedir regressões.

---

## Arquivos/recursos que mudo

- **Migrations (4)**: uma por vulnerabilidade.
- **Migration extra** para policies de `deals` e revoke das MVs.
- **`src/`**: 4 ocorrências mudando `mv_dashboard_*` → `mv_dashboard_*_secure` (Vuln 3 Grupo B), se confirmar que UI consome direto.
- **Memória**: atualizo `mem://index.md` com baseline de segurança.

## Ordem fixa

1 → checkpoint → 2 → checkpoint → 3 (sub-grupos) → checkpoint → 4 → checkpoint final.

Se aprovar, começo pela **Sub-tarefa 1** (rotação + vault + refactor dos 13 crons).
