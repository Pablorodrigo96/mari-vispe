
# Limpeza Estrutural — Seções 1-4 da Auditoria

Execução em **11 blocos sequenciais** (Bloco 9 Claude→Gateway já concluído nas mensagens anteriores). Cada bloco termina com smoke test + relatório curto + **pausa para validação do Pablo**.

## Regras globais
- Validação dupla (grep + confirmação) antes de remover arquivo.
- Componentes órfãos vão para `src/_archive/` com `tsconfig` exclude — não deletar.
- `CREATE INDEX CONCURRENTLY` em migrations separadas (sem transação).
- Em dúvida: parar e perguntar.
- Smoke padrão entre blocos: login → /painel → /mari → /equity-brain → /marketplace.

---

## Bloco 1 — Dead-links (9 padrões)
Substituições globais via grep+replace:
- `/auth/register` → `/auth?tab=signup` (garantir que `Auth.tsx` lê `searchParams.get('tab')`)
- `/registrar-comprador` → `/cadastrar-comprador`
- `/termos` → `/terms`
- `/privacidade` e `/privacy` → criar página interna placeholder `/privacy` (texto LGPD básico, Pablo edita depois)
- `/dashboard` bare → `/dashboard/executivo`
- `/match-inbox`, `/pipeline`, `/crm/buyer/:id`, `/crm/mandate/:id` → prefixar `/equity-brain/...`

Reportar antes de batches >10 ocorrências no mesmo arquivo.

## Bloco 2 — 10 lazy imports sem rota
Remover de `App.tsx`: `EBDashboardPage, EBBuyersPage, EBTesesPage, EBMapaPage, EBGrafoPage, EBBoardPage, QuickFillPage, AnatelCruzamentoPage, MyCompaniesPage, CrmHubPage`. Se algum arquivo for usado fora de rota → manter arquivo, remover só import. Marcar não-referenciados para Bloco 4.

## Bloco 3 — Consolidar 4 dashboards duplicados
1. Adicionar `<Navigate>` em `/dashboard/executivo|mandato|match|nbo` → `/equity-brain/dashboards/...`
2. **Investigar agora** duplos internos do EB:
   - `ExecutiveDashboardPage` vs `DashboardExecutivoPage`
   - `MatchAnalyticsPage` vs `DashboardMatchPage`
   - Grep referências, identificar a viva, arquivar a morta. Se ambas vivas → pausar e pedir decisão.

## Bloco 4 — Arquivar 14 componentes não-UI órfãos
Criar `src/_archive/.gitkeep` + adicionar `"src/_archive"` ao `tsconfig` exclude.
Mover (grep dupla-checado): `equity-brain/{BuyerCard,DealGraph,SAVBadge}.tsx`, `equity-brain/company/EnrichCompanyButton.tsx`, `equity-brain/crm/{MandateTransitionsTab,MandatesTable,RoleBadges,WhatsAppPanel}.tsx`, `map/MapTopFilterBar.tsx`, `marketplace/BusinessCard.tsx`, `sell/SellWizard.tsx`, `valuation/{UpgradeCard,ValuationHero,ValuationSuccess}.tsx`.

## Bloco 5 — UI cleanup + InfoHint
- Arquivar 9 shadcn não usados: `aspect-ratio, breadcrumb, context-menu, hover-card, input-otp, menubar, navigation-menu, pagination, resizable`.
- Consolidar `InfoHint`: mesclar features de `admin/analytics/InfoHint` em `equity-brain/InfoHint`, atualizar imports, arquivar o de admin.

## Bloco 6 — WhatsApp `wa.me` literal
- Substituir literal em `MariResult.tsx:24` por `getWhatsAppLink()`.
- Grep no projeto inteiro por `wa.me/` e padronizar todos via helper.
- Estender helper para aceitar mensagem custom se ainda não aceita.

## Bloco 7 — Índices + buckets restritos
- ~26 `CREATE INDEX CONCURRENTLY IF NOT EXISTS` em FKs comuns (uma migration por índice). Lista base no prompt mestre + completar com auditoria.
- Buckets `avatars` e `listing-images`: restringir LIST (manter SELECT por path conhecido público). Análise + policy proposta dentro do bloco.

## Bloco 8 — REVOKE EXECUTE em DEFINER + edge órfã
1. Listar 117 funções `SECURITY DEFINER` com EXECUTE para anon/auth.
2. Classificar A (públicas), B (auth-only), C (advisor/admin), D (service_role), indecisas.
3. REVOKEs em batches de 10 com smoke entre. Indecisas → reportar.
4. Arquivar edge function `crm-log-activity` (grep + cron.job + chamadas internas zero).

