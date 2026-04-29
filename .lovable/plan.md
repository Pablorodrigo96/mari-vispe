# Consolidação CRM Hub com Tabs estilo Monday

## Objetivo

Transformar `/equity-brain/crm` em uma página única com 3 abas no topo — **Visão Geral**, **Dashboard Executivo** e **Match Analytics** — eliminando a navegação entre rotas separadas para esses dashboards. As rotas existentes (`/crm/executivo` e `/crm/matching`) continuam funcionando como deep-links, mas o fluxo principal passa a ser tabular dentro do hub.

## Mudanças

### 1. Refatorar conteúdo das páginas em componentes reutilizáveis

Hoje `ExecutiveDashboardPage.tsx` e `MatchAnalyticsPage.tsx` são páginas completas (com header, padding, link de voltar). Vou extrair o **conteúdo** (KPIs + gráficos) em dois componentes puros:

- `src/components/equity-brain/crm/exec/ExecutiveDashboardContent.tsx` — todos os blocos de KPIs e gráficos do dashboard executivo (linhas 1 a 7 do arquivo atual), sem header nem `<Link voltar>`.
- `src/components/equity-brain/crm/match/MatchAnalyticsContent.tsx` — todos os KPIs de vendedores/compradores, donuts, crosstabs UF/Região/Setor e tabelas laterais, sem header nem botão de voltar.

As páginas atuais (`ExecutiveDashboardPage.tsx` e `MatchAnalyticsPage.tsx`) passam a ser wrappers finos que renderizam apenas o header + o componente de conteúdo, mantendo as rotas funcionais.

### 2. Adicionar tabs no `CrmHubPage.tsx`

Substituir os botões "Dashboard Executivo" e "Match Analytics" do header por uma barra de tabs estilo Monday (full-width, sticky abaixo do header), com 3 abas:

```text
┌──────────────────────────────────────────────────────────────┐
│ [Visão Geral] [Dashboard Executivo] [Match Analytics]        │
└──────────────────────────────────────────────────────────────┘
```

- **Visão Geral** (default): conteúdo atual do hub — KPI header, NextActionsPanel, PipelineFunnel, TasksWidget, banner "Como o motor está aprendendo" e tabs internas Mandatos/Buyers/Atividades.
- **Dashboard Executivo**: renderiza `<ExecutiveDashboardContent />`.
- **Match Analytics**: renderiza `<MatchAnalyticsContent />`.

A aba ativa fica em estado local (`useState`) e é sincronizada com a query string `?tab=executivo|matching|geral` para permitir links diretos e refresh sem perder contexto.

### 3. Estilo das tabs (Monday-like)

Tabs largas, com ícone à esquerda, fundo zinc-900, borda inferior `#D9F564` quando ativa, hover sutil. Implementação manual (sem Radix) seguindo o padrão já usado nas tabs internas Mandatos/Buyers/Atividades para consistência visual.

### 4. Limpeza dos botões duplicados

No header do hub, manter apenas: **Novo mandato**, **Exports**, **Pipeline**, **Auditoria**, **Permissões**. Remover **Dashboard Executivo** e **Match Analytics** (agora são tabs).

### 5. Sidebar (`EBSidebar`) — verificar

Conferir se a sidebar tem links separados para Executivo/Matching e, se sim, apontá-los para `/equity-brain/crm?tab=executivo` e `?tab=matching` em vez das rotas isoladas (mantém UX coesa, mas não quebra deep-links antigos).

## Arquivos afetados

- **Criar**: `src/components/equity-brain/crm/exec/ExecutiveDashboardContent.tsx`
- **Criar**: `src/components/equity-brain/crm/match/MatchAnalyticsContent.tsx`
- **Editar**: `src/pages/equity-brain/CrmHubPage.tsx` (adicionar tabs de topo + render condicional)
- **Editar**: `src/pages/equity-brain/ExecutiveDashboardPage.tsx` (vira wrapper fino)
- **Editar**: `src/pages/equity-brain/MatchAnalyticsPage.tsx` (vira wrapper fino)
- **Editar (se aplicável)**: `src/components/equity-brain/EBSidebar.tsx` para apontar para tabs

## Resultado

Usuário em `/equity-brain/crm` vê 3 abas no topo e alterna entre Visão Geral, Dashboard Executivo e Match Analytics sem navegação entre rotas — exatamente como Monday.com. Todos os indicadores e gráficos já existentes (KPIs financeiros, evolução anual, donuts, localidades, crosstabs UF/Região/Setor, tabelas de vendedores/compradores) ficam acessíveis em um único lugar.
