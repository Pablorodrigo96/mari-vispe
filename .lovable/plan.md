

## Plano: Corrigir Botão do Modal de Captação + Renomear

### Problema
O botão de submit "Receber contato de especialista" no `CapitalLeadModal` pode não estar respondendo porque o formulário tem validações Zod que falham silenciosamente (sem feedback visual claro ao usuário). O texto também precisa ser trocado.

### Mudanças

| Arquivo | Ação |
|---|---|
| `src/components/capital/CapitalLeadModal.tsx` | 1. Trocar texto do botão de `"Receber contato de especialista"` → `"Cadastrar Proposta"` (linha 366) |
| `src/components/capital/CapitalLeadModal.tsx` | 2. Adicionar `console.log` dos erros de validação e/ou toast quando o form falha, para que o usuário saiba quais campos estão faltando |
| `src/components/capital/CapitalLeadModal.tsx` | 3. Trocar texto da tela de sucesso: `"Recebemos seus dados!"` → `"Proposta cadastrada com sucesso!"` e ajustar microcopy |

### Detalhes técnicos
- O formulário usa `react-hook-form` com `zodResolver`. Quando campos obrigatórios não estão preenchidos, o `handleSubmit` simplesmente não chama `onSubmit` — o botão "não funciona" do ponto de vista do usuário
- Solução: adicionar `onInvalid` callback no `handleSubmit` para mostrar toast com erro, e garantir que `FormMessage` está visível em todos os campos