## Bloco 9 — ✅ JÁ FEITO
Claude → Lovable AI Gateway nas 3 funções (`generate-pitch`, `classify-thesis`, `analyze-call`). ANTHROPIC_API_KEY deletada. Marcar como concluído no checkpoint.

## Bloco 10 — Stripe (auditoria + gaps)
Pablo confirma que Stripe "já está funcionando". Então:
1. **Auditar primeiro** estado atual antes de mexer:
   - Existe edge function `stripe-webhook`? Eventos cobertos?
   - `create-checkout` e `customer-portal` passam `idempotencyKey`?
   - Catches retornam `error.message` cru ao client?
2. Reportar achados → Pablo aprova quais lacunas fechar.
3. Possíveis fixes (só se gap real):
   - Criar `stripe-webhook` (handler com `constructEvent`, eventos subscription/checkout/invoice).
   - Adicionar `idempotencyKey` em checkout/portal.
   - Sanear erros: log interno + mensagem genérica ao client (com tratamento específico `StripeCardError`).
4. Configuração do endpoint no Stripe Dashboard + `STRIPE_WEBHOOK_SECRET` fica com Pablo.

## Bloco 11 — Lovable AI: 429/402 + alerta 404
- Garantir que `_shared/apiTrack.ts::trackedAIFetch` trata 429 (retry exponencial, max 3) e 402 (log crítico, erro claro).
- Forçar 12 funções restantes a usar `trackedAIFetch` em vez de fetch direto.
- Criar edge function cron diário 09h `check-ai-health`: conta 404s últimas 24h, se >5 insere notificação para admins.

## Bloco 12 — BrasilAPI + RFB/Anatel + Nominatim + fire-webhook
- **BrasilAPI**: backend usa `trackedFetch`. Criar edge `proxy-brasilapi` com rate limit (10/h anon, 60/h auth) + cache 24h (tabela `brasilapi_cache`). Frontend (`MariCalculator`, `useNationalSearch`) chama proxy.
- **RFB/Anatel Postgres**: criar `_shared/externalPgPool.ts` com pool reutilizado, timeout 10s, telemetria em `api_usage_logs` (`provider='external_pg_rfb|anatel'`).
- **Nominatim**: User-Agent identificável + sleep 1.1s entre requests (TOS-compliant).
- **fire-webhook**: HMAC SHA-256 outbound com header `X-Mari-Signature`, secret `WEBHOOK_SIGNING_SECRET`. Doc de validação para receptores.

---

## Checkpoint final
Tabela comparativa antes/depois: linter Supabase, bundle JS, componentes ativos, rotas, componentes órfãos, índices, funções DEFINER abertas, integrações com telemetria, webhooks com HMAC. Smoke end-to-end final.

---

## Detalhes técnicos relevantes

**Auth.tsx tab param**: verificar se já lê `searchParams.get('tab')` em `useEffect`; se não, adicionar `useState` inicializado com esse valor.

**`_archive` no Vite**: tsconfig exclude já cobre TS, mas garantir que nenhum `import` quebrado fica no código vivo (Vite só processa o que é importado, então sem importações = sem build error).

**Migrations de índice**: cada `CREATE INDEX CONCURRENTLY` em arquivo separado porque Supabase migrations rodam em transação por default; concurrent não funciona em transaction.

**DEFINER classificação**: usar `pg_proc.proacl` + `has_function_privilege` para gerar relatório. Funções na whitelist explícita (helpers RLS, RPCs `*_public`) ficam intocadas.

**Stripe audit primeiro**: evita refazer trabalho. Leio `supabase/functions/stripe-*/index.ts` no início do Bloco 10 e reporto antes de tocar qualquer coisa.

**trackedAIFetch retry 429**: backoff `2^attempt * 1000ms` (1s, 2s, 4s). 402 não faz retry — é falta de crédito, não rate limit.

## Tempo estimado
8-14h trabalho total. Bloco 9 já abatido → ~7-12h restantes. Blocos 8 e 10 são os mais sensíveis (REVOKE pode quebrar features; Stripe é fluxo crítico de receita).

## Ordem de execução
Sequencial conforme numeração. Pausa obrigatória entre blocos. Próximo passo após sua aprovação: **Bloco 1 — Dead-links**.
