---
name: Equity Planner Wave 9 — Entry Points
description: Quatro superfícies de acesso ao Equity Planner (painel, home pública, topbar, profile quests) sem mexer no sidebar.
type: feature
---
# Onda 9 — Exposição do Equity Planner

Após ondas 1–8, a rota `/equity-planner` só estava acessível pelo sidebar (Valuation → Equity Planner). Esta onda adiciona 4 entry points adicionais:

1. **Painel logado (`/painel`)** — `EquityPlannerCockpitCard` logo abaixo do `MariOriginBadge`. Busca último `equity_assessments` do user; mostra IPE/Valor/Gap quando `status='computado'`, e CTA varia entre "Iniciar diagnóstico" / "Continuar" / "Abrir mandato" (se `promoted_mandate_id`).
2. **Home pública (`/`)** — `EquityPlannerSection` antes do `HomeBelowFold`, com bullets 12 pilares + benchmark + plano 12m. CTA primário leva direto pra `/equity-planner` (auth gate na própria rota).
3. **AppTopbar** — Botão `Target` "Equity Planner" (lg+) / ícone-only (md), linkando `/equity-planner`, visível em todas as rotas logadas.
4. **ProfileQuests** — 5ª missão "Faça seu Equity Planner". Conta `equity_assessments` com `status='computado'` por user.

Sem migrations. Reusa campos existentes de `equity_assessments` (status, ipe_score, valuation_estimado, valuation_potencial, promoted_mandate_id).

## Arquivos
- novo: `src/components/painel/EquityPlannerCockpitCard.tsx`
- novo: `src/components/home/EquityPlannerSection.tsx`
- editado: `src/pages/Painel.tsx`, `src/pages/Index.tsx`, `src/components/layout/AppTopbar.tsx`, `src/components/profile/ProfileQuests.tsx`
