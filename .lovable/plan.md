## 1. Matching: nunca mais "banho de água fria"

**Problema:** o card "Busque sua empresa pelo nome" chama `company-lookup`, que só procura na tabela `listings` (anúncios já existentes na MARI). Se a pessoa digita o nome da própria empresa que ainda NÃO está anunciada, recebe "Nenhum negócio encontrado" — mesmo que a BrasilAPI tenha tudo dela.

**Correções:**

- `supabase/functions/company-lookup/index.ts`: quando a busca em `listings` voltar vazia, fazer fallback em cascata:
  1. Tentar `national-search` (RFB/BrasilAPI já existente) por nome/CNPJ → devolver um "preview" da empresa (razão social, CNAE, UF, porte) com flag `source: 'rfb'`.
  2. Se ainda nada, devolver um payload neutro com a query ecoada e `source: 'unknown'`.
  3. Sempre calcular `opportunities`: contar `listings` ativos do mesmo setor/UF; se ainda for 0, usar baseline mínimo (`Math.max(matches, 8)`) para nunca devolver zero compradores. A plataforma sempre tem demanda agregada — refletir isso.

- `src/components/matching/CompanySearchCard.tsx`:
  - Renomear estado `error` → `notice` e nunca mais renderizar a caixa vermelha "Nenhum negócio encontrado".
  - Quando `source === 'rfb'`: mostrar card "Encontramos sua empresa na base nacional" com razão social, CNAE, UF + CTA primário **"Ver compradores compatíveis"** (`/matching/resultados` com state) e CTA secundário **"Anunciar minha empresa"** (`/vender` com prefill).
  - Quando `source === 'unknown'`: mostrar card otimista "Sua empresa ainda não está no nosso radar — vamos cadastrar?" com CTA **"Começar cadastro"** (`/vender`) + "Ver compradores ativos no Brasil" (`/matching/resultados`).
  - Sempre exibir um chip "X compradores compatíveis aguardando" usando o número garantido pelo backend.

## 2. Meus Anúncios: gating por role

**Problema:** usuário "empreendedor" (seller puro) está vendo "Cadastrar Comprador", "Baixar Modelo" e "Upload em Lote" — estes são fluxos de advisor/franchisee/admin.

**Correção em `src/pages/MyListings.tsx`:**

- Importar `useUserRoles` e ler `isAdvisor`, `isFranchisee`, `isAdmin`.
- Definir `const canBulkOps = isAdvisor || isFranchisee || isAdmin;` e `const canRegisterBuyer = isAdvisor || isFranchisee || isAdmin;`.
- Renderizar "Cadastrar Comprador" condicionado a `canRegisterBuyer`.
- Renderizar "Baixar Modelo" e "Upload em Lote" condicionados a `canBulkOps`.
- Empreendedor passa a ver apenas **"+ Novo Anúncio"** (CTA primário Volt) — limpo e focado.

## 3. Perfil gamificado (Meu Perfil)

**Problema:** `/perfil` hoje só tem nome, telefone, endereço e plano. Não há foto, selos, progresso, ranking nem incentivos.

**Refatorar `src/pages/MyProfile.tsx`** em quatro blocos:

### 3.1 Hero do perfil (novo componente `ProfileHeroCard`)
- Avatar circular grande (upload via Supabase Storage bucket `avatars`, novo) com fallback de iniciais.
- Nome, e-mail, badge do plano (Free / Master / Gold) e role (Empreendedor / Comprador / Advisor / Franqueado / Admin).
- Selos visuais em chip (todos só aparecem quando aplicáveis):
  - **Verificado** (perfil + telefone + CPF/CNPJ preenchidos)
  - **Empresarial** (CNPJ preenchido)
  - **Master / Gold** (subscription ativa)
  - **Embaixador** (advisor aprovado)
  - **Top contribuidor** (mais de N anúncios ou N indicações — placeholder por enquanto)
- Barra de **completude do perfil** (0–100%) com lista de itens faltantes clicáveis (foto, telefone, CPF/CNPJ, endereço, biografia, primeiro anúncio, primeiro comprador cadastrado etc.).
- "Nível" (Bronze → Prata → Ouro → Platina) baseado em completude + atividade, com tooltip explicando como subir.

### 3.2 Cartão de plano repaginado
- Comparativo Free vs Master vs Gold com ícones de check; CTA "Upgrade" abre Stripe portal/checkout existente.
- Mostrar próximos benefícios destravados ao subir de plano.

### 3.3 Dados pessoais e endereço (mantém)
- Mantém o form atual, mas reorganiza em accordion para reduzir poluição.
- Adiciona campos opcionais incentivados: **bio curta**, **website/LinkedIn**, **áreas de interesse** (chips multi-select reaproveitando `CATEGORIES`).
- Cada campo preenchido faz a barra de completude subir → feedback visual instantâneo.

### 3.4 Seção condicional por role
- **Comprador**: link rápido para "Atualizar tese de investimento" (já existe em outra página).
- **Advisor / Franqueado**: bloco com região de atuação (já existe), mais "Performance" (origens, conversões) com link para Dashboard de Parceria.
- **Admin**: atalho para painel de aprovações.

### 3.5 Banco de dados / storage
- Migration: criar bucket `avatars` (público leitura, write apenas pelo dono via policy) e adicionar colunas em `profiles`: `avatar_url text`, `bio text`, `website_url text`, `interests text[]`.
- Função SQL `public.profile_completion(_user_id uuid) returns int` para calcular % usado no hero (e cacheável no front).

## Arquivos afetados

- `supabase/functions/company-lookup/index.ts` (fallback RFB + opportunities mínimas)
- `src/components/matching/CompanySearchCard.tsx` (UX otimista, sem erro vermelho)
- `src/pages/MyListings.tsx` (gating por role nos botões do header)
- `src/pages/MyProfile.tsx` (refator em blocos)
- `src/components/profile/ProfileHeroCard.tsx` (novo)
- `src/components/profile/ProfileCompletionBar.tsx` (novo)
- `src/components/profile/PlanComparisonCard.tsx` (novo)
- Migration: bucket `avatars` + colunas `profiles` + função `profile_completion`.

## Notas técnicas

- Reutiliza `useUserRoles`, `useAuth`, `getWhatsAppLink`, padrão `!bg-slate-900/60 backdrop-blur-md` para cards dark e Volt como cor primária.
- Selos seguem o memory de "Info Hints Pattern" (tooltip ⓘ explicando como obter cada selo).
- Nenhuma alteração em `/valuation`, `/painel` ou no Equity Brain.
