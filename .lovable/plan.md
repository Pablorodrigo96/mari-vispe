## O que vamos entregar

Dois blocos pequenos e direto ao ponto: (1) um sistema de **missões** dentro do perfil para gamificar adoção das ferramentas (Perfil → Anúncio → Valuation → Captação), e (2) **disclaimers de anonimização** no fluxo de cadastro de empresa.

---

## 1. Gamificação no perfil — `src/components/profile/ProfileQuests.tsx` (novo)

Card "Sua jornada na mari" inserido no `MyProfile` logo abaixo do `ProfileHeroCard`, com:

- **Header**: ícone troféu, título, contador `X/4 missões`, barra de progresso geral.
- **4 missões**, cada uma com ícone + título + descrição + selo de recompensa + CTA:
  1. **Completar perfil** — `+ Selo Verificado`. CTA rola para `#card-personal`. Considerada done quando `profile_completion >= 80`.
  2. **Anunciar empresa** — `+ Selo Empresarial`. CTA `/vender`. Done quando `listings.count(user_id) > 0`.
  3. **Fazer Valuation** — `+ Selo Estratégico`. CTA `/valuation`. Done quando `valuation_history.count > 0`.
  4. **Solicitar Captação** — `+ Selo Investidor`. CTA `/capital` (ou `/minhas-captacoes` se já tem). Done quando `capital_requests.count > 0`.
- Missões concluídas: borda verde + check verde, botão "outline" mostrando contagem.
- Quando 4/4 → linha "Você é Embaixador mari!" verde.
- Counts via 3 selects `count: 'exact', head: true` paralelos (`Promise.all`).

## 2. Integração no `MyProfile.tsx`

- Importar `ProfileQuests` e renderizar logo após `<ProfileHeroCard />`, passando `userId` e `completion`.
- Sem mudanças de schema; reusa as colunas e a RPC `profile_completion` já existentes.

## 3. Disclaimers de anonimização — `src/components/sell/AnonymityDisclaimer.tsx` (novo)

Banner reusável (variante `compact` e `full`) com:
- Ícone Shield + título "Sua identidade é protegida".
- 3 bullets curtos:
  - Sua empresa entra na vitrine apenas com **codinome** (ex: `MARI-TECH-1234`).
  - Razão social, CNPJ, endereço completo e fotos identificáveis **não aparecem** publicamente.
  - Compradores só veem os dados reais após **assinarem NDA** e você aprovar a liberação.
- Linha de fechamento: "Você controla quando revelar. Sempre."

## 4. Onde inserir os disclaimers

- **`src/pages/Vender.tsx`** — versão `full` logo abaixo do `<h1>Anuncie sua Empresa</h1>` e acima do `<NewListingWizard />`.
- **`src/components/sell/wizard/StepDescriptionLocation.tsx`** — versão `compact` no topo do step (antes da seção "Descrição do Negócio"), reforçando próximo aos campos sensíveis (descrição, endereço completo, checkbox "exibir endereço").
- Texto curto adicional ao lado do checkbox `showAddress`: "Recomendado deixar desmarcado — só cidade/UF aparecem no teaser."

## Arquivos

- **Criar**: `src/components/profile/ProfileQuests.tsx`, `src/components/sell/AnonymityDisclaimer.tsx`
- **Editar**: `src/pages/MyProfile.tsx`, `src/pages/Vender.tsx`, `src/components/sell/wizard/StepDescriptionLocation.tsx`

Sem migrations, sem mudanças no schema.
