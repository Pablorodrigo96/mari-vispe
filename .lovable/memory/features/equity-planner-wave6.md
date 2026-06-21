---
name: Equity Planner Wave 6 — Relatório Executivo (PDF)
description: Página imprimível /equity-planner/:id/relatorio com branding Mari e botão "Baixar PDF" que abre em nova aba + window.print.
type: feature
---
- Rota nova `/equity-planner/:id/relatorio` (lazy) renderiza relatório A4 print-friendly: capa confidencial, resumo executivo (IPE+valor atual+potencial+veredito), Raio-X (radar + tabela 12 dimensões + destruidores), Valor (triangulação Múltiplos/DCF/SDE + addbacks + value bridge), Plano por sprint (tabela), Buyer Map (cards com alvo destacado), histórico de re-medições.
- CSS `@page A4` + `@media print` (no-print toolbar, page-breaks, color-adjust exact). Branding: Carbon `#0a0a0a` + Volt `#D9F564`.
- `?auto=1` na URL dispara `window.print()` automaticamente 600ms após carregar — usado pelo botão "Baixar PDF" no header do Assessment.
- Não exige Puppeteer/edge function — geração 100% client-side via diálogo de impressão do navegador (Salvar como PDF).
