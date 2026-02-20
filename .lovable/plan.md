
## Varredura Completa: Botões e Textos Invisíveis em Fundos Escuros

### Resumo do problema

O componente `Button` com `variant="outline"` usa `bg-background` por padrão — que é **branco** no tema claro. Em páginas com fundo escuro (`gradient-navy-deep`), esse botão renderiza branco com texto branco: completamente invisível.

Foram encontrados **4 locais com o mesmo bug** ainda não corrigidos:

---

### Local 1 — `src/pages/Sell.tsx` (linha 87)

**Contexto**: Hero com `gradient-navy-deep` (fundo escuro).  
**Botão afetado**: "Já tenho conta" — `variant="outline"` sem `bg-transparent`.

```
// Antes:
className="border-white/20 text-white hover:bg-white/10"

// Depois:
className="border-white/20 text-white hover:bg-white/10 bg-transparent"
```

---

### Local 2 — `src/components/matching/MatchCard.tsx` (linhas 105–122)

**Contexto**: Cards renderizados sobre fundo `gradient-navy-deep` (página `/matching/resultados`).  
**Botões afetados**: "Ver anúncio" e "Consultor" — ambos com `variant="outline"`.

Esses botões já têm `border-primary-foreground/10` e `text-primary-foreground/70`, o que indica que foram projetados para fundo escuro, mas falta `bg-transparent`.

```
// Ambos os botões — adicionar bg-transparent:
className="flex-1 gap-2 border-primary-foreground/10 text-primary-foreground/70 hover:bg-accent/10 hover:text-accent hover:border-accent/30 bg-transparent"
```

---

### Local 3 — `src/pages/MatchingResults.tsx` (linha 123)

**Contexto**: Página com fundo `gradient-navy-deep bg-grid-pattern`.  
**Botão afetado**: "Tentar novamente" (estado de erro) — `variant="outline"` sem `bg-transparent`.

```
// Antes:
className="border-primary-foreground/10 text-primary-foreground/70"

// Depois:
className="border-primary-foreground/10 text-primary-foreground/70 bg-transparent"
```

---

### Local 4 — `src/components/matching/MatchCard.tsx` — Badge (linha 70)

**Contexto**: Badge com `variant="outline"` sobre card com `glass-card` em fundo escuro.  
**Badge afetado**: Badge de tipo "Horizontal"/"Vertical" — `variant="outline"` usa `bg-background` (branco) por padrão.

```
// Antes:
className="text-xs gap-1 border-primary-foreground/10 text-primary-foreground/60"

// Depois:
className="text-xs gap-1 border-primary-foreground/10 text-primary-foreground/60 bg-transparent"
```

---

### Locais SEM problema (descartados)

| Componente | Por quê está OK |
|---|---|
| `Index.tsx` linha 88 | Já tem `bg-transparent` |
| `Index.tsx` linhas 171/202 | Fundo claro (`bg-background`) — branco no branco é correto |
| `ValuationSuccess.tsx` | Fundo claro — comportamento correto |
| `MyProfile.tsx`, `PaymentSuccess.tsx` | Fundos claros |
| `Marketplace.tsx` | Fundo claro |
| `MapFilterSidebar.tsx` | Fundo claro |
| `CapitalHero.tsx` | Usa `glass-card` no Card, sem botão outline problemático |
| `InvestorCTA.tsx` / `InvestorsHero.tsx` | Já corrigidos na iteração anterior |

---

### Resumo das mudanças

| Arquivo | Linha | Fix |
|---|---|---|
| `src/pages/Sell.tsx` | 87 | `+ bg-transparent` no botão "Já tenho conta" |
| `src/components/matching/MatchCard.tsx` | 70 | `+ bg-transparent` no Badge outline |
| `src/components/matching/MatchCard.tsx` | 109 | `+ bg-transparent` no botão "Ver anúncio" |
| `src/components/matching/MatchCard.tsx` | 118 | `+ bg-transparent` no botão "Consultor" |
| `src/pages/MatchingResults.tsx` | 123 | `+ bg-transparent` no botão "Tentar novamente" |

**Total: 2 arquivos modificados, 5 correções de classe Tailwind.**
