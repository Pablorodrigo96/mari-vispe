## Fix: Diagnóstico/North Star ilegível (texto bone sobre fundo bone)

**Problema:** Em `AnnualPlanTimeline.tsx`, o card "North Star — Equity em 1 Ano" usa `!bg-gradient-to-br from-volt/15 ...` sem forçar a cor de fundo do `Card` shadcn. O `bg-card` padrão renderiza claro nesse contexto, e como o texto principal é `text-bone` (creme), tudo some.

**Mudança (apenas presentacional, 1 arquivo):**

`src/components/equity-planner/AnnualPlanTimeline.tsx` — card North Star (linhas 24–51):
- Trocar wrapper para `!bg-carbon/90 backdrop-blur-md` + manter brilho volt via camada interna com `bg-gradient-to-br from-volt/15 via-volt/5 to-transparent` (segue padrão do projeto: dark cards = `!bg-slate-900/60`/carbon + backdrop blur).
- Garantir hierarquia: `text-bone` para tese, `text-volt` para KPIs principais, `text-white/60` para labels.
- Reforçar `resumo_executivo` com `text-bone/90` e fundo `bg-carbon/60` na faixa lateral para destaque.

Sem alteração de lógica, sem novos componentes, sem mudanças em edge functions.
