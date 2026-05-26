## Compactar Hero do Plano Perfeito

O hero atual ocupa `min-h-screen` + pilares dentro = altura excessiva. Vou reduzir drasticamente mantendo a estética edge-to-edge.

### Mudanças em `PlanoPerfeitoHero.tsx`

1. **Altura**: remover `min-h-screen` e `flex-1`. Usar padding compacto:
   - `pt-20 md:pt-24 pb-12` (era `pt-24/28/32` + `pb-10` + min-screen)
   - Sem `min-h-screen flex flex-col`.

2. **Headline menor**:
   - `text-4xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-[6rem]` (era até `8.5rem`)
   - `leading-[0.95]` mantido.
   - Reduzir o destaque "até o bilhão." de `py-2 mt-4` para `py-1 mt-2`.

3. **Espaçamentos internos** comprimidos:
   - `mb-8 lg:mb-12` → `mb-5 lg:mb-7` (eyebrow)
   - `mt-10 lg:mt-14` → `mt-7 lg:mt-9` (CTA row)
   - Gap do grid `gap-10 lg:gap-8` → `gap-8 lg:gap-6`
   - Padding do botão `py-5` → `py-4`

4. **Card Mari · Ao Vivo** mais denso:
   - `p-6 lg:p-7` → `p-5`
   - `space-y-4` → `space-y-2`
   - `py-3` por linha → `py-2`
   - `mb-6` header → `mb-4`; `mt-6 pt-5` footer → `mt-4 pt-4`
   - Texto da stat `text-lg` → `text-base`

5. **Pilares**: extrair para fora do hero OU compactar agressivamente
   - Manter dentro mas: `mt-16 lg:mt-24` → `mt-10 lg:mt-14`
   - `py-8` → `py-6`
   - Número gigante `text-[140/180/220px]` → `text-[110px] md:text-[140px] lg:text-[170px]`
   - `mb-5` eyebrow → `mb-3`; título `text-2xl md:text-3xl` → `text-xl md:text-2xl`; `mb-3` → `mb-2`

6. **Marginalia bottom**: `mt-12` → `mt-8`.

7. **Fade bottom**: `h-32` → `h-20`.

### Resultado esperado
Hero cabe confortavelmente em ~1 viewport desktop (1232px alt) sem rolagem absurda, mantendo grid 12-col, marginalia nas 4 bordas, card Mari à direita, 3 pilares edge-to-edge e tipografia bold do home.

### Arquivos
- `src/components/valuation/plano-perfeito/PlanoPerfeitoHero.tsx` (somente ajuste de tamanhos/spacings, sem mudança estrutural).
