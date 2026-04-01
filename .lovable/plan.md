

## Plano: Corrigir Botão "Anunciar Grátis"

### Problema
O botão "Anunciar Grátis" no Header (desktop e mobile) não tem nenhuma ação — é um `<Button>` sem `onClick` nem `Link`.

### Solução
Transformar o botão em um link para `/vender` (se logado) ou `/auth?redirect=/vender` (se não logado), tanto no desktop quanto no mobile.

### Mudanças em `src/components/layout/Header.tsx`

1. **Desktop** (linha ~138): Trocar `<Button>` por `<Button asChild>` com `<Link to="/vender">`
2. **Mobile** (linha ~178): Mesmo ajuste

Ambos os botões apontarão para `/vender`. A página `/vender` já faz o redirect para auth se o usuário não estiver logado.

| Arquivo | Acao |
|---|---|
| `Header.tsx` | Adicionar `asChild` + `<Link to="/vender">` nos 2 botões "Anunciar Grátis" |

