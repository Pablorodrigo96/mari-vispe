# Onda 9 — Expor o Equity Planner

A página já existe em `/equity-planner` (sidebar: Valuation → Equity Planner), mas o usuário não encontra. Vamos torná-la visível em 4 superfícies.

## 1. Card no `/painel` (dashboard logado)
- Em `src/pages/Painel.tsx`, adicionar um card de destaque acima dos blocos atuais ("Equity Planner — diagnostique seus 12 pilares e descubra o gap pra ser top 10% do setor").
- Lógica: buscar último `equity_assessments` do user; se houver, CTA "Continuar diagnóstico" → `/equity-planner/:id`; senão "Iniciar diagnóstico grátis" → `/equity-planner/novo`.
- Mostrar mini-KPIs quando existir assessment computado: IPE, valuation atual, gap pro topo.

## 2. Seção na home pública `/`
- Em `src/pages/Index.tsx`, criar `EquityPlannerSection` (novo componente em `src/components/home/EquityPlannerSection.tsx`) entre as seções existentes.
- Conteúdo: headline ("Quanto sua empresa vale hoje vs. quanto poderia valer"), 3 bullets (12 pilares, benchmark setorial, plano 12m), CTA "Fazer diagnóstico" → `/equity-planner` (que já gateia auth).
- Visual alinhado ao design system mari (Carbon/Volt/Bone, glassmorphism).

## 3. Atalho no topbar/AppShell
- Em `src/components/layout/AppShell.tsx` (topbar), adicionar botão pequeno com ícone `Target` + label "Equity Planner" linkando para `/equity-planner`.
- Visível em ≥md; em mobile fica só o ícone.

## 4. Quest no `ProfileQuests`
- Em `src/components/profile/ProfileQuests.tsx`, adicionar 5ª missão "Faça seu Equity Planner".
- Concluída quando existir ≥1 `equity_assessments` com `status='computado'` (ou `promoted_mandate_id` not null) para o user.
- CTA "Começar" → `/equity-planner/novo`; "Ver" → `/meus-equity-planners`.

## Detalhes técnicos
- Nenhuma migration nova; reusa `equity_assessments` (campos `status`, `ipe_score`, `valuation_estimado`, `valuation_potencial`, `promoted_mandate_id`).
- Queries: 1 `select` por superfície, com cache via react-query (chave `['equity-planner-latest', userId]`).
- Sem mudanças no sidebar (já existe).
- Memória: atualizar `mem://features/equity-planner-wave9.md` documentando os 4 entry points.

## Arquivos
- editar: `src/pages/Painel.tsx`, `src/pages/Index.tsx`, `src/components/layout/AppShell.tsx`, `src/components/profile/ProfileQuests.tsx`
- criar: `src/components/home/EquityPlannerSection.tsx`, `src/components/painel/EquityPlannerCockpitCard.tsx`, `.lovable/memory/features/equity-planner-wave9.md`
