# Mobile-first /investir + Home Broker XP/Rico

Hoje as páginas de `/investir` foram pensadas em desktop e "encolhem" no celular. Como a maioria dos investidores PF entra pelo celular, vamos inverter: desenhar tudo pensando em tela de ~375px e depois "expandir" para desktop. Internamente (área logada), vamos copiar a lógica visual dos apps de corretora (XP, Rico, NuInvest): ação em destaque, botões grandes Comprar/Vender fixos, números limpos, sem poluição.

## Escopo (somente frontend / UI)

### 1. Páginas públicas (mobile-first)
Aplicar em `InvestirHome.tsx`, `InvestirComoFunciona.tsx`, `InvestirRiscos.tsx`, `InvestirAuth.tsx`:
- Hero: foto humana ocupando toda a largura, headline grande (text-3xl mobile / text-5xl desktop), 1 CTA primário Volt full-width + 1 CTA secundário, prova social em chips horizontais com scroll.
- Bandas de seção empilhadas (não mais grids de 3 colunas que viram coluna única feia). Cada banda com padding vertical generoso (py-12 mobile).
- "Como funciona em 3 passos": carrossel horizontal com snap no mobile, grid no desktop.
- Simulador: input grande, slider com thumb gordo, resultado em card destacado abaixo (não lateral).
- Ofertas em destaque: cards full-width empilhados, imagem 16:9 no topo, badge Volt, KPIs em 2 colunas, CTA Volt full-width.
- FAQ: accordion nativo já é mobile-friendly, só revisar tipografia.
- Tipografia escalada com clamp/responsive (text-2xl md:text-4xl etc).
- Sticky CTA bar opcional no rodapé mobile ("Quero investir") nas páginas públicas.

### 2. Onboarding (KYC + Suitability)
- Tela cheia mobile (h-[100dvh]), 1 pergunta por vez, progress bar fina no topo.
- Opções como cards grandes empilhados (min-h-16, tap target ≥44px).
- Botão "Continuar" fixo no rodapé (sticky bottom-0) com safe-area.
- Voltar como ícone seta no topo, não botão de texto.

### 3. Home Broker interno (estilo XP/Rico)
Reorganizar `InvestirShell.tsx`, `InvestirDashboard.tsx`, `InvestirListagem.tsx`, `InvestirAtivo.tsx`, `InvestirWallet.tsx`, `InvestirReservas.tsx`:

**Shell mobile:**
- Topbar fina com saldo escondível (ícone olho) + avatar.
- Bottom tab navigation fixa (5 itens: Início, Ofertas, Carteira, Reservas, Mais) — padrão app de banco.
- No desktop, manter sidebar lateral.

**Dashboard ("Início" tipo home XP):**
- Card saldo total no topo (número GIGANTE, Bone sobre Carbon), variação do dia colorida (verde/vermelho).
- Botões circulares de ação rápida em linha horizontal: Aportar, Sacar, Investir, Extrato (ícone + label curta) — igual home do app Rico.
- "Suas posições" lista compacta: logo/imagem 40px + nome + qtd, à direita preço atual + variação %. Tap → InvestirAtivo.
- "Ofertas pra você" carrossel horizontal de cards 70vw com snap.
- "Movimentações recentes" lista simples.

**Listagem de ofertas:**
- Barra de filtro horizontal scrollável (chips: Todos, Tech, Saúde, etc).
- Cards empilhados full-width, imagem 16:9, badge de status, mini-KPIs em linha (Meta / Reservado / %).

**InvestirAtivo (tela de detalhe = "tela de boleta"):**
- Imagem hero 16:9 + nome + ticker/codename.
- Tabs horizontais: Resumo, Indicadores, Documentos, Riscos.
- KPIs em grid 2x2 mobile / 4x1 desktop.
- **Footer fixo sticky** com 2 botões grandes: `Vender` (outline) | `Comprar` (Volt sólido) — exatamente como boleta XP/Rico. Tap → abre `ReservationModal` em sheet (drawer bottom) no mobile.

**ReservationModal:**
- No mobile vira bottom sheet (drawer) que sobe, ocupa ~85vh, com handle no topo. Input de valor grande (text-4xl), teclado numérico (inputMode="decimal"), botões de valor sugerido (R$ 1k / 5k / 10k), CTA confirmar full-width Volt fixo no fundo.

**Carteira:**
- Card patrimônio total grande no topo, gráfico de pizza/donut simples (alocação por ativo).
- Lista de posições idêntica à do dashboard.

### 4. Componentes novos / ajustes
- `BottomTabBar.tsx` (novo) — nav mobile fixa.
- `QuickActionButton.tsx` (novo) — botão circular ícone+label.
- `PositionRow.tsx` (novo) — linha compacta de posição reusada em Dashboard e Carteira.
- `StickyBuyBar.tsx` (novo) — footer fixo Comprar/Vender no InvestirAtivo.
- `ReservationModal` adaptado para usar `Sheet` (shadcn) com `side="bottom"` no mobile via media query.
- `SectionBand` ganha props de padding mobile reduzido.

## Fora do escopo
- Lógica de compra/venda real, secondary market, novas tabelas, edge functions.
- Tokens globais de cor (Carbon/Volt/Bone mantidos).
- Mudanças em rotas (mantém `/investir/*`).

## Detalhes técnicos
- Tailwind: usar prefixos `md:` para desktop, base = mobile.
- Drawer mobile: `@/components/ui/sheet` com `side="bottom"`.
- Safe area: `pb-[env(safe-area-inset-bottom)]` em barras fixas.
- Bottom tab condicional: renderizar só em `<md` via `md:hidden`.
- Tap targets mínimos 44x44px.

Posso seguir?
