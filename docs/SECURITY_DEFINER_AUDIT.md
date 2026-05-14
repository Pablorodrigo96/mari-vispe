# SECURITY DEFINER — Auditoria de funções com `EXECUTE` para `anon` / `authenticated`

Inventário gerado em 2026-05-14 contra `pg_proc` (schemas `public`, `equity_brain`, `mari_ops`).

## Legenda

- **Ação A** — Converter para `SECURITY INVOKER` (não precisa de privilégios elevados).
- **Ação B** — Manter `SECURITY DEFINER` + `REVOKE EXECUTE FROM anon, authenticated` (chamada só por Postgres internamente, jobs, ou service_role).
- **Ação C** — Manter como está (chamada legítima do front; valida role/owner internamente).

> **Critério para B em triggers:** funções de trigger NÃO precisam de `EXECUTE` para nenhum role — o Postgres invoca direto com privilégio do owner da tabela. Logo `REVOKE` é seguro.

---

## Grupo B — REVOKE seguro (triggers + jobs internos)

Todas têm `trig_uses ≥ 1` ou são chamadas só de cron/edge service_role. Risco no front: **zero**.

### Triggers (`equity_brain.*`)
| Função | Origem |
|---|---|
| `enqueue_theta_update_on_deal_event()` | trigger em `deal_events` |
| `guard_isp_promotion()` | trigger em `companies` |
| `guard_synthetic_company_unqualified()` | trigger em `companies` |
| `sync_note_mentions()` | trigger em `entity_notes` |
| `tg_ai_call_to_note()` | trigger em `ai_calls` |
| `tg_buyer_pref_change()` | trigger em `buyer_*` |
| `tg_entity_notes_bump_version()` | trigger em `entity_notes` |
| `tg_match_pitch_to_note()` | trigger em `matches` |
| `tg_opp_pitch_to_note()` | trigger em `opportunities` |
| `tg_opp_thesis_to_note()` | trigger em `opportunities` |
| `tg_rescore_on_activity()` | trigger em `crm_activities` |
| `tg_track_stage_change()` | trigger em `mandates` |
| `trg_emit_buyer_thesis_event()` | trigger em `buyer_theses` |
| `trg_emit_call_event()` | trigger em `ai_calls` |
| `trg_emit_signal_event()` | trigger em `signals` |
| `trg_enqueue_signal_embed()` | trigger em `signals` |
| `trg_sync_listing_to_eb()` | trigger em `public.listings` |

### Triggers (`public.*`)
| Função | Origem |
|---|---|
| `auto_create_partner_reservation()` | trigger |
| `auto_match_providers()` | trigger |
| `calculate_lead_score()` | trigger em `capital_requests` |
| `create_interest_notification()` | trigger em `interest_logs` |
| `create_message_notification()` | trigger em `messages` |
| `create_promo_notification()` | trigger em `listings` |
| `eb_log_pipeline_transition()` | trigger |
| `handle_new_user()` | trigger em `auth.users` |
| `notify_matching_buyers()` | trigger |
| `notify_on_capital_request()` | trigger |
| `notify_partner_interest()` | trigger |
| `notify_partner_interest_response()` | trigger |
| `qualify_reservation_on_vdr()` | trigger |
| `set_listing_codename()` | trigger em `listings` |
| `sla_deadline_setter()` | trigger em `capital_requests` |
| `sync_buyer_profile_to_eb()` | trigger em `buyer_profiles` |
| `sync_capital_request_to_eb()` | trigger em `capital_requests` |
| `sync_listing_bootstrap_eb()` | trigger em `listings` |
| `sync_valuation_to_eb()` | trigger em `valuation_history` |
| `tg_analytics_log_capital_lead()` | trigger |
| `tg_analytics_log_interest_lead()` | trigger |
| `tg_analytics_log_signup()` | trigger em `profiles` |
| `tg_whatsapp_msg_mirror_activity()` | trigger em `whatsapp_messages` |
| `tg_whatsapp_msg_touch_mandate()` | trigger em `whatsapp_messages` |
| `update_lead_score_on_doc()` | trigger em `capital_documents` |
| `update_listing_vdr_readiness()` | trigger em `vdr_documents` |

