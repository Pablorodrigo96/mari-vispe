# Premissas, scores e fórmulas

## Equity Score (0–100)
Calculado pela função `calculate-scores` (e `analyze-financial-doc` via Gemini). Componentes:
- **Crescimento de receita** (CAGR 3 anos)
- **Margem EBITDA** (peso alto)
- **Recorrência** de receita
- **Concentração de clientes** (penalidade se top 5 > 50%)
- **Documentação completa** (vdr_readiness)
- **Idade da empresa** (foundation_year)
- **Setor** (multiplicadores por categoria)

Onde aparece: `listings.equity_score`. Atualizado por trigger ou edge function.

## True Value × Estimated Value × Potential Value (Diagnóstico)
Modelo de 3 valores no Valuation Diagnostic:
- **Estimated Value** = valor "bruto" pelo múltiplo do setor.
- **True Value** = Estimated * (1 - Σ degradações). 12 itens de degradação (ex: dependência do dono -15%, sem contrato com clientes -8%, ausência de governança -5%, passivos não mapeados -10%).
- **Potential Value** = valor após corrigir degradações em 12-24 meses. Gera lead de consultoria (Equity Gap).

Tooltip oficial em `src/lib/ebTooltips.ts`.

## Match Score & Tiers Dinâmicos
- Score absoluto vai de 0 a ~100, mas distribuição real fica em 30-57.
- Tier por **percentil** sobre top 2.000 matches ativos:
  - **🔥 Hot** = Top 10% (p10), threshold mínimo 40.
  - **⚡ Warm** = Top 30% (p30), threshold mínimo 30.
  - **Outros** = morno.
- Hook: `useMatchPercentiles()`.
- Lógica: `useMatchInbox.ts`.

## SLA do Pipeline
- Cada etapa tem `sla_days` em `eb_pipeline_stages`.
- `StageTimeBadge` mostra tempo desde última transição:
  - Verde: < 50% do SLA
  - Amarelo: 50-100% do SLA
  - Vermelho: > 100% (deal CONGELADO — alerta)
- Tabela `eb_pipeline_transitions` registra cada movimentação para histórico de duração.

## Adaptive Loop (Equity Brain v2)
- `buyer_revealed_thetas` é atualizado por feedback de `deal_events` (Bayesian update).
- Quando advisor marca match como "good fit" ou "rejected", o vetor de preferência do buyer aprende.
- Drift snapshots v1↔v2 medem evolução do modelo.

## Disclosure (Blind → Identidade Revelada)
- Default: identidade oculta, só codename visível.
- Advisor pode pedir disclosure por buyer/mandato → registrado em `access_logs` (LGPD).
- Função: `eb_can_view_identity(uid, mandate_id)`.
