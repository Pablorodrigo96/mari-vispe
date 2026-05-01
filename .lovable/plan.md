# Reorganização do Menu Lateral do Equity Brain

## Escopo

Refatoração **somente de navegação** dentro do cockpit `/equity-brain/*`. Nenhuma página, componente ou lógica é removida. Tudo continua acessível — só muda onde o advisor encontra. Todas as rotas atuais passam a redirecionar para as novas, sem 404.

O sidebar afetado é `src/components/equity-brain/EBSidebar.tsx` (cockpit interno). O `AppSidebar.tsx` (área pública/cliente) **não é tocado**.

## Mapa: rotas atuais → novas rotas

Todas as rotas novas vivem dentro do `EquityBrainLayout` (prefixo `/equity-brain`), preservando guard de role e o shell atual.

```text
ATUAL                                       NOVA                                    AÇÃO
/equity-brain/hoje                          /equity-brain/hoje                      mantém
/equity-brain/match-inbox                   /equity-brain/oportunidades             redirect
/equity-brain/oportunidades                 /equity-brain/oportunidades?tab=andamento  redirect (rota antiga reaproveitada como wrapper novo)
/equity-brain/crm                           /equity-brain/pipeline                  redirect
/equity-brain/crm/minhas-empresas           /equity-brain/pipeline?tab=empresas     redirect
/equity-brain/mapa                          /equity-brain/pipeline?view=mapa        redirect
/equity-brain/grafo                         /equity-brain/pipeline?view=grafo       redirect
/equity-brain/crm/quick-fill                /equity-brain/pipeline (botão QuickFill no header) redirect
/equity-brain/buyers                        /equity-brain/compradores               redirect
/equity-brain/teses                         /equity-brain/compradores?tab=teses     redirect
/equity-brain/calls                         /equity-brain/calls                     mantém
/equity-brain/news                          /equity-brain/mercado                   redirect
/equity-brain/                              /equity-brain/dashboards/executivo      redirect (index)
/equity-brain/board                         /equity-brain/dashboards/executivo      redirect
/equity-brain/dashboard/executivo           /equity-brain/dashboards/executivo      redirect
/equity-brain/dashboard/mandato             /equity-brain/dashboards/mandatos       redirect
/equity-brain/dashboard/match               /equity-brain/dashboards/match          redirect
/equity-brain/dashboard/nbo                 /equity-brain/dashboards/propostas      redirect
/equity-brain/crm/imports                   /equity-brain/admin/imports             redirect
/equity-brain/crm/admin/auditoria-operacional /equity-brain/admin/auditoria         redirect
/equity-brain/shadow                        /equity-brain/admin/shadow              redirect
/equity-brain/grafo-jarvis                  /equity-brain/admin/jarvis              redirect
/equity-brain/admin/health                  /equity-brain/admin/health              mantém
```

Itens existentes que **não estão no menu novo mas continuam acessíveis** por links contextuais (deal detail, mandate detail, CRM admin, ISP, exports, disclosures, etc.) **mantêm rotas inalteradas** — só somem da sidebar.

## Estrutura nova do EBSidebar (7 + Admin)

```text
🔥 Hoje
📬 Oportunidades              [novos count]
💼 Pipeline
🎯 Compradores
📞 Calls
📰 Mercado
📊 Dashboards            ▾
   📈 Executivo
   🏛 Mandatos
   ≋  Match
   📝 Propostas
─────────────────────────
⚙️  Admin                ▾    (apenas role admin)
   ⬆ Importar
   🔍 Auditoria
   🔀 Shadow
   🌐 Jarvis 3D
   📊 Paridade Monday
   👥 Mapeamento Advisors
   💚 Health
```

Visual mantém o tema atual (zinc-950, accent Volt `#D9F564`, item Hoje em destaque).

## Páginas-wrapper a criar

### `OportunidadesPage` (substitui o arquivo atual `OportunidadesPage.tsx`)
- Tabs no topo: **Novos** · **Em andamento** · **Todos**.
- Tab `novos` (default) → renderiza `<MatchInboxPage />` (matches frescos).
- Tab `andamento` → renderiza o componente da Oportunidades atual (extraído do arquivo atual, renomeado `OportunidadesEmAndamento`).
- Tab `todos` → mostra ambos sem filtro de "novo".
- Lê `?tab=` da URL via `useSearchParams`; badge do sidebar usa contagem hot do `useMatchInbox` já existente.

