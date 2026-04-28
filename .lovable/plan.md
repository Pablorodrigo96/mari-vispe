
# Plano — 4 ajustes em paralelo

## 1. Renomear e clarificar conceitos do Grafo Jarvis

Edits em `src/lib/equityGraphScoring.ts` (labels) e nos componentes da Legenda/Sidebar/NodeDetail para que cada conceito fique auto-explicativo, sem precisar abrir guia.

**Renomeações de edges (EDGE_LABELS):**
- `seller_acquires_seller`: "Roll-up Seller→Seller" → **"Possível Fusão (PME ↔ PME)"** + sub-label "Duas empresas que valem mais juntas"
- `seller_merges_with_seller`: "Fusão Seller↔Seller" → **"Fusão Estratégica (mesmo porte)"**
- `platform_addon`: "Add-on de Plataforma" → **"Add-on → Consolidador"** + sub-label "Empresa pequena absorvida por uma maior"

**Renomeações de nodes (NODE_LABELS):**
- `platform`: "Plataforma" → **"Consolidador (Plataforma)"** + tooltip: "Empresa âncora premium que adquire add-ons menores. Pense numa rede que está comprando concorrentes para crescer."

**Sinergia Comercial — definir critério prático.** Adicionar tooltip e descrição em `EDGE_LAYERS.commercial`:
> "Quando duas empresas vendem para o mesmo perfil de cliente (mesmo ICP) ou usam o mesmo canal (B2B distribuidor, varejo físico, e-commerce). Critério: setor_ma compatível + sobreposição geográfica ≥ 50% + ticket médio na mesma faixa."

**Tese (violeta) com vários sellers ao redor — clarificar visualmente.**
No `NodeDetailPanel.tsx`, quando o node clicado for `type === "thesis"`, mostrar header destacado:
> "🧠 Tese de Investimento — atrai N empresas-alvo"
e listar os sellers conectados como "Targets desta tese".

Adicionar **badges de "papel no grafo"** dinâmicos ao clicar em qualquer node:
- Seller premium com 3+ edges `platform_addon` saindo dele → badge **"Consolidador potencial"**
- Seller verde ligado a outro seller verde → badge **"Candidato a fusão"**
- Seller pequeno ligado a um consolidador → badge **"Add-on disponível"**

## 2. Página `/equity-brain/grafo-jarvis/guia`

Nova rota com guia visual do grafo, baseado no que expliquei na resposta anterior.

**Estrutura (`src/pages/equity-brain/GrafoJarvisGuiaPage.tsx`):**
- Hero: "Como ler o Grafo Jarvis"
- Seção 1: **Tipos de Nodes** — cards coloridos com bolinha de exemplo, label, "o que é" e "quando aparece"
  - Seller (verde), Buyer Estratégico (cyan), Buyer Financeiro (azul), Tese (violeta), Consolidador/Plataforma (âmbar)
- Seção 2: **Tipos de Edges** — agrupados pelos 7 layers (M&A Direto, Possível Fusão/Roll-up, Operacional, Comercial, Arbitragem, Capital, Tese), cada um com:
  - Linha colorida de exemplo
  - "O que significa"
  - "Como usar na prática" (1 frase acionável)
- Seção 3: **Padrões visuais** — 3 thumbnails ilustrativos:
  - Verde+Verde ligados → "Possível Fusão"
  - Verde+Âmbar → "Add-on + Consolidador" (com seta indicando quem compra quem)
  - Violeta central com vários verdes → "Tese atraindo targets"
- Seção 4: **Receitas de uso** — 4 botões "Aplicar este preset":
  - "Originar roll-up" (filtra layers: rollup + operational, minWeight 0.5)
  - "Abordar mandato" (layers: ma_direct + capital)
  - "Defender prêmio" (layers: arbitrage + thesis)
  - "Mapear consolidadores da minha vertical" (filtra por vertical + layers rollup)
- Link "Voltar ao Grafo" no topbar

Adicionar link "📖 Guia" no topbar de `GrafoJarvisPage.tsx` ao lado de "Modo 2D"/"Mapa".

