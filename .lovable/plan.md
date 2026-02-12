

## Correcao Definitiva: Tela Branca ao Selecionar Perfil (Checkbox)

### Problema Confirmado

Testei diretamente no navegador e confirmei: clicar em qualquer perfil (Vendedor, Comprador, Assessor) causa tela branca com o erro **"Maximum update depth exceeded"**.

A causa raiz nao e o duplo clique - e o proprio componente Radix Checkbox. Quando a prop `checked` muda, o Radix Checkbox dispara internamente um `setState` via callback de ref durante a fase de commit do React, criando um loop infinito de atualizacoes.

### Solucao

Substituir o componente `Checkbox` do Radix por um indicador visual simples (um `div` estilizado com o icone de check). Isso elimina completamente o problema porque nao ha mais estado interno do Radix envolvido.

### Detalhes Tecnicos

**Arquivo:** `src/pages/Auth.tsx`

Trocar:
```tsx
<Checkbox
  checked={signupRoles.includes(role.id)}
  className="mt-0.5 pointer-events-none"
/>
```

Por um div visual simples:
```tsx
<div className={`mt-0.5 h-4 w-4 shrink-0 rounded-sm border flex items-center justify-center transition-colors ${
  signupRoles.includes(role.id)
    ? 'bg-primary border-primary text-primary-foreground'
    : 'border-primary'
}`}>
  {signupRoles.includes(role.id) && (
    <Check className="h-3 w-3" />
  )}
</div>
```

- Remover a importacao do `Checkbox` (se nao for mais usado em outro lugar do arquivo)
- Adicionar importacao do icone `Check` do lucide-react (ja importado no arquivo)

Isso resolve o problema de forma definitiva porque:
1. Nenhum componente Radix e usado - zero risco de loop interno
2. O visual e identico ao checkbox original
3. O controle de estado fica 100% no `onClick` do div pai