### `PipelinePage` (nova)
- Tabs: **Mandatos** (default) · **Empresas**.
- Tab Mandatos: header com toggle `Lista | Kanban | Mapa | Grafo` + botão `⚡ Preencher rápido`.
  - Lista → `<CrmHubPage />` (componente existente reusado embutido).
  - Kanban → `<PipelineKanbanPage />`.
  - Mapa → `<MapaPage />`.
  - Grafo → `<GrafoPage />`.
  - Botão QuickFill → abre `<Sheet>` (drawer shadcn) renderizando `<QuickFillPage />` em modo embedded.
- Tab Empresas: `<MyCompaniesPage />`.
- Estado controlado por `?tab=` e `?view=`.

### `CompradoresPage` (nova)
- Tabs: **Compradores** (default) · **Teses**.
- Renderiza `<BuyersPage />` ou `<TesesPage />` conforme `?tab=`.

### Submenu Dashboards
Sem wrapper — submenu accordion no sidebar aponta para 4 rotas novas que reusam os componentes existentes:
- `/equity-brain/dashboards/executivo` → `DashboardExecutivoPage` (com `BoardPage` mesclado abaixo como seção "Board Executivo").
- `/equity-brain/dashboards/mandatos` → `DashboardMandatoPage`.
- `/equity-brain/dashboards/match` → `DashboardMatchPage`.
- `/equity-brain/dashboards/propostas` → `DashboardNboPage`.

### Submenu Admin
Aponta direto para rotas existentes (com renames quando necessário). Páginas Paridade/Mapeamento Advisors **já existem** em `/admin/monday-parity` e `/admin/advisors-mapping` (fora do `/equity-brain`); o submenu linka diretamente para essas rotas top-level. Health vai para `/equity-brain/admin/health` (existente).

## Mudanças em arquivos

**Reescrito**:
- `src/components/equity-brain/EBSidebar.tsx` — nova estrutura com 7 itens, badge dinâmico, accordions Dashboards/Admin (Admin gated por `useUserRoles().isAdmin`).
- `src/pages/equity-brain/OportunidadesPage.tsx` — vira wrapper com tabs (extrai conteúdo atual para subcomponente interno).

**Novos**:
- `src/pages/equity-brain/PipelinePage.tsx`
- `src/pages/equity-brain/CompradoresPage.tsx`

**Editado**:
- `src/App.tsx` — adiciona rotas novas (`oportunidades`, `pipeline`, `compradores`, `mercado`, `dashboards/*`) dentro do bloco `<Route path="/equity-brain">`; adiciona `<Route ... element={<Navigate to=... replace />} />` para todas as rotas antigas listadas no mapa; mantém todas as rotas internas atuais (deal detail, mandate detail, CRM admin sub-rotas, ISP, exports, disclosures) intactas para não quebrar links profundos.

## Critérios de aceite

- [ ] Sidebar mostra exatamente 7 itens principais + seção Admin (admin only).
- [ ] Badge de Oportunidades reflete `useMatchInbox` (hot count).
- [ ] Tabs em Oportunidades, Pipeline e Compradores funcionam e refletem na URL.
- [ ] Toggle de view em Pipeline troca entre Lista/Kanban/Mapa/Grafo sem recarregar a página.
- [ ] Botão `⚡ Preencher rápido` abre drawer com QuickFill.
- [ ] Accordion Dashboards expande inline e linka para 4 sub-rotas novas.
- [ ] Accordion Admin só aparece para `isAdmin === true`.
- [ ] Acessar qualquer rota antiga listada redireciona para a nova (sem 404, preservando queryparams quando aplicável).
- [ ] Rotas profundas não listadas no menu (ex.: `/equity-brain/empresa/:cnpj`, `/equity-brain/crm/mandate/:id`) continuam funcionando normalmente.
- [ ] Estado ativo do menu destaca o item correto em todas as novas rotas e nas tabs/views.
- [ ] Sidebar permanece responsivo e mantém tema dark + accent Volt.