## 3. Painel do Parceiro — redesign visual

Arquivo: `src/pages/PartnerDashboard.tsx`. Manter toda a lógica; reformar UI.

**Mudanças:**
- Trocar fundo cinza por gradient sutil `bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950` no container raiz
- Header com badge "PARCERIAS" dourado e ícone animado
- StatCards: trocar do estilo cinza atual para cards com glow colorido por categoria (azul/verde/vermelho/dourado), número grande tabular, ícone em círculo translúcido. Padrão idêntico aos cards do `EBStatCard` mas com accent dourado.
- Tabs: estilizar com underline dourado no ativo (em vez do estilo padrão shadcn)
- Cards de reservas (`!bg-slate-900/60`): adicionar borda lateral colorida de 3px que muda por status (azul=reservado, verde=exclusivo, vermelho=expirando)
- Banner "Importar carteira" já está bom — só ajustar copy e dar mais destaque ao CTA principal
- Pool da Rede: cards com hover lift + glow dourado sutil
- Espaçamento mais arejado (gap-6 → gap-8 nas seções principais)

Sem mudança funcional.

## 4. Potencial da Carteira — análise por cliente, não simulação genérica

Arquivo: `src/pages/PortfolioPotential.tsx`. Hoje é um slider genérico ("escolha N clientes, veja receita"). Trocar por análise **por cliente real** da carteira.

### Lógica nova

Para cada listing da carteira do parceiro, calcular **score de propensão (0-100) por serviço**:

| Serviço | Heurística |
|---|---|
| **CFO as a Service** | Alto se `equity_score < 60` OU `vdr_readiness < 50%` OU sem dados financeiros completos. Empresas desorganizadas precisam de CFO. |
| **Aceleração Comercial** | Alto se `annual_revenue` entre 2M–30M E `equity_score >= 50` (tem produto, falta crescer). |
| **Tributário** | Alto se `category` em setores intensivos (indústria, saúde, varejo) E `annual_revenue >= 5M`. |
| **M&A (sell-side)** | Alto se `equity_score >= 70` OU `vdr_readiness >= 70%` OU `asking_price > 0`. Pronto para vender. |
| **Cross-sell (capital/dívida)** | Alto se `annual_revenue >= 3M` E setor com necessidade de capital de giro. |

Receita esperada por serviço (BRL/ano):
- CFO: R$ 36k · AC: R$ 60k · Tributário: R$ 24k · M&A success fee: 5% × valor potencial · Capital: R$ 15k consultoria + 1% sucesso

### UI nova

- **Tabela "Análise da Carteira por Cliente"** substitui o "Top 5". Colunas: Empresa | Receita | Score | **CFO** | **AC** | **Tributário** | **M&A** | **Capital** | Receita potencial total/ano
  - Cada coluna de serviço mostra um badge: 🔥 Alto / 🟡 Médio / ⚪ Baixo
  - Última coluna soma a receita esperada ponderada pelo score (ex: 80% × R$ 36k = R$ 28.8k)
- **Card-resumo no topo:** "Sua carteira tem potencial de **R$ X/ano** em honorários recorrentes + **R$ Y** em success fees de M&A" — calculado somando a receita ponderada de todos os clientes
- **Breakdown por serviço:** gráfico de barras horizontais mostrando quanto cada serviço contribui no total
- **Top oportunidades imediatas:** lista os 3 clientes com maior `score × receita_potencial` e botão "Falar com cliente sobre [serviço]" (abre WhatsApp pré-preenchido com pitch)
- Manter o simulador de cenário (Pessimista/Realista/Otimista) **abaixo**, mas reposicionado como "E se você triplicar sua carteira?"

### Arquivos novos
- `src/lib/portfolioPotentialScoring.ts` — funções `scoreCfoFit(listing)`, `scoreAcFit(listing)`, etc., e `analyzePortfolio(listings)` que devolve `{ totalRecurring, totalSuccessFee, byService, topOpportunities }`

---

**Sem mudanças de banco** em nenhum dos 4 itens. Tudo é UI/labels/cálculo client-side sobre dados já existentes.
