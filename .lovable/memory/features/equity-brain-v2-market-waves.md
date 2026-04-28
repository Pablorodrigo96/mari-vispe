---
name: Equity Brain v2 Market Waves
description: Etapa 3 do motor — tensão estrutural por (setor, UF) e plug-in wave_pressure no scoring v2.
type: feature
---
Tabela `equity_brain.market_waves` (setor, uf, seller_pressure, buyer_demand, wave_score 0..1) populada por edge function `compute-market-waves` (admin-only, idempotente, upsert por chave setor+uf).
Fórmula: `sigmoid(2*(seller_pressure-0.3)) * sigmoid(2*(buyer_demand-0.2))`. Sem dependência de M&A history.
Plug-in no `match-company-v2`: feature `wave_pressure` adicionada (peso default 0.05), feature `sinergia_movel` renomeada para `semantic_fit` por coerência.
UI: `MarketWavesCard` + `MatchExplainabilityCard` (decomposição estilo SHAP em barras horizontais por feature) na aba "Top v2 Matches" do `/equity-brain/shadow`.
