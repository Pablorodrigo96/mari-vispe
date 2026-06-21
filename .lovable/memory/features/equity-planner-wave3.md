---
name: Equity Planner Wave 3 — Buyer Map + DCF/SDE
description: Onda 3 do Equity Planner: buyer map enriquecido com sinergias/exemplos/racional, triangulação de valor (múltiplos + DCF + SDE) e addbacks estruturados.
type: feature
---
- `equity_buyer_archetypes` (seed 18 perfis, 3 por arquétipo de vendedor) é a fonte para o buyer map; cada item de `equity_buyer_map` ancora num `perfil_id` e herda `sinergias_padrao`/`exemplos_targets` quando a IA não preenche.
- `equity_buyer_map` agora tem `setor_alvo`, `sinergias` (jsonb), `racional_premio`, `exemplos_targets` (jsonb).
- `equity_valuations` ganhou `ebitda_contabil`, `valor_dcf`, `valor_sde`, `valor_triangulado`, `dcf_premissas` (jsonb com wacc, cagr_5y, perpetuidade_g, taxa_imposto).
- DCF: 5 anos de FCF=EBITDA×(1-imposto) crescendo a CAGR, descontados ao WACC, + perpetuidade Gordon. SDE = EBITDA + remuneração_dono, com múltiplo de 2.0x (micro) / 2.5x (pequena), 0 acima. Valor triangulado: mix ponderado múltiplos 55% / DCF 30% / SDE 15% (cai pra 70/30 ou 80/20 quando faltar método).
- Addbacks detalhados: remuneracao_dono, despesas_pessoais, nao_recorrentes, aluguel_imovel_proprio, outros. Exibidos como tabela de normalização na tab "Valor".
- Tab Compradores virou rica: por arquétipo cor-codificada (estratégico/financeiro/individual), com sinergias listadas, badges de exemplos de targets e racional do prêmio.
