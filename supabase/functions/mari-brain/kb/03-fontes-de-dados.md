# Fontes de dados — qual KPI vem de onde

## KPIs do Dashboard executivo
- **Mandatos ativos** ← `equity_brain.mandates` WHERE status = 'active'.
- **Buyers ativos** ← `equity_brain.buyers` (perfil de comprador).
- **Matches Hot do dia** ← `public.eb_matches_enriched` (view security_invoker) ordenado por score, filtrado por percentil.
- **Pipeline** ← `equity_brain.mandates.stage` cruzado com `eb_pipeline_stages`.
- **Deals fechados (ticker)** ← `equity_brain.deal_events` WHERE event_type = 'closed_won'.
- **Origem listings** ← `public.listings` (vendedores que se cadastraram via `/vender`).

## Para o KPI aparecer, preencha:
| KPI | Tabela | Campos obrigatórios |
|---|---|---|
| Equity Score do mandato | listings | annual_revenue, annual_profit, foundation_year, category |
| Match aparecer no Inbox | equity_brain.matches | mandate_id + buyer_id + match_score (gerado por `match-batch`/`matching-engine`) |
| Pipeline mostra mandato | equity_brain.mandates | stage (FK p/ eb_pipeline_stages.key) |
| Buyer geofencing alerta | buyer_profiles | state, city, categories |
| Teaser cego renderiza | listings | codename (auto), annual_revenue, category, state |
| VDR readiness | vdr_documents | doc_category, doc_name, file_url, status='approved' |
| Pipeline duração média | eb_pipeline_transitions | from_stage, to_stage, moved_at |
| Disclosure liberado | access_logs + eb_can_view_identity | advisor solicita via IdentityRevealCard |

## Views centrais
- `public.eb_matches_enriched` — joins de matches + mandate codename + buyer name + last_action_at.
- `public.eb_mandates` — mandates com codename e blind fields.
- `*_blind` — views que escondem identidade.

## Quando dado não aparece
1. **Match vazio**: rodar `crm-detect-new-matches` ou `match-batch`. Verificar `is_current = true`.
2. **Pipeline vazio**: mandato sem `stage` setado → atualizar via QuickEditPopover.
3. **KPI zerado**: provavelmente RLS bloqueando. Logar como advisor/admin, conferir `has_role`.
4. **Buyer não recebe alerta**: faltou `franchisee_regions` ou `categories` no buyer_profiles.

## Edge functions úteis
- `matching-engine` / `match-batch` — gera matches.
- `compute-signals` — sinais de mercado.
- `compute-seller-intent` — intenção de venda.
- `compute-market-waves` — ondas setoriais.
- `compute-drift-snapshot` — drift v1↔v2.
- `eb-import` — importa Excel/CSV.
- `analyze-financial-doc` — equity score via Gemini.
- `claude-generate-pitch` — geração de pitch.
