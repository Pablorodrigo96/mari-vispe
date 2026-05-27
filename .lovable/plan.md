## Mudanças

**1. Step de Lead (`StepLeadCapture.tsx`) — pede senha**
- Adicionar campo `password` (e `passwordConfirm`) ao `LeadFormData`.
- UI: 2 inputs do tipo password com `Eye/EyeOff` toggle, ícone `Lock`, hint "Guarde essa senha — você vai usar pra acessar o relatório completo".
- Mudar copy do topo: "Crie sua conta para receber o Plano Perfeito" (em vez de "criamos automaticamente").
- Validação no Wizard: senha mín. 8 chars, igual à confirmação.

**2. Wizard (`PlanoPerfeitoWizard.tsx`)**
- `initial.lead` ganha `password: ''` e `passwordConfirm: ''`.
- `validate()` no step 5: exigir senha ≥ 8 e bater com a confirmação.
- `handleSubmit`: passar `password` pra edge function (em vez de senha temporária).

**3. Edge function (`plano-perfeito-signup/index.ts`)**
- Aceitar `password` no body; se vier, usa ela (em vez de `generateTempPassword`).
- Retorna `password` no payload (pro auto-login imediato) — mesma forma que `tempPassword` hoje.
- Mantém fallback de senha temporária se cliente não mandar (compat).

**4. CTA de login no Resultado (`PlanoPerfeitoResult.tsx`)**
- Novo card destacado **acima dos CTAs**, com fundo accent suave + ícone `Lock`:
  - Título: "Acesse seu relatório completo mês a mês"
  - Texto: "Veja a evolução detalhada de receita, clientes, investimento por período e o passo-a-passo de ações para viabilizar este Plano. Faça login com a conta que você acabou de criar."
  - Botão `→ Acessar relatório completo` que vai para `/meus-planos-perfeitos` (se logado) ou `/auth` (se não).
- Aceitar prop opcional `isLoggedIn?: boolean` e `onAcessarRelatorio: () => void` vindas do Wizard.

**5. Mensagem pós-submit no Wizard**
- Toast de sucesso passa a mencionar: "Conta criada! Use seu e-mail e senha para acessar quando quiser."

## Arquivos editados

- `src/components/valuation/plano-perfeito/StepLeadCapture.tsx`
- `src/components/valuation/plano-perfeito/PlanoPerfeitoWizard.tsx`
- `src/components/valuation/plano-perfeito/PlanoPerfeitoResult.tsx`
- `supabase/functions/plano-perfeito-signup/index.ts`

Nenhuma mudança de schema ou RLS.
