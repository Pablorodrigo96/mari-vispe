## Problema

Os segmentos **Tecnologia & Telecom (ISP / Provedores de Internet)** e **Telecom (Operadoras / Infraestrutura)** estão mapeados para o benchmark `SaaS`, cujo múltiplo de receita é `6.0x`. Isso gera valuations irreais para ISPs.

## O que o usuário pediu

> "ISP vale de R$ 1.300 a R$ 2.500 por assinante (de 13x receita mensal a 25x receita mensal se for muito bom)"

Considerando ARPU médio de ~R$ 100/mês (R$ 1.200/ano), o múltiplo de receita anual deveria ser ~**1.0x a 2.1x** (média ~1.6x), não 6.0x.

## Alterações propostas

### 1. `src/lib/valuationCalculator.ts`
Adicionar novo benchmark `Telecom` ao `sectorMultiples` com múltiplos realistas para ISP/telecom:
```text
"Telecom": { rev: 1.6, ebitda: 6.5, profit: 10.0 }
```

### 2. `src/lib/sectorMapping.ts`
- Incluir `'Telecom'` no `BenchmarkKey` type.
- Alterar o `benchmarkKey` dos dois labels telecom/ISP de `'SaaS'` para `'Telecom'`:
  - `Tecnologia & Telecom (ISP / Provedores de Internet)` → `Telecom`
  - `Telecom (Operadoras / Infraestrutura)` → `Telecom`

## Resultado esperado

Qualquer valuation feito para empresas dos segmentos telecom/ISP passará a usar múltiplos de ~1.6x receita (ao invés de 6.0x), alinhando o mashup value com a realidade de mercado de provedores de internet no Brasil.