
## Correção: Textos Invisíveis (Branco no Branco) em 3 Locais

### Diagnóstico dos 3 Problemas

**Problema raiz comum**: O componente `Button` com `variant="outline"` tem no seu estilo base `bg-background` — que é **branco** no tema claro. Ao ser colocado sobre fundos escuros (`gradient-navy-deep`), o botão fica branco com texto branco → completamente invisível.

**Para o Card de busca**: O componente `Card` tem `bg-card` no seu estilo base (também branco), que sobrescreve a classe `glass-card`. O texto interno usa `text-primary-foreground` (branco no sistema de cores da plataforma) → texto branco sobre fundo branco.

---

### Arquivo 1 — `src/components/investors/InvestorCTA.tsx`

**Problema**: Botão "Falar com Especialista" (linha 47-55) usa `variant="outline"` sem `bg-transparent`, então renderiza com fundo branco (`bg-background`) e texto branco → invisível.

**Fix**: Adicionar `bg-transparent` à className do botão.

```
// Antes:
className="border-white/20 text-white hover:bg-white/10"

// Depois:
className="border-white/20 text-white hover:bg-white/10 bg-transparent"
```

---

### Arquivo 2 — `src/components/investors/InvestorsHero.tsx`

**Problema**: Botão "Quero Captar Recursos" (linha 57) tem o mesmo problema — `variant="outline"` sem `bg-transparent` sobre fundo escuro.

**Fix**: Adicionar `bg-transparent`.

```
// Antes:
className="border-white/20 text-white hover:bg-white/10"

// Depois:
className="border-white/20 text-white hover:bg-white/10 bg-transparent"
```

---

### Arquivo 3 — `src/components/matching/CompanySearchCard.tsx`

**Problema**: O `<Card>` na linha 100 aplica `glass-card` mas o estilo base do Card usa `bg-card` (branco) que sobrescreve o glassmorphism. O texto interno usa `text-primary-foreground` (branco) → invisível sobre fundo branco.

**Fix em 2 partes**:

1. **Background do Card**: Substituir `glass-card` por classes que forcem fundo escuro: adicionar `bg-slate-900/70 backdrop-blur-md` em vez de depender do glass-card customizado, e remover a dependência no bg-card com `!bg-transparent` — ou mais simples, usar uma div em vez do componente Card.

   Solução mais limpa: adicionar `!bg-slate-900/60` para sobrescrever `bg-card` com `!important`:

   ```
   className="max-w-2xl mx-auto !bg-slate-900/60 backdrop-blur-md border-accent/10 shadow-gold"
   ```

2. **Texto interno**: As classes `text-primary-foreground` e `text-primary-foreground/50` ficam corretas com o novo fundo escuro pois `primary-foreground` é branco — na verdade isso ESTAVA correto mas ficava invisível porque o fundo era branco. Com o fundo escuro corrigido, os textos voltam a ser visíveis.

   Porém, para garantir legibilidade também no `<Input>` (linha 120), verificar se `bg-primary-foreground/5` + `text-primary-foreground` + `placeholder:text-primary-foreground/30` estão corretos — com o fundo escuro do card, esses valores funcionam bem.

---

### Resumo das mudanças

| Arquivo | Linhas afetadas | Tipo de fix |
|---------|----------------|-------------|
| `InvestorCTA.tsx` | Linha 50 | Adicionar `bg-transparent` no botão outline |
| `InvestorsHero.tsx` | Linha 57 | Adicionar `bg-transparent` no botão outline |
| `CompanySearchCard.tsx` | Linha 100 | Trocar `glass-card` por `!bg-slate-900/60 backdrop-blur-md` no Card |

**Nenhuma mudança de banco de dados necessária** — tudo é CSS/Tailwind puro.
