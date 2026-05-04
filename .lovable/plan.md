## Problema

No `/capital`, ao clicar em "Receber relatório + falar com especialista" estando **logado**, o modal `CapitalLeadModal` ainda pede nome, empresa, email e WhatsApp — dados que já temos no perfil. Isso quebra a confiança ("eu já estou logado, por que pedir de novo?").

## Solução

Quando `user` existe no `CapitalLeadModal`, pular o formulário pessoal e mostrar uma versão enxuta de confirmação que apenas registra a oportunidade.

### 1. `src/components/capital/CapitalLeadModal.tsx`

- Ao abrir o modal com `user` autenticado:
  - Buscar `profiles` (`full_name`, `phone`) + `user.email` em `useEffect` e popular o form.
  - Renderizar uma **view "logado"** mais curta:
    - Header: "Confirmar solicitação de captação"
    - Resumo legível (não-editável) com cards: Valor solicitado, Score, Nome, Empresa (editável inline se faltar), Email, WhatsApp.
    - Apenas 2 selects ainda obrigatórios: **Tipo de Captação** e **Objetivo do Capital**.
    - Botão único: **"Confirmar e enviar para especialista"**.
  - Esconder totalmente os campos de nome/email/telefone/senha (sem `<FormField>` para esses).
- Caso o `profiles.full_name` ou `phone` esteja vazio, mostrar inline um único input compacto ("Complete seu WhatsApp para o especialista te encontrar") em vez do form completo.
- Após `insert` em `capital_requests` bem-sucedido:
  - Trocar a tela de sucesso para mensagem mais direta:
    - "Solicitação enviada! Nosso especialista entra em contato em até 24h."
    - CTA primário: **"Acompanhar em Minhas Captações"** → `/minhas-captacoes`
    - CTA secundário: "Fechar"
  - Auto-redirecionar para `/minhas-captacoes` após 2.5s (com `setTimeout` cancelável no `handleClose`).
- Manter o fluxo atual (form completo + signup) **intacto** para visitantes não-logados.

### 2. Sem mudanças de schema

`capital_requests` já aceita `user_id`, e os dados do perfil são suficientes. Nenhuma migração necessária.

### Arquivos

- `src/components/capital/CapitalLeadModal.tsx` (refactor — split em duas views: `LoggedInView` e `GuestView` dentro do mesmo arquivo).
