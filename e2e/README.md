# E2E — Equity Brain

Testes Playwright que validam a navegação do cockpit `/equity-brain/*`.

## Como rodar

```bash
bunx playwright test e2e/redirects.spec.ts
```

O Playwright usa o `baseURL` definido no harness Lovable (preview do sandbox).
Se preferir apontar para outro alvo:

```bash
PLAYWRIGHT_BASE_URL=https://mari.vispe.com.br bunx playwright test e2e/redirects.spec.ts
```

## Sobre auth

Várias rotas do Equity Brain exigem login. O teste de redirects já é tolerante:
se cair em `/auth?redirect=...`, ele valida apenas que o `redirect` param aponta
para a rota nova esperada.

Para cobrir 100% (incluindo render de página), faça login manualmente no
preview antes de rodar a suite — o storage state é compartilhado.

## Mapa de redirects validados

| Antiga                                                | Nova                                              |
| ----------------------------------------------------- | ------------------------------------------------- |
| `/equity-brain/`                                      | `/equity-brain/dashboards/executivo`              |
| `/equity-brain/match-inbox`                           | `/equity-brain/oportunidades`                     |
| `/equity-brain/crm`                                   | `/equity-brain/pipeline`                          |
| `/equity-brain/crm/minhas-empresas`                   | `/equity-brain/pipeline?tab=empresas`             |
| `/equity-brain/mapa`                                  | `/equity-brain/pipeline?view=mapa`                |
| `/equity-brain/grafo`                                 | `/equity-brain/pipeline?view=grafo`               |
| `/equity-brain/crm/quick-fill`                        | `/equity-brain/pipeline`                          |
| `/equity-brain/buyers`                                | `/equity-brain/compradores`                       |
| `/equity-brain/teses`                                 | `/equity-brain/compradores?tab=teses`             |
| `/equity-brain/news`                                  | `/equity-brain/mercado`                           |
| `/equity-brain/board`                                 | `/equity-brain/dashboards/executivo`              |
| `/equity-brain/dashboard/executivo`                   | `/equity-brain/dashboards/executivo`              |
| `/equity-brain/dashboard/mandato`                     | `/equity-brain/dashboards/mandatos`               |
| `/equity-brain/dashboard/match`                       | `/equity-brain/dashboards/match`                  |
| `/equity-brain/dashboard/nbo`                         | `/equity-brain/dashboards/propostas`              |
| `/equity-brain/crm/imports`                           | `/equity-brain/admin/imports`                     |
| `/equity-brain/crm/admin/auditoria-operacional`       | `/equity-brain/admin/auditoria`                   |
| `/equity-brain/shadow`                                | `/equity-brain/admin/shadow`                      |
| `/equity-brain/grafo-jarvis`                          | `/equity-brain/admin/jarvis`                      |
