# QA Manual — Redirects do Menu Lateral (Equity Brain)

Use este checklist após qualquer mexida em rotas do `/equity-brain/*`. Cole cada
URL antiga na barra do navegador (já logado como advisor/admin) e confirme que
a barra mostra a URL nova **sem 404** e o conteúdo correto carrega.

> Tempo estimado: ~5 minutos.

## Oportunidades

- [ ] `/equity-brain/match-inbox` → `/equity-brain/oportunidades`

## Pipeline

- [ ] `/equity-brain/crm` → `/equity-brain/pipeline`
- [ ] `/equity-brain/crm/minhas-empresas` → `/equity-brain/pipeline?tab=empresas` (tab "Empresas" ativa)
- [ ] `/equity-brain/mapa` → `/equity-brain/pipeline?view=mapa` (toggle "Mapa" ativo)
- [ ] `/equity-brain/grafo` → `/equity-brain/pipeline?view=grafo` (toggle "Grafo" ativo)
- [ ] `/equity-brain/crm/quick-fill` → `/equity-brain/pipeline` (drawer Quick Fill abre via botão "⚡ Preencher rápido")

## Compradores

- [ ] `/equity-brain/buyers` → `/equity-brain/compradores`
- [ ] `/equity-brain/teses` → `/equity-brain/compradores?tab=teses` (tab "Teses" ativa)

## Mercado

- [ ] `/equity-brain/news` → `/equity-brain/mercado`

## Dashboards

- [ ] `/equity-brain/` → `/equity-brain/dashboards/executivo`
- [ ] `/equity-brain/board` → `/equity-brain/dashboards/executivo`
- [ ] `/equity-brain/dashboard/executivo` → `/equity-brain/dashboards/executivo`
- [ ] `/equity-brain/dashboard/mandato` → `/equity-brain/dashboards/mandatos`
- [ ] `/equity-brain/dashboard/match` → `/equity-brain/dashboards/match`
- [ ] `/equity-brain/dashboard/nbo` → `/equity-brain/dashboards/propostas`

## Admin (apenas role admin)

- [ ] `/equity-brain/crm/imports` → `/equity-brain/admin/imports`
- [ ] `/equity-brain/crm/admin/auditoria-operacional` → `/equity-brain/admin/auditoria`
- [ ] `/equity-brain/shadow` → `/equity-brain/admin/shadow`
- [ ] `/equity-brain/grafo-jarvis` → `/equity-brain/admin/jarvis`

## Sanity extra

- [ ] Sidebar mostra **7 itens principais** + accordion "Dashboards" + accordion "Admin" (este último só para admin).
- [ ] Item "Hoje" continua em destaque (estilo Volt).
- [ ] Badge de Oportunidades exibe contagem hot quando `useMatchInbox` retorna >0.
- [ ] Estado ativo (highlight) do menu reflete a rota atual em todos os 19 redirects acima.
- [ ] Acessar uma rota inexistente (ex.: `/equity-brain/xxx`) cai no NotFound, **não** quebra o shell.
