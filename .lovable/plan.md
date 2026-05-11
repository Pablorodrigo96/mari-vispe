# Limpeza Consolidada — Seções 1, 2, 3 da Auditoria

Executar em **7 blocos sequenciais**, com pausa para validação entre cada um. Após cada bloco eu reporto diff + smoke test e espero o "ok" antes de avançar.

---

## Bloco 1 — Corrigir 9 dead-links (30-60min)

**Substituições via grep+replace:**

| Errado | Correto |
|---|---|
| `/auth/register` | `/auth?tab=signup` |
| `/registrar-comprador` | `/cadastrar-comprador` |
| `/termos` | `/terms` |
| `/privacidade`, `/privacy` | **decisão Pablo** (A: criar página interna placeholder · B: redirect vispe.com.br · C: apontar /terms) — default A |
| `/dashboard` (bare) | `/dashboard/executivo` |
| `/match-inbox` | `/equity-brain/match-inbox` |
| `/pipeline` | `/equity-brain/pipeline` |
| `/crm/buyer/:id` | `/equity-brain/crm/buyer/:id` |
| `/crm/mandate/:id` | `/equity-brain/crm/mandate/:id` |

**Auth.tsx:** garantir leitura de `?tab=signup|login` via `useSearchParams` para abrir tab correta.

**Smoke:** footer Termos/Privacidade, CTA signup, links internos EB.

---

## Bloco 2 — Remover 10 lazy imports sem rota (15min)

Remover de `src/App.tsx`: `EBDashboardPage`, `EBBuyersPage`, `EBTesesPage`, `EBMapaPage`, `EBGrafoPage`, `EBBoardPage`, `QuickFillPage`, `AnatelCruzamentoPage`, `MyCompaniesPage`, `CrmHubPage`.

Para cada um: grep duplo no projeto inteiro. Se zero refs ativas → marcar arquivo para Bloco 4. Se ainda referenciado em outro lugar → remover só o import.

**Smoke:** build OK, bundle reduzido (medir antes/depois).

---

## Bloco 3 — Consolidar 4 dashboards duplicados (1-2h)

**Decisão arquitetural:** `/equity-brain/dashboards/*` vira canônico; `/dashboard/*` vira `<Navigate replace>`.

```tsx
<Route path="/dashboard/executivo" element={<Navigate to="/equity-brain/dashboards/executivo" replace />} />
<Route path="/dashboard/mandato"   element={<Navigate to="/equity-brain/dashboards/mandatos"  replace />} />
<Route path="/dashboard/match"     element={<Navigate to="/equity-brain/dashboards/match"     replace />} />
<Route path="/dashboard/nbo"       element={<Navigate to="/equity-brain/dashboards/propostas" replace />} />
```

**Investigar duplos internos** (reportar antes de remover):
- `ExecutiveDashboardPage` vs `DashboardExecutivoPage`
- `MatchAnalyticsPage` vs `DashboardMatchPage`

---

## Bloco 4 — Remover 14 componentes órfãos não-UI (30-60min)

Mover para `src/_archive/` (não deletar) — adicionar `_archive` ao `tsconfig.app.json` exclude:

`equity-brain/{BuyerCard,DealGraph,SAVBadge}.tsx`, `equity-brain/company/EnrichCompanyButton.tsx`, `equity-brain/crm/{MandateTransitionsTab,MandatesTable,RoleBadges,WhatsAppPanel}.tsx`, `map/MapTopFilterBar.tsx`, `marketplace/BusinessCard.tsx`, `sell/SellWizard.tsx`, `valuation/{UpgradeCard,ValuationHero,ValuationSuccess}.tsx`.

**Procedimento por componente:** grep duplo → se zero refs reais (descontando definição) move para `_archive/`. Suspeitos → reporta antes.

Smoke test a cada batch de 3-4.

---

## Bloco 5 — 9 Shadcn UI + colisão InfoHint (30min)

