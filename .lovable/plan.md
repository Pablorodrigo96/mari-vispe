

## Plano: Melhorar Visual do Gap de Equity com Recharts e Animações

### Mudança

Substituir a seção "Gap de Equity" (linhas 470-527) no `ValuationReportDialog.tsx` por uma versão aprimorada com:

1. **Gráfico de barras Recharts** comparando "Valor Atual" vs "Valor Vispe" lado a lado, com cores distintas (cinza vs emerald) e labels de valor no topo
2. **Animação CSS** de entrada (fade-in + scale) no card inteiro
3. **Badge animada** com o percentual do gap pulsando sutilmente
4. **Barra de progresso animada** com transição CSS (width de 0% → valor real) ao entrar em view
5. **Breakdown visual** por método (EV/Receita, EV/EBITDA, P/Lucro) em mini-barras mostrando atual vs potencial para cada um

### Estrutura do gráfico Recharts

```text
|  ████████  ██████████████  |
|  Atual     Valor Vispe     |
|  R$ X      R$ Y            |
```

- `BarChart` com 2 barras agrupadas por método (Receita, EBITDA, Lucro) + barra total Mashup
- Cores: `#94a3b8` (atual), `#10b981` (potencial)
- `LabelList` no topo com valor formatado
- `ChartTooltip` com detalhes

### Arquivo alterado

| Arquivo | Ação |
|---|---|
| `src/components/valuation/ValuationReportDialog.tsx` | Substituir seção Gap de Equity (linhas 470-527) por versão com Recharts BarChart + animações CSS |

Imports adicionais: `BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, LabelList, Tooltip` de `recharts` (já instalado no projeto).

