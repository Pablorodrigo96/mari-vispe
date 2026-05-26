## Ajustar respiro / bordas do Hero Plano Perfeito

A marginalia (`[01/03 — O PLANO PERFEITO]` e `VALUATION · 26 — LNG -46.63`) está colando no header e nas réguas laterais, e a headline encosta na borda esquerda. Vou aumentar os paddings de respiro mantendo a estética edge-to-edge.

### Mudanças em `src/components/valuation/plano-perfeito/PlanoPerfeitoHero.tsx`

1. **Top marginalia** — descer pra não colidir com o header fixo:
   - `top-6` → `top-20 md:top-24`
   - `left-6 lg:left-10` → `left-10 lg:left-16`
   - `right-6 lg:right-10` → `right-10 lg:right-16`

2. **Padding-top do conteúdo principal** — abrir espaço depois da marginalia:
   - `pt-20 md:pt-24` → `pt-28 md:pt-36 lg:pt-40`

3. **Padding lateral do conteúdo** — sair de cima das réguas verticais (wordmark esquerdo e ruler 00-03 direito ficam em `left-3` / `right-3`):
   - `px-6 md:px-10 lg:px-16` → `px-10 md:px-16 lg:px-24`

4. **Pilares full-bleed** — ajustar para o novo padding lateral:
   - `-left-6 -right-6 md:-left-10 md:-right-10 lg:-left-16 lg:-right-16` → `-left-10 -right-10 md:-left-16 md:-right-16 lg:-left-24 lg:-right-24`

5. **Bottom marginalia / fade** — manter `mt-8` mas aumentar `pb-12` → `pb-16` para dar respiro inferior.

### Resultado
- Headline "Construa a ponte" começa com ~40px da borda esquerda (não colada).
- Marginalia topo fica claramente abaixo do header, sem sobrepor logo/menu.
- Wordmark vertical esquerdo e ruler direito ficam visualmente separados do conteúdo.
- Card "Mari · Ao Vivo" não encosta na borda direita.
- Estrutura 12-col, marginalia, pilares edge-to-edge e tipografia ficam intactos.

### Arquivo
- `src/components/valuation/plano-perfeito/PlanoPerfeitoHero.tsx` (apenas ajustes de padding/posicionamento).
