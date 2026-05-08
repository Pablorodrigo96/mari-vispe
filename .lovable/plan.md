# Plano: Amplificar Mensagem de Confidencialidade e Sigilo na Plataforma

## Objetivo
Deixar **crystal clear** em toda a plataforma que a Mari é 100% sigilosa. Nenhum concorrente, sócio ou competidor saberá que a empresa está no marketplace. Dados anônimos por padrão, identidade só revelada sob NDA.

## Pontos de Contato a Modificar

### 1. Home (Landing Page) — Maior impacto

#### 1.1 HeroCarousel — Novo Slide de Sigilo
- Adicionar slide 7 (ou reposicionar para posição estratégica) com:
  - Badge: "SIGILO ABSOLUTO"
  - Headline: "Nenhum concorrente vai saber que você está aqui."
  - Highlight: "Sua identidade fica protegida do início ao fim."
  - Body: Explicar codinome, anonimato, NDA, controle total do vendedor
  - CTA: "Anunciar com segurança" → `/sell`

#### 1.2 Cards de Valor (abaixo do carrossel)
- Adicionar 4º card ao grid (mudar `md:grid-cols-3` → `md:grid-cols-4`):
  - Ícone: `Shield` ou `EyeOff`
  - Label: "Sigilo"
  - Text: "Seus dados são anônimos. Sócios, concorrentes e funcionários não sabem que você está no Mari."

#### 1.3 Seção Dedicada de Confidencialidade (HomeBelowFold)
- Nova seção entre CTA e MariDifferentialCard:
  - Título: "A plataforma mais sigilosa do mercado brasileiro de M&A"
  - 3 pilares visuais: (1) Codinome anônimo, (2) NDA obrigatório, (3) Você controla a revelação
  - CTA para `/sell`

### 2. Página Pública de Venda (Sell.tsx) — Jornada do vendedor

#### 2.1 Hero Section — Reforço máximo
- Alterar badge: "Venda com Segurança" → "100% Sigilosa · 100% Anônima"
- Alterar subheadline para incluir: "Nenhum concorrente, sócio ou funcionário vai saber que você está vendendo. Processo 100% anônimo e confidencial."
- Adicionar banner/alerta visual de confidencialidade abaixo dos botões CTA (ex: componente `AnonymityDisclaimer` adaptado para página pública)

#### 2.2 Benefícios Section
- Destacar "Confidencialidade Total" como o PRIMEIRO benefício (reordenar)
- Expandir descrição: "Seus dados são anônimos por padrão. Sua empresa aparece com codinome. Razão social, CNPJ e endereço só são revelados após NDA assinado e sua aprovação."

### 3. Wizard de Venda (Vender.tsx + AnonymityDisclaimer)

#### 3.1 AnonymityDisclaimer — Versão reforçada
- Aumentar texto do `full` variant para incluir: "Nenhum concorrente, sócio ou funcionário terá acesso à sua identidade sem sua autorização."
- Aumentar texto do `compact` variant para ser mais assertivo

#### 3.2 StepDescriptionLocation (onde já usa compact)
- Manter o disclaimer compacto mas com texto mais forte

### 4. Página de Valuation (Valuation.tsx + componentes)

#### 4.1 ValuationTypeSelector — Banner de Sigilo
- Adicionar banner discreto mas visível abaixo do hero title:
  - "Seus dados financeiros são sigilosos. Nenhum terceiro acessa suas informações sem autorização."

#### 4.2 ValuationWhySection — Novo Card
- Adicionar 5º card (mudar grid para 5 cols ou reorganizar):
  - Ícone: `Lock` ou `Shield`
  - Título: "Dados 100% sigilosos"
  - Descrição: "Seus números financeiros são privados. Nenhum concorrente, banco ou sócio tem acesso sem seu consentimento."
  - Highlight: "Privacidade garantida"

#### 4.3 TrustSection — Novo Benefício
- Adicionar 4º item aos benefícios:
  - Ícone: `Lock`
  - Text: "Dados criptografados e sigilosos"

#### 4.4 ValuationBeforeAfter — Nova Comparação
- Adicionar linha:
  - Sem: "Seus dados financeiros expostos a curiosos"
  - Com: "Informações sigilosas, acesso controlado por você"

### 5. Página de Signup/Login (Auth.tsx)

- Adicionar frase de sigilo abaixo do formulário de signup:
  - "Seus dados estão seguros. A Mari nunca revela sua identidade ou intenção a terceiros sem sua autorização."
- Adicionar ícone de `Shield` ou `Lock` ao lado da frase

### 6. Footer (Footer.tsx) — Selo de Confidencialidade

- Adicionar selo/badge no topo do footer (antes das colunas):
  - "Plataforma 100% Sigilosa · Codinome Anônimo · NDA Obrigatório"
- Ou adicionar como uma nova coluna "Segurança" com links para termos e política

### 7. MariDifferentialCard (HomeBelowFold)

- Substituir o 3º card ("Abstenção quando não sabe") por "Sigilo total":
  - Ícone: `EyeOff`
  - Título: "Sigilo total"
  - Body: "Sua empresa nunca aparece publicamente com nome real. Codinome, NDA e controle total de quem vê seus dados."

## Technical Details
- Todos os componentes usam Tailwind tokens do design system (`volt`, `accent`, `card`, etc.)
- Nenhuma mudança de backend necessária — apenas copy e UI
- Reutilizar componente `AnonymityDisclaimer` onde possível, com variantes expandidas
- Ícones do Lucide: `Shield`, `EyeOff`, `Lock`, `FileSignature`

## Validation
- Verificar visualmente que a mensagem de sigilo aparece em: Home, Sell, Valuation, Auth, Footer
- Confirmar que o texto não quebra layout em mobile (usar `break-words`)
- Build passa sem erros TypeScript
