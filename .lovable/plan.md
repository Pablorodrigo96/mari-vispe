# Logos CVM/Capitare + Página de Regulamentação

## 1. Faixa "Regulamentação & Parceiros" no final do InvestirHome

Acrescentar uma nova `<SectionBand tone="bone">` logo antes do CTA final (Volt), com:

- Título: "Regulado pela CVM. Operado em parceria com a Capitare."
- Texto curto: a mari.invest opera ofertas públicas sob a Resolução CVM 88 (crowdfunding de investimento) em parceria com a Capitare, plataforma especializada em ofertas reguladas white label.
- Dois cards lado a lado (stack no mobile):
  - **CVM** — logo + "Comissão de Valores Mobiliários · Regulação Resolução 88" + link externo para o site da CVM
  - **Capitare** — logo + "Parceira de infraestrutura regulada · CVM88" + link externo `https://capitare.io/cvm88`
- Botão primário: `Entenda nossa regulamentação →` que leva para `/investir/regulamentacao`

Logos via `lovable-assets`:
- `src/assets/cvm-logo.png.asset.json` (a partir de `/mnt/user-uploads/327430ec-...png`)
- `src/assets/capitare-logo.svg.asset.json` — buscado da home da Capitare (ou texto-logo como fallback se download falhar)

## 2. Nova página `/investir/regulamentacao` (`InvestirRegulamentacao.tsx`)

Estrutura (mobile-first, mesmo padrão `InvestirShell` + `SectionBand`), conteúdo baseado em capitare.io/cvm88:

1. **Hero Carbon** — "Como a mari.invest é regulada." + subtítulo sobre CVM 88 + selo CVM/Capitare
2. **O que é a CVM 88** (bone) — explicação simples: Resolução CVM 88 (ex-Instrução 588) permite ofertas públicas de pequeno porte (até R$ 15M) via plataformas eletrônicas autorizadas (crowdfunding de investimento), sem necessidade de registro completo de oferta.
3. **Como funciona na prática** (carbon) — 5 passos adaptados do Capitare: Estruturação → Registro CVM → Plataforma → Captação → Liquidação, com prazos.
4. **O que você pode investir** (bone) — 2 cards: Equity (cotas/participações) e Dívida (debêntures, notas comerciais), limites e características.
5. **Proteções ao investidor** (carbon) — KYC obrigatório, suitability, limites por investidor (R$20k/ano para varejo conforme CVM 88), custódia segregada, documentação completa, direito de arrependimento de 5 dias.
6. **Nossa parceira Capitare** (bone) — explicação do white label: a Capitare provê infraestrutura regulada, a mari opera a marca/curadoria. Link externo.
7. **FAQ regulatório** (bone) — perguntas: "Quem é responsável pela oferta?", "Posso perder dinheiro?", "Quanto posso investir por ano?", "Onde reclamar?", "O que é direito de arrependimento?"
8. **CTA Volt** — "Pronto para investir com segurança?" → `/investir/auth?mode=signup`

## 3. Rota

Adicionar em `src/App.tsx`:
- `const InvestirRegulamentacao = lazy(() => import("./pages/investir/InvestirRegulamentacao"));`
- `<Route path="/investir/regulamentacao" element={<InvestirRegulamentacao />} />`

## 4. Link extra

Adicionar referência à página `/investir/regulamentacao` também no item de FAQ "Quem regula a plataforma?" do `InvestirHome` (substituir texto puro por link "Saiba mais sobre nossa regulamentação →").

## Detalhes técnicos

- Logos hospedadas via `lovable-assets create --file ... > .asset.json`; importadas como JSON e usadas em `<img src={asset.url} />`.
- Card CVM com fundo branco (logo verde precisa de contraste); card Capitare com fundo carbon (logo branca).
- Sem mudanças em backend, schema ou edge functions.
- Mobile-first: cards empilhados < md, lado a lado >= md; mesmas tokens (`bone`, `carbon`, `volt`, `graphite`).
- Disclaimers de risco mantidos.

## Fora do escopo

- Não alterar fluxos de KYC/Suitability/auth.
- Não criar página institucional sobre a Capitare além do que estiver no `/investir/regulamentacao`.
- Não adicionar logos em outras áreas do app (mari principal).
