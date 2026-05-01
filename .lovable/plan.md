## Diagnóstico

A rota `/equity-brain/mandatos/tabela` **existe** em `src/App.tsx` (linha 286) e está protegida por `RequireRole admin/advisor`. Ela renderiza `MandatosTablePage` corretamente — se você colar a URL na barra do navegador, abre.

**O problema real:** os links "Tabela mestre (editar)" e "Cobertura dashboards" foram adicionados apenas no `src/components/layout/AppSidebar.tsx` (sidebar do site público/painel), mas **NÃO** no `src/components/equity-brain/EBSidebar.tsx` — que é a sidebar que aparece quando você está em `/equity-brain/*` (Oportunidades, Pipeline, Compradores, etc.). Por isso parece que "não existe": dentro do Equity Brain não há botão para chegar lá.

## O que vou fazer

### 1. Adicionar entrada "Mandatos (tabela)" no `EBSidebar.tsx`

Inserir no array `MAIN` (logo depois de "Pipeline") OU no accordion **Admin** um novo item:

- **Tabela mestre** → `/equity-brain/mandatos/tabela` (ícone `Table` ou `ClipboardList`)
- **Cobertura dashboards** → `/equity-brain/admin/dashboard-coverage` (ícone `Gauge`)

Recomendação: colocar os dois dentro do accordion **Admin** existente (visível para admin) E também um atalho rápido em **MAIN** "Mandatos · tabela" visível para advisor+admin, já que o RPC `update_mandate_field` permite ambos os roles editarem.

### 2. Validar visualmente

Após o reload, conferir que:
- Sidebar do Equity Brain mostra "Mandatos · tabela" (com ícone Table) entre Pipeline e Compradores.
- Accordion Admin mostra "Cobertura dashboards".
- Clicar leva para `/equity-brain/mandatos/tabela` sem 404.
- Botão "Cobertura dashboards" dentro da página da Tabela continua funcionando (já existe).

### 3. Atualizar checklist de QA

Adicionar duas linhas em `docs/QA_REDIRECTS_CHECKLIST.md` confirmando os dois novos links da sidebar do Equity Brain.

## Arquivos a editar

- `src/components/equity-brain/EBSidebar.tsx` — adicionar 1 item em `MAIN` + 1 item em `ADMIN_ITEMS`.
- `docs/QA_REDIRECTS_CHECKLIST.md` — adicionar verificação dos novos links.

## Fora do escopo

- Não vou mexer em `App.tsx` (rota já existe e funciona).
- Não vou mexer em `MandatosTablePage.tsx` nem `DashboardCoveragePage.tsx`.
- Não vou alterar permissões nem o RPC `update_mandate_field`.
