# Redesign Hero "O Plano Perfeito" — Editorial Brutalist

Reescrever `src/components/valuation/plano-perfeito/PlanoPerfeitoHero.tsx` adotando a direção escolhida (v1):

- Fundo Carbon puro `#0A0A0A` (sem radial washed), com SVG decorativo de linhas diagonais Volt à direita (opacity 10%) sugerindo "ponte".
- Eyebrow superior: bolinha Volt pulsante + label "O PLANO PERFEITO" em letter-spacing alto.
- Headline em **Playfair Display** (serif editorial), 5xl→8xl, "Construa a ponte da sua empresa **até o bilhão.**" — onde "até o bilhão." vai dentro de bloco sólido Volt com texto Carbon (highlighter style igual à home).
- CTAs lado a lado:
  - Primário: bloco Volt sólido (sem border-radius), "CONSTRUIR MEU PLANO PERFEITO" uppercase tracking-wider, hover branco.
  - Secundário: ghost com underline animado + ícone seta, "VER COMO FUNCIONA".
- Linha inferior com 3 pilares separados por bordas brancas 10%, cada um com número Volt mono ("01 — STATUS QUO"), título serif e descrição.
- Sem partículas, sem glass-card, sem motion exagerado. Apenas fades sutis com framer-motion.

Mudanças adicionais:
- `index.html`: adicionar **Playfair Display** ao link de fontes do Google.
- Remover scroll-indicator "Calcule o valor atual" (não combina com a estética editorial; o usuário rola naturalmente).

Arquivos:
- `src/components/valuation/plano-perfeito/PlanoPerfeitoHero.tsx` (rewrite)
- `index.html` (adicionar Playfair Display)

Nada mais é tocado.
