
# Plano — Security Advisor (Rodada 2)

Já rodei o linter + queries de inventário. Abaixo o plano por fase com tudo que será tocado, **antes** de qualquer migration.

---

## FASE 1 — Correções de baixo risco (1 migration)

### 1.1 Function Search Path Mutable (21 funções)

Todas serão alteradas via `ALTER FUNCTION ... SET search_path = ...` (sem recriar, sem mudar lógica).

**`equity_brain.*` (17 funções)** → `SET search_path = equity_brain, public, pg_temp`
- `bucket_employees`, `bucket_revenue`, `category_to_cnae`, `category_to_setor`, `cnpj_for_listing`, `derive_codename_prefix`, `entity_notes_touch`, `margin_score`, `next_codename`, `porte_from_revenue`, `revenue_tier_score`, `set_company_codename`, `set_updated_at`, `tg_bump_mandate_last_activity`, `tg_sector_research_updated_at`, `tg_set_updated_at`, `touch_deals_updated_at`

**`public.*` (3 funções)** → `SET search_path = public, pg_temp`
- `buyer_neutral_description`, `buyer_pseudonym`, `eb_pipeline_stages_set_updated_at`

**Nenhuma referencia `vector` diretamente** — não preciso incluir `extensions`.

> Os ~150 warnings restantes de "Function Search Path Mutable" no linter são funções **C da extension `vector`** em `public` (operadores `vector_*`, `halfvec_*`, `sparsevec_*`). Esses só desaparecem movendo a extension de schema — fora do escopo desta rodada (já documentado como pendência).

### 1.2 Public Bucket Allows Listing

Buckets `public=true`: **`avatars`** e **`listing-images`**.

Ambos têm policy correta de leitura por nome (`Public read … by name`), e adicionalmente têm policies frouxas que permitem `list()` autenticado:

- `Avatars readable by authenticated (list)` — `bucket_id = 'avatars'`
- `Listing images readable by authenticated (list)` — `bucket_id = 'listing-images'`

**Ação:** `DROP` dessas duas policies. Acesso direto via URL pública continua funcionando (bucket público bypassa RLS no endpoint `/object/public/...`). O que deixa de funcionar é `supabase.storage.from('avatars').list()` no front.

> Preciso confirmar com você: **algum lugar do front chama `.list()` em `avatars` ou `listing-images`?** Se sim, eu mantenho a policy mas restrinjo a admin/owner. Vou fazer um `rg` antes de aplicar.

### 1.3 RLS Enabled No Policy

Apenas **1 tabela** se enquadra: `private.cron_secrets`.

**Ação:** documentar como aceito (acesso só via service_role / `bootstrap_cron_secrets_internal`). Sem policy = ninguém com JWT acessa, que é o comportamento desejado. Atualizo `@security-memory`.

> Os "RLS Enabled No Policy" do linter (185 entradas?) são quase todos falsos-positivos sobre views/MVs em `equity_brain`. Vou confirmar contando, mas não preciso criar policies "vazias" pra silenciar.

---

## FASE 2 — SECURITY DEFINER (auditoria primeiro, sem migration)

Inventário: **~85 funções SECURITY DEFINER** com EXECUTE pra `anon` + `authenticated` em `public`/`equity_brain`/`mari_ops`.

### Entrega da Fase 2 (antes de qualquer mudança)

Vou gerar **um relatório markdown** (`docs/SECURITY_DEFINER_AUDIT.md`) com tabela:

| Schema | Função | Resumo (1 linha) | Chamada por | Precisa SEC DEFINER? | Ação proposta (A/B/C) |

Classificação preliminar (para você revisar):

**(A) Converter para SECURITY INVOKER** — funções que só leem dados que o usuário já enxerga via RLS:
- `public.profile_completion`, `public.buyer_neutral_description`, `public.buyer_pseudonym`, helpers `equity_brain.bucket_*`, `category_to_*`, `margin_score`, `revenue_tier_score`, `porte_from_revenue` (puras, sem acesso a tabela).

**(B) Manter SEC DEFINER + REVOKE de anon/authenticated** — funções de trigger/job/admin:
- Todas as `tg_*`, `trg_*`, `sync_*`, `notify_*`, `update_lead_score_on_doc`, `sla_deadline_setter` (triggers — chamadas pelo Postgres, não pelo cliente).
- `bootstrap_*`, `backfill_*`, `rebuild_*`, `refresh_mandate_priorities`, `run_safe_dedupe`, `merge_*`, `auto_*`, `generate_mari_insights_*`, `eb_refresh_outcomes`, `daily_smoke_tests` — chamadas só por edge functions (service_role) ou admin. Manter EXECUTE só pra `service_role` + roles específicas via `has_role` interno.
- `cleanup_old_rate_limits`, `mari_ops_record_smoke` — service_role only.

**(C) Manter como está + documentar** — chamadas legítimas do front:
- `has_role`, `eb_can_view_identity`, `is_company_visible_in_crm` (gates de RLS — precisam ser executáveis por authenticated).
- `get_dashboard_*`, `get_health_summary_24h`, `eb_dedupe_audit_recent`, `eb_get_drain_job` (já validam role internamente via `has_role(auth.uid(), 'admin')`).
- `recalculate_sv`, `qualify_lead`, `eb_resolve_advisor_mapping`, `approve_advisor_request`, `approve_franchisee_request`, `eb_dismiss_today_card` (validam role/owner internamente).
- `increment_capital_view`, `get_teaser_view_count`, `find_user_by_meta_name` (públicas por design — confirmar caso a caso).
- `profile_completion` (chamada no MyProfile — pode ser INVOKER se RLS permite).
- `create_*_notification`, `notify_*_response` (triggers — vão pra (B), não C).

### Aplicação faseada (após sua aprovação do relatório)

- **Migration 2A:** REVOKEs do grupo (B). Risco: zero pro front. Triggers continuam funcionando porque rodam com privilégio do owner da tabela.
- **Migration 2B:** Conversão (A) → SECURITY INVOKER. Vou listar os pontos do front/edge que chamam cada uma e validar que RLS permite.
- **Documentação (C)** vai pra `@security-memory`.

---

## Pontos a confirmar antes de eu rodar a Fase 1

1. **Posso dropar as duas policies `… readable by authenticated (list)` em `storage.objects`?** Vou rodar `rg "\.list\(" src` antes pra checar se algum hook depende disso.
2. **`private.cron_secrets` sem policy = aceito?** (Confirma que ninguém deveria acessar fora de edge function service_role.)
3. **OK eu seguir gerando o relatório de Fase 2 (`docs/SECURITY_DEFINER_AUDIT.md`) sem aplicar nenhuma mudança ainda?**

## Não-mudanças confirmadas

- Extension `vector` continua em `public` (janela dedicada).
- `eb_pipeline_stages` aberto (config UI).
- `whatsapp_messages` realtime (revisão futura).

## Entregáveis após aprovação

1. **Migration Fase 1** (search_path + drop 2 policies de bucket).
2. **`docs/SECURITY_DEFINER_AUDIT.md`** com classificação completa (A/B/C) — você aprova antes de Migration 2A/2B.
3. Update `@security-memory` ao final de cada fase.
4. Rodar Security Advisor depois e mostrar o diff.
