## Reforma Bloomberg Terminal — Bloco 0: Inventário

Mapeei o `/painel` atual (`src/pages/Painel.tsx` + `src/components/painel/exec/ExecutiveReport.tsx` + `src/components/cockpit/CockpitWeekStrip.tsx`). Antes de mexer em uma linha de layout, segue o inventário completo do que existe hoje. Sem aprovação, não avanço pro Bloco 1.

### Componentes / seções identificados

| # | Seção | Onde está hoje | Dado vem de |
|---|---|---|---|
| 1 | Saudação "Olá, {nome} 👋" + role badges | `Painel.tsx` linhas 157-174 | `useAuth` + `useEffectiveRoles` + `profiles.full_name` |
| 2 | MariOriginBadge (lead da calculadora) | `Painel.tsx` 178 | sessionStorage `mari_prefill_v1` |
| 3 | Hero "Quanto vale hoje / pode valer 2027 / delta" (3 big cards) | `ExecutiveReport.ValuationTriCard` 117-159 | `valuation_history` (último) → `buildSnapshot` |
| 4 | Gráfico Recharts setor 5 anos + pico 2027 | `ExecutiveReport.SectorTrendChart` 178-235 | `sector_market_trends` |
| 5 | Timeline horizontal 3 cards (Agora · Ideal 2027 · Tarde 2028) | `ExecutiveReport.MarketTimeline` 240-265 | constantes derivadas do snapshot |
| 6 | 4 Pilares ROI (Vendas, CFO, M&A, Crescimento) | `ExecutiveReport.ActionPillars` + `PillarCard` 267-321 | constantes em `painelExecutive.ts` |
| 7 | Resumo ROI consolidado (4 stats em linha) | `ExecutiveReport.RoiSummary` 323-357 | soma dos pilares |
| 8 | "Quem está olhando" — compradores anônimos | `ExecutiveReport.AnonBuyersCard` 359+ | mock/estático (sem fonte real ainda) |
| 9 | CockpitWeekStrip — 5 cards IA da semana | `CockpitWeekStrip.tsx` | `dashboard_insight` + `isp_uf_summary` |
| 10 | KPIs row (Anúncios · Valuations · Captações · Views) | `Painel.tsx` 188-193 + `KPI` 343-357 | `listings`, `valuation_history`, `capital_requests` counts |
| 11 | Modules grid 2×2 (Marketplace · Vender · Avaliar · Captar) | `Painel.tsx` 197-221 | constantes `modules[]` |
| 12 | Card "Complete seu setup" (onboarding 4 checks) | `Painel.tsx` 226-250 | `profile` + `counts` |
| 13 | Card "Atividade recente" (3 últimos anúncios) | `Painel.tsx` 253-273 | `listings` top 3 |
| 14 | Cards contextuais por role (Parceiros / Franqueado / Equity Brain / Admin) | `Painel.tsx` 276-336 | `useEffectiveRoles` |
| 15 | MariWatermark decorativo | `Painel.tsx` 150-154 | asset |

### Dados disponíveis (já consultados hoje)

- **Auth/perfil:** `user.id`, `user.email`, `profiles.full_name`, `profiles.company_name`, `profiles.phone`
- **Roles efetivas:** admin, advisor, franchisee, partnerAccountant, BDR, seller, buyer
- **Counts:** `listings`, `valuation_history`, `capital_requests` (count exact por user)
- **Último valuation:** `valuation_type`, `segment`, `result`, `created_at` → vira snapshot (valorAtual, valorPotencial, gap, gapPct, IC, EBITDA)
- **Anúncios recentes:** top 3 `listings` (id, title, status, created_at)
- **Mercado:** `sector_market_trends` (deals/volume por ano × setor, com pico 2027)
- **Insights IA:** `dashboard_insight` + `isp_uf_summary` (consumidos pelo CockpitWeekStrip)

### Dados que ajudariam mas NÃO existem ainda (só registro — NÃO vou implementar)

- Score Mari real persistido → **será calculado on-the-fly** no Bloco 1 a partir de campos já existentes (tem valuation? tem listing? completude do perfil? counts?)
- "Última sync há X min" → **derivado on-the-fly** do `max(created_at)` entre valuation_history/listings/capital_requests do user
- Feed de atividade unificado → **composição on-the-fly** de `valuation_history` + `listings` + `buyer_profiles` + `auth.user.created_at`, ordenado por data desc (sem tabela nova)
- Agenda real (eventos/calls agendadas) → **não existe** → estado vazio elegante com CTA "Agendar call"
- "Score Mari" como campo no banco → não existe → calculado em runtime
- Compradores ativos por empresa específica do user → o `AnonBuyersCard` atual é estático/mock; manter assim ou trocar por contagem real do `buyer_profiles`/`eb_matches` se aplicável (definir no Bloco 1)
- Nome/setor/faturamento da "Sua Empresa" no painel → vem de `profiles.company_name` (só nome); setor/faturamento não estão no profile do user-padrão — fallback: usar último `listings` do user se houver, senão estado vazio "Cadastre sua empresa"

### Tecnologias visuais já no projeto

- Tailwind + design tokens Mari (Carbon, Volt, Graphite, Bone)
- shadcn `Card`/`Badge`/`Button` (vamos substituir `Card` arredondado por bordas finas no padrão Bloomberg)
- Recharts (mantido)
- Lucide icons
- `font-mono` já usado em alguns números (vamos expandir com `tabular-nums` + tracking-tight)
- Animação custom: precisa adicionar count-up (mini lib ou hook simples) — sem dependência nova, hook próprio

### Escopo confirmado da reforma (do prompt do Pablo)

✅ APENAS reforma visual: layout/tipografia/densidade/cores  
✅ Zero migration, zero query nova, zero edge function nova  
✅ Score Mari e "última sync" calculados em runtime a partir dos dados existentes  
✅ Estados vazios elegantes para tudo que não existe  
✅ Mobile colapsa multi-coluna em vertical priorizada  
✅ 4 blocos sequenciais com checkpoint a cada um

### Próximos blocos (preview, NÃO executar agora)

- **Bloco 1** — Top bar fina + grid 3 colunas above-the-fold (Sua Empresa · Valuation+Compradores · Feed+Agenda)
- **Bloco 2** — Abaixo da fold: gráfico setor + timeline + 4 pilares mini + ROI em linha + "Próxima Ação Mari"
- **Bloco 3** — Polimento Bloomberg (mono em números, bordas finas, cores institucionais, count-up, pulse, hover sutil, estados vazios)

### Pronto para Bloco 1?

Aguardo aprovação. No Bloco 1 entrego: top bar fina (h-12) + grid `grid-cols-1 lg:grid-cols-[24%_52%_24%]` com as 3 colunas densas, Score Mari calculado on-the-fly, Feed composto das 3-4 fontes existentes, mobile responsivo testado em 1920/1280/tablet/mobile.