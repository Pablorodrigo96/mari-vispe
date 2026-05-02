
# Fase B — Reativação de órfãos (gaps remanescentes)

## Estado atual confirmado no código

Ao ler `src/App.tsx`, `src/pages/equity-brain/PipelinePage.tsx` e `CompradoresPage.tsx`, **a maior parte do spec já está implementada**:

- ✅ `PipelinePage` já tem tabs (Mandatos/Empresas), toggle de view (Lista/Kanban/Mapa/Grafo), botão "+ Novo mandato" e botão "⚡ Preencher rápido" abrindo `QuickFillPage` em `Sheet` (drawer). Spec B.2 e B.3 satisfeitos.
- ✅ `CompradoresPage` já lê `?tab=teses` e renderiza `TesesPage`. Spec atendido.
- ✅ Redirects de `match-inbox`, `crm`, `crm/minhas-empresas`, `mapa`, `grafo`, `crm/quick-fill`, `mandate/new`, `mandato/novo`, `vendedor/novo`, `buyers`, `teses`, `news`, `board`, `dashboard/*`, `crm/imports`, `shadow`, `grafo-jarvis`, `monday-parity`, `advisors-mapping`, `deal/:id` — todos presentes.

## Gaps reais a corrigir

### B.a — `view=lista` está renderizando o componente errado
`PipelinePage` (linha ~118) renderiza `<CrmHubPage />` quando `view=lista`. O spec diz que lista deve ser `MandatosTablePage`. `CrmHubPage` está marcado para descontinuar (B.5). Trocar para `MandatosTablePage`.

### B.b — Redirect `deal/:id` aponta para o lugar errado
Hoje (`App.tsx` linha 281): `deal/:id` → `/equity-brain/pipeline`.
Spec B.4 pede: `deal/:id` → `/equity-brain/crm/mandate/:id` (preserva o id na URL).
Trocar para `<Navigate to="../crm/mandate/:id" replace />` usando React Router relative redirect — na prática usar componente wrapper que lê `useParams` e redireciona, porque `Navigate` não interpola `:id`.

### B.c — Faltam dois redirects do spec
Adicionar em `App.tsx` (dentro do bloco `/equity-brain`):
- `mandate/:id` → wrapper que redireciona para `crm/mandate/:id` preservando o id
- (opcional) `mandate/new` já existe ✓

### B.d — Marcar páginas deprecated (sem deletar)
Adicionar comentário JSDoc `@deprecated` no topo de:
- `src/pages/equity-brain/BoardPage.tsx`
- `src/pages/equity-brain/MatchInboxPage.tsx`
- `src/pages/equity-brain/CrmHubPage.tsx`
- `src/pages/equity-brain/DashboardPage.tsx`

Não remover os arquivos — só sinalizar para futuros leitores.

### B.e — `view` default
Spec diz default `kanban`; código atual default `lista`. Como hoje o "lista" também está quebrado (renderiza CrmHubPage), e Kanban é mais útil como tela de entrada, **mudar default de `view` para `kanban`** em `PipelinePage.tsx`.

## Arquivos a tocar

- `src/pages/equity-brain/PipelinePage.tsx` — trocar `CrmHubPage` por `MandatosTablePage`, mudar default view para `kanban`.
- `src/App.tsx` — corrigir `deal/:id` para preservar id, adicionar redirect `mandate/:id`.
- Novo helper minúsculo `src/components/equity-brain/RedirectWithParams.tsx` (≈10 linhas) para `Navigate` com interpolação de `:id`.
- `BoardPage.tsx`, `MatchInboxPage.tsx`, `CrmHubPage.tsx`, `DashboardPage.tsx` — apenas adicionar comentário `@deprecated` no topo.

## Não vou fazer (fora do escopo)

- **Não vou deletar** nenhum componente (regra global do briefing: deletar só com aprovação explícita posterior).
- Não vou criar `QuickFillDrawer` separado nem refatorar `QuickFillPage` em `QuickFillContent` — o drawer já funciona inline via `Sheet` + `QuickFillPage`. Refatoração extra seria churn sem ganho.
- Não vou criar `PipelineHeader` separado — o header já está bem encapsulado dentro de `PipelinePage`.

## Critérios de aceite (vou validar pós-deploy)

- `/equity-brain/pipeline` (sem query) abre em **Kanban**.
- `/equity-brain/pipeline?view=lista` mostra `MandatosTablePage`.
- `/equity-brain/pipeline?view=mapa` mostra mapa, `?view=grafo` mostra grafo.
- `/equity-brain/pipeline?tab=empresas` mostra `MyCompaniesPage`.
- Botão "⚡ Preencher rápido" abre o drawer com `QuickFillPage` (já funciona).
- `/equity-brain/deal/abc123` redireciona para `/equity-brain/crm/mandate/abc123` (id preservado).
- `/equity-brain/mandate/abc123` redireciona para `/equity-brain/crm/mandate/abc123`.
- 4 arquivos legados marcados `@deprecated` (lint-friendly).

Posso prosseguir?