### Jobs / utilidades chamadas só por edge (service_role) ou admin (`equity_brain.*`)
| Função | Chamada por |
|---|---|
| `_merge_fillup(...)` | helper interno de `merge_*` |
| `auto_promote_pipeline_stage()` | cron |
| `backfill_sv_all(boolean)` | edge admin |
| `bootstrap_all_listings()` | edge admin |
| `bootstrap_company_from_listing(uuid)` | edge admin |
| `compute_mandate_priority(uuid)` | helper |
| `compute_seller_intent_signals_sql()` | edge `compute-seller-intent` (service_role) |
| `dashboard_kpis()` | edge admin |
| `eb_refresh_outcomes()` | cron |
| `generate_mari_insights_all()` | edge `mari-generate-insights` (service_role) |
| `generate_mari_insights_for_advisor(uuid)` | helper |
| `get_dedupe_stats()` | helper de `eb_get_dedupe_stats` |
| `ingest_capital_request(uuid)` | helper de trigger |
| `ingest_valuation(uuid)` | helper de trigger |
| `is_company_visible_in_crm(varchar, varchar)` | usada em RLS de views (não precisa client EXECUTE) |
| `match_crosstab(text)` | helper de `eb_match_crosstab` |
| `merge_buyer_profiles(...)`, `merge_buyers(...)`, `merge_contacts(...)`, `merge_mandates(...)` | edge admin |
| `rebuild_mandate_classification()` | cron |
| `refresh_mandate_priorities(int)` | cron |
| `run_safe_dedupe(text)` | helper de `eb_run_safe_dedupe` |
| `suggest_responsavel(uuid)` | helper |
| `upsert_ai_note(...)` | edge service_role |
| `upsert_buyer_from_profile(uuid)` | helper de trigger |
| `upsert_company_from_listing(uuid)` | edge `sync-listings-to-equity-brain` (service_role) |

### Jobs / utilidades (`public.*`, `mari_ops.*`)
| Função | Chamada por |
|---|---|
| `cleanup_old_rate_limits()` | edge `send-message` (service_role) |
| `eb_event_queue_stats()` / `eb_event_recent_errors(int)` | UI admin (`EventQueueHealthCard`) — **mover para C** |
| `eb_store_advisor_token(uuid, text)` | edge admin |
| `expire_old_reservations()` | cron |
| `find_user_by_meta_name(text)` | edge `eb-import-monday` (service_role) |
| `get_health_recent_errors(int)` / `get_health_summary_24h()` | UI admin — **C** (já checa role) |
| `get_dashboard_coverage()` / `get_dashboard_executivo/mandato/match/nbo()` | UI authenticated — **C** (já checam role) |
| `mari_ops_health_volume_recent(int)` / `mari_ops_record_health(...)` / `mari_ops_record_smoke(...)` | edges (service_role) |
| `mari_ops` `daily_smoke_tests()` | edge `mari-smoke-tests` (service_role) |
| `refresh_dashboard_views()` | cron |

---

## Grupo A — Converter para SECURITY INVOKER (puras / sem privilégio elevado)

Funções puras que não acessam tabelas privadas — RLS do caller resolve.

| Função | Por quê |
|---|---|
| `public.profile_completion(uuid)` | só lê `profiles` + `listings` filtrando por `_user_id`; chamada de `MyProfile.tsx` para o próprio uid → INVOKER OK (RLS de `profiles` permite `auth.uid() = user_id`). |

> Restantes inicialmente listadas como (A) (`buyer_neutral_description`, `buyer_pseudonym`, helpers de `equity_brain` `bucket_*`, `category_to_*`, `margin_score`, `revenue_tier_score`, `porte_from_revenue`) **NÃO são SECURITY DEFINER** — já são INVOKER por padrão. Saíram da lista após inventário detalhado. Nada a fazer.

> Resultado: a Migration 2B fica reduzida a **uma única função** (`profile_completion`).

---

## Grupo C — Manter `SECURITY DEFINER` + EXECUTE público (chamadas legítimas do front)

