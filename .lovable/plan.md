

## Correcao: Tela Branca ao Clicar em "Assessor/Representante"

### Problema Identificado

Na tela de cadastro (`/auth`), ao clicar em qualquer opcao de perfil (Vendedor, Comprador, Assessor), o clique dispara a funcao `toggleRole` **duas vezes simultaneamente**:

1. O `onClick` do container `div` chama `toggleRole`
2. O `onCheckedChange` do `Checkbox` tambem chama `toggleRole`

Isso causa um conflito de estado que faz o React entrar em loop, resultando na tela branca.

### Solucao

Remover o `onCheckedChange` do componente `Checkbox` e manter apenas o `onClick` no `div` container. O checkbox continuara refletindo o estado visual corretamente atraves da prop `checked`.

### Detalhe Tecnico

**Arquivo:** `src/pages/Auth.tsx` (linhas 334-359)

Alterar o Checkbox para nao ter `onCheckedChange`, deixando o controle de clique apenas no div pai:

```tsx
<Checkbox
  id={`role-${role.id}`}
  checked={signupRoles.includes(role.id)}
  className="mt-0.5"
/>
```

Tambem adicionar `e.stopPropagation()` no onClick do div para evitar conflitos com o label:

```tsx
<div
  key={role.id}
  className={...}
  onClick={(e) => {
    e.preventDefault();
    toggleRole(role.id);
  }}
>
```

Isso resolve o problema de forma simples, mantendo o comportamento visual e funcional identico.

