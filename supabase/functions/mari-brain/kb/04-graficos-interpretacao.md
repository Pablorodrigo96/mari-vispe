# Como interpretar gráficos do Equity Brain

## Funil (`EBFunnel.tsx`)
Mostra conversão por estágio do pipeline. Topo = leads brutos. Base = closed_won.
- **Largura proporcional** ao volume.
- **% de conversão** entre etapas exibido nas setas.
- **Vermelho** = etapa com gargalo (taxa de drop > 60%).
- Ação: clique em uma etapa para ver os mandatos parados ali.

## Match Quality (`MatchQualityCard.tsx`)
Histograma de scores dos matches ativos.
- Cauda longa à direita = poucos matches "Hot" (oportunidade de re-treinar engine).
- Distribuição achatada = engine genérico demais (falta sinal).

## Match Explainability / SHAP (`MatchExplainabilityCard.tsx`)
Mostra contribuição de cada feature (setor, ticket, geografia, tese) para o score do match.
- Barras verdes = puxam score pra cima.
- Vermelhas = puxam pra baixo.
- Use para explicar ao buyer/seller **por que** sugeriu o match.

## Drift Monitor (`DriftMonitorCard.tsx`)
Compara distribuição v1 vs v2 do scoring engine.
- KS-statistic > 0.2 = drift relevante → revisar features.
- Snapshots em `equity_brain.drift_snapshots`.

## Market Waves (`MarketWavesCard.tsx`)
Heatmap de aquecimento setorial nos últimos 90 dias.
- Calculado por: nº de buyers entrantes + interest_logs + valuations no setor.
- Setor "quente" = priorizar matches naquele vertical.

## Seller Intent (`SellerIntentMonitorCard.tsx`)
Score 0-100 de intenção de venda do seller, baseado em:
- Frequência de login
- VDR readiness crescendo
- Resposta a outreach < 24h
- Pediu valuation recente
> 70 = pronto para fechar; < 30 = re-engajar.

## Equity Gap (Valuation Equity Gap)
Diferença Potential − True Value. Quanto maior, maior a oportunidade de consultoria.

## StageTimeBadge (Pipeline)
Cor do badge no card:
- Verde: dentro do SLA confortável.
- Amarelo: SLA em risco (>50%).
- Vermelho 🔥: **CONGELADO** (>100% SLA) — alerta de oportunidade gelada.
