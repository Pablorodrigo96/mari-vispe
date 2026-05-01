# Guia dos Dashboards Profissionais (Bloomberg-grade)

> 4 dashboards analíticos: Executivo M&A, Mandato, Match e NBO.
> Visual dark/Bloomberg, dados servidos por **materialized views** atualizadas a cada hora.

---

## 1. Quem tem acesso a quais dashboards

| Dashboard | admin | advisor | demais |
|-----------|:-----:|:-------:|:------:|
| `/dashboard/executivo` | ✅ tudo | ✅ só seus dados (RLS) | ❌ |
| `/dashboard/mandato`   | ✅ tudo | ✅ só seus dados (RLS) | ❌ |
| `/dashboard/match`     | ✅ tudo | ✅ só seus dados (RLS) | ❌ |
| `/dashboard/nbo`       | ✅ tudo | ✅ só seus dados (RLS) | ❌ |

Filtragem por advisor é feita em RLS sobre `equity_brain.mandates` (via `responsavel_id = auth.uid()`).

---

## 2. O que cada KPI significa

### Executivo M&A
- **Total Operações**: `count(*)` em `mandates` (Sellside + Buyside).
- **Sellside**: `deal_kind = 'mandato_assinado'`.
- **Buyside**: `deal_kind = 'buyer_mandate'`.
- **Faturamento Vispe (estimado)**: `sum(faturamento_vispe)` — comissão cadastrada no Monday/CRM.

### Mandato
- **Total Mandatos**: `deal_kind IN ('mandato_assinado','buyer_mandate')`.
- **Vendemos**: Sellside com `deal_phase = 'concluido'` ou status equivalente.
- **Vigentes**: ativos (não concluídos, não cancelados).

### Match
- **Total Match**: `deal_phase = 'match'`.
- **Tempo médio**: anos com 1 decimal entre `signed_at` e `match_at`.

### NBO
- **Total NBO**: Sellside `deal_phase = 'nbo'` + Buyside com `nbo_url IS NOT NULL`.
- **Valor total**: `sum(valor_operacao)`.

---

## 3. Como interpretar os gráficos

| Tipo | Quando usado | Ler como |
|------|--------------|----------|
| **Donut** | Composição (status, tipo, executivo) | % do total — clique em fatia filtra |
| **Bar** | Ranking (top executivos, regiões) | Comparação absoluta |
| **Stacked Bar** | Composição ao longo do tempo | Evolução por categoria |
| **Line** | Tendência (12 meses) | Direção e volatilidade |
| **Area** | Volume acumulado | Magnitude no tempo |

Tooltip é dark customizado, sem branco do Recharts default.

---

## 4. Como exportar dados

- Botão **Exportar CSV** no canto superior direito de cada dashboard.
- Exporta o **dataset filtrado** (respeita período, executivo, região).
- Encoding UTF-8, separador `,`, números no padrão US (ponto decimal).

---

## 5. Como filtrar

Filtros disponíveis no header de cada dashboard:
- **Período**: últimos 7/30/90 dias, YTD, custom range.
- **Executivo**: multi-select dos `responsavel_id` visíveis.
- **Região / Estado**: hierárquico.

Filtros **propagam entre todos os charts** do mesmo dashboard via `DashboardFiltersContext`.
LiveIndicator no canto top-right pulsa quando dados são re-fetchados.

---

## 6. Refresh dos dados

- **Hourly automático**: cron `refresh-dashboards-hourly` atualiza as 4 materialized views (`mv_dashboard_executivo`, `mv_dashboard_mandato`, `mv_dashboard_match`, `mv_dashboard_nbo`).
- **Force refresh manual**: `/equity-brain/admin/health` → botão **Refresh dashboards**.
- **Smoke tests diários**: cron `daily-smoke-tests` (03:00) valida frescor + total de mandates e registra alertas em `mari_ops.health_check`.
- Cada dashboard carrega em **< 2s cold**, **< 500ms** após filtro.

---

**Última atualização:** Fase 4 — Dashboards Profissionais (Maio/2026).
