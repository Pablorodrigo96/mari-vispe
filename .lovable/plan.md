# Plano de correção

## Objetivo
Garantir que, quando um usuário novo conclui o Plano Perfeito, o relatório seja salvo imediatamente na conta dele e apareça em **Meus Planos**, sem depender do login terminar de propagar no navegador.

## O que será alterado

### 1. Salvar o plano no backend durante a criação da conta
No fluxo atual, a conta é criada e depois o navegador tenta logar e salvar o plano. Essa segunda etapa pode falhar por atraso de sessão.

Vou alterar a função `plano-perfeito-signup` para também receber os dados calculados do plano e inserir o registro em `planos_perfeitos` usando permissão segura do backend.

### 2. Ajustar o wizard para enviar o plano completo ao signup
No `PlanoPerfeitoWizard`, quando o usuário ainda não estiver logado:

- calcular o resultado normalmente;
- chamar `plano-perfeito-signup` enviando cadastro + resultado do plano;
- fazer login automático com a senha cadastrada;
- mostrar o resultado;
- garantir que, ao acessar **Meus Planos**, o plano já exista no histórico.

### 3. Manter o fluxo de usuário já logado
Para usuário já autenticado, manter o salvamento atual pelo cliente, com a regra existente de só consumir crédito após o insert funcionar.

### 4. Melhorar feedback de erro
Se o salvamento no backend falhar, a tela vai avisar claramente que o plano foi gerado, mas não foi salvo, em vez de parecer que tudo deu certo.

## Arquivos previstos

- `supabase/functions/plano-perfeito-signup/index.ts`
- `src/components/valuation/plano-perfeito/PlanoPerfeitoWizard.tsx`

## Resultado esperado
Após concluir o cadastro pelo Plano Perfeito, o usuário deve conseguir entrar em **Meus Planos** e ver o relatório recém-criado.