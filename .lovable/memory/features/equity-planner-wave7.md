---
name: Equity Planner Wave 7 — Benchmark & Inteligência de Mercado
description: Tab Mercado posiciona empresa contra peers do mesmo arquétipo+porte via percentis dimensionais e múltiplo EBITDA, com gap pra topo do setor.
type: feature
---
- Nova tabela `equity_dimension_benchmarks` (arquetipo_id × porte × dimensao_key) com p25/p50/p75/p90 + sample_n; seed de 108 linhas (3 arquétipos × 3 portes × 12 dimensões) gerado via DO block parametrizado por base do arquétipo + lift do porte + offset por dimensão (recorrente boost em qualidade_receita; projeto_obra penalty).
- `equity_comps_benchmarks` ganhou colunas `multiplo_p25/p50/p75/top10` + `sample_n`; rows existentes populados via interpolação (p25=min+15%, p50=min+50%, p75=max, top10=max×1.15).
- RLS: leitura pública para `authenticated` (benchmark de mercado é commodity, sem PII).
- Nova aba **Mercado** em `/equity-planner/:id` (componente `EquityMarketTab`):
  - 3 cards de percentil: IPE vs peers (média ponderada dos percentis dimensionais), Múltiplo EBITDA vs peers, e Gap pra topo do setor (R$ adicional se múltiplo subir ao top10).
  - Bar chart "Você vs Mediana vs Top 10%" por dimensão (Volt/cinza/emerald + ReferenceLine em 50).
  - Tabela ordenada por gap, com pílulas P10/P25/P50/P75/P90 + tom (rosa/âmbar/Volt/emerald).
  - Header cohort mostra n amostral + fonte "Vispe comps PME 2025".
- Cálculo de percentil é interpolação linear entre p25/p50/p75/p90, 100% client-side em `EquityMarketTab.tsx`.
