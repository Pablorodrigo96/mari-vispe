## Goal
Aumentar o contraste das letras cinzas no menu lateral (`AppSidebar`) sem alterar o resto do app.

## Problema
No `AppSidebar.tsx`, os rótulos de grupo ("VISÃO GERAL", "MARKETPLACE", "VENDER"…) e os itens filhos inativos ("Painel", "Meus anúncios"…) usam a classe utilitária `text-muted-foreground`, que mapeia para `--muted-foreground` global (`0 0% 65%` no tema dark). Contra o fundo quase preto da sidebar (`--sidebar-background: 0 0% 4%`) o texto fica apagado.

Não dá pra simplesmente aumentar `--muted-foreground` porque essa variável é usada em todo o app (cards claros, descrições, formulários etc.) — clarear globalmente quebraria contraste nas superfícies claras.

## Solução (escopada à sidebar)
Substituir as ocorrências de `text-muted-foreground` dentro de `src/components/layout/AppSidebar.tsx` por uma cor mais clara, alinhada à paleta da sidebar.

Mudanças:

1. **Group label inativo** (botão de cabeçalho de grupo): `text-muted-foreground` → `text-zinc-300` (≈ `0 0% 83%`).
2. **Item filho inativo** (`Link` dentro da lista): `text-muted-foreground` → `text-zinc-300`.
3. **Hover dos itens filho**: manter `hover:text-foreground hover:bg-muted` (já vai pra branco quase total no hover).
4. **Cockpit Interno → "Admin" link**: mesma troca (`text-muted-foreground` → `text-zinc-300`).
5. **Footer do usuário** (email truncado e "Meu perfil" no estado expandido): manter como está — o email em `text-foreground` já está claro e o "Meu perfil" usa `text-muted-foreground` propositalmente como secundário; deixo em `text-zinc-400` para um leve boost sem competir com o email.
6. **Botão "Sair"** (`Button variant="ghost"`): trocar `text-muted-foreground` → `text-zinc-300` (mantém `hover:text-destructive`).
7. **Estado colapsado** (ícones pequenos): mesma troca onde houver `text-muted-foreground`.

## Resultado
Letras cinzas do menu passam de `hsl(0 0% 65%)` para `hsl(0 0% 83%)` (zinc-300), ganhando ~28% de luminosidade e ficando legíveis contra o fundo preto da sidebar — sem afetar nenhuma outra parte do app.

## Arquivo afetado
- `src/components/layout/AppSidebar.tsx` (apenas troca de classes Tailwind, sem mudança estrutural).