Cada uma valida `auth.uid()` + `has_role()` internamente OU é desenhada para acesso público.

| Função | Justificativa |
|---|---|
| `public.has_role(uuid, app_role)` | gate central de RLS — TODAS as policies dependem. EXECUTE público é necessário. |
| `public.eb_can_view_identity(varchar, uuid)` | RLS de views cegas usa. |
| `public.get_dashboard_executivo/mandato/match/nbo/coverage()` | filtra `WHERE has_role(auth.uid(), admin/advisor)` no SQL. |
| `public.get_health_summary_24h()` / `get_health_recent_errors(int)` | filtra `WHERE has_role(auth.uid(),'admin')`. |
| `public.eb_dedupe_audit_recent(int)` | filtra `WHERE has_role(auth.uid(),'admin')`. |
| `public.eb_get_drain_job(uuid)` | idem. |
| `public.eb_get_dedupe_stats()`, `eb_run_safe_dedupe(text)` | check admin no corpo. |
| `public.eb_event_queue_stats()`, `eb_event_recent_errors(int)` | UI admin; checam role no corpo. |
| `public.recalculate_sv(text)` | check admin/advisor no corpo. |
| `public.qualify_lead(...)` (2 sobrecargas) | check admin/advisor no corpo. |
| `public.eb_resolve_advisor_mapping(text, uuid)` | check admin no corpo. |
| `public.approve_advisor_request(uuid)` / `approve_franchisee_request(uuid)` | check admin no corpo. |
| `public.reject_advisor_request(uuid, text)` / `reject_franchisee_request(uuid, text)` | idem. |
| `public.eb_dismiss_today_card(...)`, `eb_today_cards(int)` | usam `auth.uid()` para escopo do user. |
| `public.eb_decide_disclosure(...)`, `eb_request_disclosure(...)` | escopo por `auth.uid()`. |
| `public.eb_log_deal_event(...)` | escopo por `auth.uid()`. |
| `public.eb_log_whatsapp_send(...)`, `eb_open_whatsapp_action(...)`, `eb_mark_whatsapp_action(...)` | escopo por `auth.uid()`. |
| `public.eb_notes_similar(uuid, int, double)`, `eb_match_crosstab(text)`, `eb_ai_runs_by_date(date)` | leitura agregada autenticada. |
| `public.eb_upsert_mandate(jsonb)` | check role no corpo. |
| `public.update_mandate_field(uuid, text, text)` | check role no corpo. |
| `public.calculate_sv(varchar)` (equity_brain) — chamada por edge `calculate-vendabilidade-batch` (service_role): ok. |
| `public.calculate_vdr_readiness(uuid)` | leitura simples. |
| `public.get_teaser_view_count(uuid)` | público por design (contador). |
| `public.increment_capital_view(uuid)` | público por design (contador). |
| `public.get_sector_for_user(uuid)` | leitura simples; pode ficar pública. |
| `public.set_provider_budget/enabled` | check admin no corpo (UI admin). |
| `public.auto_assign_next_n(int)`, `bulk_assign_responsavel(uuid[], uuid)`, `rebuild_crm_state()` | UI admin com check no corpo. |
| `public.promote_match_to_deal(uuid)`, `get_deal_timeline(uuid)` | usados pelo CRM authenticated. |

---

## Plano de aplicação (aguardando aprovação)

### Migration 2A (REVOKE — risco zero)

`REVOKE EXECUTE ... FROM anon, authenticated` para todas as funções do **Grupo B** (≈45 funções).

Triggers continuam disparando normalmente. Edges com service_role continuam funcionando (service_role ignora REVOKE).

### Migration 2B (INVOKER — risco baixo)

Apenas `public.profile_completion(uuid)` → `SECURITY INVOKER`. Já lê só `profiles` + `listings` do próprio `_user_id`.

### Documentação

Atualizar `@security-memory` listando o Grupo C como aceito.

### Não-impacto no front

Nenhuma chamada `.rpc(...)` do front depende do Grupo B (auditado via `rg "\.rpc\("` em `src/`).