**Mover para `_archive/ui/`:** `aspect-ratio`, `breadcrumb`, `context-menu`, `hover-card`, `input-otp`, `menubar`, `navigation-menu`, `pagination`, `resizable`.

**Consolidar InfoHint:**
1. Diff entre `admin/analytics/InfoHint.tsx` e `equity-brain/InfoHint.tsx`
2. Mesclar features faltantes no canônico (`equity-brain/InfoHint`)
3. Substituir todos os imports
4. Arquivar `admin/analytics/InfoHint.tsx`

---

## Bloco 6 — Índices em ~26 tabelas (30-60min)

Cada índice = uma migration separada (CONCURRENTLY não roda em transaction). Padrão `idx_<tabela>_<coluna>`.

Tabelas-alvo (FKs comuns `user_id`, `request_id`, `listing_id`, etc.):
- `public`: `valuation_history.user_id`, `valuation_purchases.user_id`, `capital_requests.(user_id,status)`, `capital_matches.request_id`, `capital_messages.request_id`, `capital_timeline.request_id`, `capital_providers.user_id`, `interest_logs.listing_id`, `messages.listing_id`, `partner_activities.partner_user_id`, `franchisee_regions.user_id`, `franchisee_requests.user_id`, `advisor_requests.user_id`
- `equity_brain`: `isp_anatel_imports.created_at`, `buyer_revealed_thetas.buyer_id`, `signal_catalog.*` (validar coluna)

Para cada: confirmar coluna usada em queries reais; verificar índice pré-existente em `pg_indexes`; rodar `EXPLAIN ANALYZE` antes/depois em 3-5 queries representativas.

---

## Bloco 7 — REVOKE EXECUTE + edge function órfã (1-2h)

**7.1 Listar 117 funções DEFINER** chamáveis por anon/auth via `pg_proc` + `has_function_privilege`.

**7.2 Classificar cada uma:**
- **A** Pública por design (manter) — `has_role`, `is_company_visible_in_crm`, `analyze_cnpj_public`, helpers de RLS
- **B** Authenticated apenas → `REVOKE ... FROM anon`
- **C** Advisor/admin apenas → `REVOKE ... FROM anon, authenticated`
- **D** Service_role apenas → `REVOKE ... FROM anon, authenticated`

Priorizar nomes sensíveis: `*_admin_*`, `*_recompute_*`, `*_internal_*`, `*_bulk_*`, `delete_*`, `drop_*`. Casos duvidosos → reportar, não revogar.

Aplicar em batches de ~10 funções com smoke entre cada batch.

**7.3 Edge function órfã `crm-log-activity`:** grep no projeto + cron jobs + outras edge functions. Se zero refs → mover código para `_archive/edge-functions/` (manter deploy Supabase intocado).

---

## Regras globais

1. **Validação dupla** antes de remover qualquer arquivo (grep amplo).
2. **Diff reportado** antes de aplicar batches >10 arquivos.
3. **Pausa entre blocos** — Pablo valida.
4. **Smoke test obrigatório** após cada bloco: login, `/painel`, `/marketplace`, `/mari`, `/equity-brain`, `/equity-brain/crm`.
5. **Dúvida = não remover.** Reportar.
6. Nenhuma correção criativa fora do escopo listado.

---

## Checkpoint Final

Tabela comparativa antes/depois: bundle KB, componentes ativos, rotas declaradas, funções DEFINER abertas a anon, índices, linter Supabase issues, erros TS. Smoke geral. Aí libera Seção 4 da auditoria.

## Decisões necessárias antes de iniciar

1. **`/privacidade`** → opção A, B ou C? (default: A — placeholder interno)
2. **Órfãos** → mover para `_archive/` ou deletar definitivo? (default: `_archive/`)
3. **Funções DEFINER duvidosas** → quero te chamar antes ou seguir conservador (não revogar)? (default: conservador)
