

## Plano: Corrigir Validação do Campo Senha no Modal de Captação

### Problema
O campo `password` tem `defaultValues: ''` e validação `z.string().min(8).optional()`. Quando o usuário está logado, o campo fica oculto, mas o valor `""` (string vazia) não é `undefined` — o zod aplica `min(8)` na string vazia e falha silenciosamente, bloqueando o submit.

### Solução
Alterar a validação do campo `password` no schema zod para aceitar string vazia:

```typescript
password: z.string().min(8, '...').max(72).optional().or(z.literal('')),
```

### Arquivo alterado

| Arquivo | Mudança |
|---|---|
| `src/components/capital/CapitalLeadModal.tsx` | Linha 30: adicionar `.or(z.literal(''))` ao campo `password` no schema |

