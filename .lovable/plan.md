

## Correcao Definitiva: Tela Branca ao Selecionar Perfil

### Problema Real

A correcao anterior removeu o `onCheckedChange`, mas o problema persiste porque existe **outro caminho de duplo disparo**:

1. O elemento `<label htmlFor="role-seller">` esta vinculado ao `<Checkbox id="role-seller">` pelo atributo `htmlFor`/`id`
2. Quando o usuario clica em qualquer lugar do card, o clique sobe ate o `div` pai e chama `toggleRole` via `onClick`
3. Porem, se o clique foi na area do `label`, o navegador **tambem** redireciona um clique sintetico para o Checkbox (comportamento nativo de labels HTML)
4. O Radix Checkbox processa esse clique sintetico internamente, causando conflito de estado

Isso gera a mesma situacao: `toggleRole` e chamado duas vezes, o estado oscila e o React entra em loop de renderizacao, resultando na tela branca.

### Solucao

Remover a vinculacao `htmlFor`/`id` entre o `label` e o `Checkbox`, e tambem adicionar `e.stopPropagation()` no Checkbox para garantir isolamento total:

**Arquivo:** `src/pages/Auth.tsx`

1. Remover `id` do Checkbox (linha 348)
2. Remover `htmlFor` do label (linha 353-354)
3. Trocar `<label>` por `<span>` para eliminar completamente o comportamento nativo de labels

```tsx
<div
  key={role.id}
  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
    signupRoles.includes(role.id)
      ? 'border-accent bg-accent/5'
      : 'border-border hover:border-muted-foreground/50'
  }`}
  onClick={(e) => {
    e.preventDefault();
    toggleRole(role.id);
  }}
>
  <Checkbox
    checked={signupRoles.includes(role.id)}
    className="mt-0.5 pointer-events-none"
  />
  <div className="flex-1">
    <span className="text-sm font-medium cursor-pointer">
      {role.label}
    </span>
    <p className="text-xs text-muted-foreground">{role.description}</p>
  </div>
</div>
```

Alteracoes chave:
- **Removido `id`** do Checkbox: elimina vinculo com label
- **Trocado `<label>` por `<span>`**: elimina redirecionamento nativo de clique
- **Adicionado `pointer-events-none`** no Checkbox: garante que cliques passem direto para o div pai, evitando qualquer processamento interno do Radix

Com isso, o unico handler de clique sera o `onClick` do `div` pai, eliminando definitivamente o duplo disparo.

