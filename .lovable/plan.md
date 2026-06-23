
# Plano: Humanizar o portal /investir

Objetivo: deixar o /investir menos "black opaco", mais acolhedor e didático, inspirado em **Rico** (narrativa simples, perguntas guiadas, "abra sua conta", simulador) e **KTO** (alta energia visual, blocos coloridos, banners promocionais, CTAs grandes). Mantém identidade **mari** (Carbon + Volt + Bone) mas quebra o preto com **superfícies claras (Bone), fotos humanas e blocos Volt vibrantes**.

## 1. Identidade visual evoluída (sem trocar tokens)

- Manter Carbon/Volt/Bone, mas inverter a hierarquia: hoje tudo é Carbon escuro → passar a alternar **bandas Bone (claras) + bandas Carbon (escuras) + acentos Volt**, igual Rico (bandas brancas e roxas) e KTO (bandas brancas + verde-limão).
- Acrescentar **fotos reais** (pessoas brasileiras diversas, ambientes de negócio: padaria, oficina, escritório, varejo) via Unsplash, para humanizar. Criar `src/components/investir/HumanPhoto.tsx` com curadoria de fotos (lista de URLs Unsplash determinísticas por contexto: empreendedor, família, jovem investidor, padaria, indústria leve).
- Componente `SectionBand` com variantes `bone | carbon | volt` para alternar fundos por seção.

## 2. Nova InvestirHome.tsx (estrutura inspirada Rico + KTO)

Substituir a home atual por composição em bandas alternadas:

1. **Hero (Carbon + foto humana à direita)** — headline curta tipo Rico: *"Invista em empresas brasileiras de verdade. A partir de R$ 100."*. Dois CTAs: `Abrir conta grátis` (Volt) e `Ver oportunidades`. Selo de compliance discreto abaixo.
2. **Faixa KTO-style (Volt sólido)** — 3 mini-cards horizontais: "+R$100 mínimo", "Sem taxa de abertura", "100% digital". Texto Carbon sobre Volt, ícones grandes.
3. **"Como funciona em 3 passos" (Bone)** — cards brancos com ilustração/foto e número grande Volt. Linguagem Rico: *"1. Crie sua conta · 2. Escolha a empresa · 3. Receba seus rendimentos"*.
4. **Ofertas em destaque (Carbon)** — grid de cards (já existe), mas reforçar foto da empresa, % captado, ticket mínimo, badge "Aberta" Volt pulsante.
5. **"Pra quem é?" / Perfis (Bone)** — 3 cards com foto + persona: *"Quero começar pequeno"*, *"Quero diversificar"*, *"Quero apoiar negócios brasileiros"*. Cada um leva para listagem filtrada.
6. **Simulador rápido (Carbon + Volt)** — bloco inspirado no simulador Rico: input `Quanto quero investir?` + slider `Por quanto tempo?` → mostra projeção estimada (cálculo simples client-side, com disclaimer claro de não-garantia).
7. **Segurança e regulação (Bone)** — selos: CVM/regulação, MP 2.200-2, LGPD, custódia. Tom institucional mas acolhedor.
8. **Depoimentos / prova social (Carbon com fotos)** — 3 cards de empreendedores que captaram (placeholder com fotos Unsplash + nome empresa).
9. **FAQ (Bone)** — accordion com 6 perguntas reais ("É seguro?", "Como recebo?", "Posso vender depois?", "Quanto pago de imposto?", "Mínimo?", "Quem regula?").
10. **CTA final (Volt full-bleed)** — "Abra sua conta em 3 minutos" botão Carbon grande.

## 3. Páginas internas (visual + narrativa Rico)

- **InvestirComoFunciona.tsx**: virar página tipo "Sobre nós" da Rico — bandas alternadas, foto humana grande no topo, blocos didáticos ("O que é tokenização?", "Como recebo retorno?", "O que é uma oferta primária?"), tom de conversa.
- **InvestirRiscos.tsx**: manter rigor regulatório mas com layout Bone + cards e ícones (não wall-of-text Carbon).
- **InvestirAuth.tsx** (login/cadastro): copiar padrão Rico — banda Carbon à esquerda com headline motivacional + foto, formulário Bone à direita.
- **Onboarding (KYC + Suitability)**: já existe; aplicar layout Rico do suitability (stepper 1-2-3 no topo, pergunta grande Volt, opções em cards grandes brancos com borda Volt quando selecionado, botões `Voltar` outline + `Próximo` Volt). Reescrever microcopy em pt-BR conversacional.

## 4. Home Broker interno (InvestirDashboard + reserva)

Refatorar `InvestirDashboard.tsx` para parecer **app de corretora retail (Rico/XP)**:

- Topbar com saldo grande em Bone, badges: "Disponível", "Reservado", "Investido".
- Tabs principais: `Minha carteira` · `Oportunidades` · `Minhas reservas` · `Extrato`.
- Cards de posição com mini-gráfico, % variação Volt/vermelho, ações 1-clique: `Aportar mais` / `Vender cota` (mesmo que vender abra modal "em breve mercado secundário").
- Boleta lateral persistente (mobile: bottom-sheet) já existe no Ativo — replicar consistência visual.

## 5. Imagens

Usar Unsplash via URLs determinísticas (sem download), curadas em `src/lib/investirPhotos.ts`:
- hero: empreendedora brasileira sorrindo em loja
- como funciona: pessoa usando celular
- perfis: 3 personas distintas
- depoimentos: 3 empreendedores
- ofertas fallback: padaria, oficina, indústria, varejo, tech

Disclaimer: fotos ilustrativas (rodapé pequeno).

## 6. Escopo técnico

Arquivos a criar:
- `src/components/investir/SectionBand.tsx`
- `src/components/investir/HumanPhoto.tsx`
- `src/components/investir/SimuladorRapido.tsx`
- `src/components/investir/PersonaCard.tsx`
- `src/components/investir/DepoimentoCard.tsx`
- `src/lib/investirPhotos.ts`

Arquivos a reescrever:
- `src/pages/investir/InvestirHome.tsx` (nova composição em bandas)
- `src/pages/investir/InvestirComoFunciona.tsx`
- `src/pages/investir/InvestirAuth.tsx` (split layout)
- `src/pages/investir/InvestirDashboard.tsx` (cara de corretora)
- `src/pages/investir/onboarding/InvestirKYC.tsx` (stepper Rico)
- `src/pages/investir/onboarding/InvestirSuitability.tsx` (stepper Rico)

Não mexer em: rotas, backend, migrations, lógica de reserva, ReservationModal (já refeito).

## Fora de escopo

- Mercado secundário real
- Novas tabelas/edge functions
- Mudança de tokens de cor globais (mari permanece)

Posso seguir?
