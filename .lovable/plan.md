# Validação dos redirects de navegação (rotas antigas → novas)

## Objetivo

Garantir que toda rota antiga do cockpit Equity Brain redirecione para a nova rota correta após a reorganização do menu, sem 404 e preservando query params. Entregar dois artefatos complementares:

1. **Teste automatizado E2E** com Playwright (data-driven, roda contra o preview do sandbox).
2. **Checklist manual** em Markdown para QA visual rápida.

Nenhum código de produção é modificado — apenas arquivos novos de teste e documentação.

## Mapa autoritativo de redirects (extraído do `src/App.tsx`)

```text
/equity-brain/                                    → /equity-brain/dashboards/executivo
/equity-brain/match-inbox                         → /equity-brain/oportunidades
/equity-brain/crm                                 → /equity-brain/pipeline
/equity-brain/crm/minhas-empresas                 → /equity-brain/pipeline?tab=empresas
/equity-brain/mapa                                → /equity-brain/pipeline?view=mapa
/equity-brain/grafo                               → /equity-brain/pipeline?view=grafo
/equity-brain/crm/quick-fill                      → /equity-brain/pipeline
/equity-brain/buyers                              → /equity-brain/compradores
/equity-brain/teses                               → /equity-brain/compradores?tab=teses
/equity-brain/news                                → /equity-brain/mercado
/equity-brain/board                               → /equity-brain/dashboards/executivo
/equity-brain/dashboard/executivo                 → /equity-brain/dashboards/executivo
/equity-brain/dashboard/mandato                   → /equity-brain/dashboards/mandatos
/equity-brain/dashboard/match                     → /equity-brain/dashboards/match
/equity-brain/dashboard/nbo                       → /equity-brain/dashboards/propostas
/equity-brain/crm/imports                         → /equity-brain/admin/imports
/equity-brain/crm/admin/auditoria-operacional     → /equity-brain/admin/auditoria
/equity-brain/shadow                              → /equity-brain/admin/shadow
/equity-brain/grafo-jarvis                        → /equity-brain/admin/jarvis
```

## Arquivos a criar

### 1. `e2e/redirects.spec.ts`

Suite Playwright única, usando `test.describe.parallel` + `for...of` sobre uma tabela de pares `{ from, to }`. Cada caso:

- Faz `page.goto(from)`.
- Espera `page.waitForURL` casando `to` (com query params normalizados via `URL`).
- Verifica que `response.status()` ≠ 404 e que o conteúdo renderizou (sem fallback de NotFound) checando que o `EBSidebar` está visível (`getByText('Equity Brain')`).
- Para rotas que dependem de auth, o teste assume que o usuário já está logado no preview (mesma convenção do harness Lovable). Se o redirect levar a `/auth?redirect=...`, o teste registra como **skip com motivo** em vez de falhar — assim a suite ainda valida a maioria sem precisar de credenciais.

Estrutura:

```ts
const REDIRECTS: Array<{ from: string; to: string; label: string }> = [ /* 19 entradas */ ];

for (const r of REDIRECTS) {
  test(`redirect: ${r.label}`, async ({ page }) => { ... });
}
```

A rota Admin (`/admin/imports`, `/admin/auditoria`, `/admin/shadow`, `/admin/jarvis`) só renderiza para `isAdmin`. O teste valida apenas o **redirect de URL** (chegou na nova rota), não o conteúdo da página, para funcionar com qualquer perfil.

### 2. `e2e/README.md` (atualizado ou criado)

Como rodar:

```bash
bunx playwright test e2e/redirects.spec.ts
```

Inclui a tabela de redirects e instruções para login manual no preview antes de rodar (caso queira cobrir as rotas gated).

### 3. `docs/QA_REDIRECTS_CHECKLIST.md`

Checklist manual com a mesma tabela em formato `- [ ] /rota/antiga → /rota/nova` agrupada por seção (Oportunidades, Pipeline, Compradores, Mercado, Dashboards, Admin), para QA passar visualmente em ~5 minutos clicando direto na barra de URL.

## Critérios de aceite

- [ ] `bunx playwright test e2e/redirects.spec.ts` roda sem flakes contra o preview.
- [ ] 19 casos cobertos (15 obrigatórios + 4 admin como assert-only-de-URL).
- [ ] Falha clara quando algum redirect quebra (mensagem indica `from` e `to` esperados).
- [ ] Checklist em `docs/QA_REDIRECTS_CHECKLIST.md` espelha 100% da tabela.
- [ ] Nenhuma alteração em código de produção (`src/App.tsx`, sidebar, páginas).
