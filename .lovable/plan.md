

## Plano: Trocar Ícone do Comprador de Lupa para Cifrão

### Mudança

#### `src/components/map/BusinessMap.tsx` (linha 44)
Substituir o SVG da lupa (circle + line) pelo SVG de cifrão ($) no `buyerIcon`:

```text
Atual: <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
Novo:  <line x1="12" y1="2" x2="12" y2="22"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
```

Este é o path do ícone `DollarSign` do Lucide. Apenas 1 linha alterada.

