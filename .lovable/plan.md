## Diagnóstico

A navegação foi refatorada para 5 itens no menu (Hoje · Oportunidades · Pipeline · Compradores · Calls · Mercado), mas **links internos antigos** ainda apontam para caminhos que não existem mais e **não têm redirect**, deixando o usuário em telas em branco / 404 silencioso. É exatamente o que está acontecendo com você agora em `/equity-brain/mandate`.

### O que está quebrado

1. **`/equity-brain/mandate`** (sua URL atual) — não existe rota. O `App.tsx` só tem `crm/mandate/:id`, `crm/mandate/new` e `crm/mandate/:id/edit`. Sem `:id`, sem redirect → cai no layout vazio.
2. **Quick-Fill (drawer "Preencher rápido")** abre `QuickFillPage`, mas a query usa `supabase.schema("equity_brain").from("mandates")`. Esse schema não está exposto via PostgREST padrão → retorna 0 mandatos, por isso o screenshot mostra "0 / Carregando…" mesmo havendo 529 registros. Hoje os outros lugares (CrmHubPage, Kanban) usam `eb_mandates` (público).
3. **Botões "Novo Mandato" / "Editar"** continuam mandando para `/equity-brain/crm/mandate/new` e `/crm/mandate/:id/edit`. Isso ainda funciona, mas está **inconsistente** com a nova convenção (sem prefixo `crm/`). Não há atalho na sidebar.
4. **Falta um redirect catch-all para `/equity-brain/mandate`** (singular, sem ID) — quem digita ou tem link antigo cai no limbo.

## Plano de correção

### 1. Adicionar redirects das rotas antigas de mandato
Em `src/App.tsx`, na seção "Redirects de rotas antigas":
- `mandate` → `/equity-brain/pipeline` (lista)
- `mandate/new` → `/equity-brain/crm/mandate/new` (mantém canônico atual)
- `mandato` (PT) → `/equity-brain/pipeline`
- `vendedores` → `/equity-brain/pipeline`
- `vendedor/novo` → `/equity-brain/crm/mandate/new`

Mantém `crm/mandate/:id` e `crm/mandate/:id/edit` como canônicos (não vou renomear agora pra evitar quebrar 360-views já linkadas em notificações, atalhos e WhatsApp).

### 2. Consertar QuickFillPage (causa do "0 mandatos")
Em `src/pages/equity-brain/QuickFillPage.tsx`:
- Trocar `supabase.schema("equity_brain").from("mandates")` por `supabase.from("eb_mandates")` (mesmo padrão de `CrmHubPage.tsx` e `PipelineKanbanPage.tsx`).
- Confirmar nomes de coluna existentes via `read_query` em `eb_mandates` antes do `.update()` para não quebrar persistência.
- Atualizar invalidação de queryKeys (`eb-mandates`, `crm-hub-*`, `pipeline-kanban`) pra refletir nas outras telas.

### 3. Adicionar acesso direto a "Novo Mandato" no AppShell/sidebar
Hoje só existe via Pipeline → "Preencher rápido" (que está quebrado) ou link interno do CrmHub. Vou adicionar:
- Botão **"+ Novo mandato"** no topo da `PipelinePage` (ao lado do toggle Lista/Kanban/Mapa/Grafo) → vai pra `/equity-brain/crm/mandate/new`.
- Mantém o "Preencher rápido" como drawer (depois do fix #2 ele finalmente carrega os 529 mandatos).

### 4. QA manual
Testar no preview as URLs:
- `/equity-brain/mandate` → redireciona pra Pipeline ✓
- `/equity-brain/pipeline` (Lista, Kanban, Mapa, Grafo) carrega
- "+ Novo mandato" abre formulário e salva
- "Preencher rápido" mostra os 529 mandatos
- `/equity-brain/crm/mandate/<id>` continua abrindo Mandate 360

## Detalhes técnicos

**Arquivos editados:**
- `src/App.tsx` — adicionar 5 `<Route>` de redirect
- `src/pages/equity-brain/QuickFillPage.tsx` — trocar schema/tabela + ajustar query keys
- `src/pages/equity-brain/PipelinePage.tsx` — adicionar botão "+ Novo mandato"

**Não vou mexer em:**
- Nomes canônicos `/equity-brain/crm/mandate/:id` (alto risco — usado em notificações, deeplinks de WhatsApp e exports)
- Esquema do banco
- Sidebar (já está enxuta)

Quer que eu prossiga? Se preferir, posso também (a) renomear todas as rotas para `mandato/:id` (PT) com redirect das antigas, ou (b) adicionar "+ Novo mandato" no topbar global em vez de só na PipelinePage — me avisa se quer alguma dessas variações.
