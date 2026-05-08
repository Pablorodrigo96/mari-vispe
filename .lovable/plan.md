## Objetivo
Eliminar overflows, textos cortados e CTAs que vazam no mobile (≤440px) nas telas públicas, **sem mudar estrutura/layout** — apenas paddings, font-sizes responsivos e wrapping.

## Auditoria — problemas encontrados

**1. Hero / `HeroCarousel.tsx`**
- `text-4xl md:text-5xl …` no `<h1>` é OK no base, mas o **bloco amarelo** highlight (`text-2xl … bg-volt … px-2`) com tracking apertado pode estourar a largura em telas estreitas (frases longas tipo "É timing, preparação e comprador certo.").
- `min-h-[440px]` força altura grande mesmo quando conteúdo é pequeno → muito espaço vazio no mobile.
- CTAs com `h-12 px-7 text-base` lado a lado em `flex-wrap`: o secundário "Explorar empresas" empurra layout.

**2. `Index.tsx` (Home)**
- `pt-28 pb-24` no hero é excessivo no mobile (gera muito scroll antes do CTA).
- `px-6` lateral pode ser reduzido no mobile.
- CTA "Analisar minha empresa AGORA →" usa `h-14 px-10 text-base md:text-lg` — extrapola 100% da largura disponível em 360–390px.
- Stats grid `grid-cols-2` com `text-xl md:text-2xl font-mono` para valores tipo "R$ 4.000.000.000" → overflow.
- Watermark `text-[120px]` está com `hidden lg:block` — OK.

**3. `ConfidentialitySection.tsx`**
- Botão `h-12 px-8 text-base` pode estourar; conteúdo OK.

**4. `Sell.tsx`**
- `text-3xl sm:text-4xl` OK; mas hero stats `grid-cols-2` com `text-2xl sm:text-3xl` font-bold ("R$ 2bi" cabe, "+500" cabe) — ✅.
- Botões CTA com `text-lg px-8` em `flex-col sm:flex-row` empilham bem.
- Padding `py-16` em seções pode ser reduzido.

**5. `ValuationTypeSelector.tsx`**
- `text-3xl sm:text-4xl` OK no h1.
- Banner sigilo `inline-flex … px-4 py-2 text-xs sm:text-sm` com 1 linha longa → quebra feia, falta `text-balance` ou layout em coluna.
- CTA "Descobrir Meu Valor Grátis" com `text-lg px-10 py-6` — vaza em telas estreitas.
- Stats `flex flex-wrap gap-8` OK, mas `gap-8` é muito no mobile.
- Card de plano com `text-3xl` "R$ 697" e `<Badge>` ao lado — OK.

**6. `Auth.tsx`**
- `max-w-md` + `px-4` OK. Form em si está bem. Apenas o `MariBrandStamp` size 520/420 pode causar overflow horizontal sutil em alguns devices — verificar `overflow-hidden` (já existe no parent).

**7. `Footer.tsx`**
- Confidentiality banner usa `flex flex-col md:flex-row gap-3` ✅.
- Grid principal `grid-cols-2 md:grid-cols-4 lg:grid-cols-5` ✅.
- Bloco "Brand" `col-span-2` no mobile ocupa toda a largura ✅.
- Copy/footer bottom OK.

## Mudanças propostas (CSS-only)

### `src/components/home/HeroCarousel.tsx`
- Reduzir `min-h-[440px] md:min-h-[480px]` → `min-h-[380px] md:min-h-[480px]`.
- `<h1>`: `text-4xl md:text-5xl …` → `text-[2rem] sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl` (32px no mobile).
- Highlight: `text-2xl md:text-3xl …` → `text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl`; ajustar `px-2` → `px-1.5 sm:px-2`.
- Body: `mb-9` → `mb-6 sm:mb-9`.
- CTAs: container `flex-wrap` → `flex-col sm:flex-row` no mobile, `w-full sm:w-auto` no botão principal; reduzir `px-7` → `px-5 sm:px-7`.
- Controls row `gap-6` → `gap-3 sm:gap-6`.

### `src/pages/Index.tsx`
- Hero `pt-28 pb-24` → `pt-24 pb-16 md:pt-40 md:pb-36`.
- Container `px-6 lg:px-12` → `px-4 sm:px-6 lg:px-12`.
- CTA "Analisar minha empresa": `h-14 px-10 text-base md:text-lg` → `h-12 sm:h-14 px-6 sm:px-10 text-sm sm:text-base md:text-lg w-full sm:w-auto max-w-full`, e adicionar `whitespace-normal text-center leading-tight` para permitir quebra (ou texto curto no mobile via `<span className="sm:hidden">Analisar agora</span><span className="hidden sm:inline">Analisar minha empresa AGORA →</span>`).
- Stats grid: `text-xl md:text-2xl` → `text-base sm:text-xl md:text-2xl` + `truncate` removido (já tem em label).
- Categories grid altura `h-44 md:h-56` OK.

### `src/components/home/ConfidentialitySection.tsx`
- Botão: `h-12 px-8` → `h-12 px-6 sm:px-8 w-full sm:w-auto max-w-xs sm:max-w-none mx-auto whitespace-normal text-center`.
- Section padding `py-24` → `py-16 md:py-24`.

### `src/components/home/HomeBelowFold.tsx`
- CTA "Anunciar Grátis": `px-12 h-14 text-lg` → `px-8 sm:px-12 h-12 sm:h-14 text-base sm:text-lg w-full sm:w-auto max-w-xs sm:max-w-none`.
- Section `py-24 md:py-32` → `py-16 md:py-32`.
- `<h2>` `text-2xl md:text-4xl` OK.

### `src/pages/Sell.tsx`
- Hero `pt-24 pb-16` OK.
- CTAs: adicionar `w-full sm:w-auto` nos dois botões.
- Stats `gap-6` → `gap-4 sm:gap-6`, `mt-12` → `mt-10`.

### `src/components/valuation/ValuationTypeSelector.tsx`
- Section `pt-24 pb-20` → `pt-20 pb-16 md:pt-24 md:pb-20`.
- `<h1>` `text-3xl sm:text-4xl` OK.
- Banner sigilo `inline-flex … px-4 py-2`: trocar para `flex flex-col sm:inline-flex sm:flex-row items-center gap-2 px-3 sm:px-4 py-2 text-center` e `text-xs sm:text-sm`.
- CTA "Descobrir Meu Valor Grátis": `text-lg px-10 py-6` → `text-base sm:text-lg px-6 sm:px-10 py-5 sm:py-6 w-full sm:w-auto max-w-xs sm:max-w-none`.
- Stats counters: `gap-8` → `gap-5 sm:gap-8`; `text-2xl sm:text-3xl` OK.
- Plan cards `p-6` → `p-5 sm:p-6`.
- Plan price `text-3xl` → `text-2xl sm:text-3xl`.
- Buttons das compras individuais: já são `w-full` ✅.
- Grid "Iniciar Valuation" `grid md:grid-cols-3 gap-6` → `gap-4 md:gap-6`.

### `src/components/valuation/ValuationWhySection.tsx`, `TrustSection.tsx`, `ValuationBeforeAfter.tsx`
- Apenas reduzir paddings de seção `py-20`/`py-24` → `py-14 md:py-20` e font-sizes de subtítulos para versões `text-base sm:text-lg` quando estiverem em `text-lg` puro.
- Garantir `break-words` em parágrafos longos.

### `src/pages/Auth.tsx`
- `MariBrandStamp` size 520/420: parent já tem `overflow-hidden`, **nenhuma mudança**.
- `px-4 py-8` OK.
- Tabs e forms: ✅ já mobile-friendly.

### `src/components/layout/Footer.tsx`
- Banner sigilo: `gap-3 md:gap-6` OK; `text-xs sm:text-sm` OK ✅.
- Grid: `gap-8 lg:gap-12` → `gap-6 sm:gap-8 lg:gap-12`.
- `py-16` → `py-12 md:py-16`.
- Bottom row já é `flex-col md:flex-row` ✅.

## Critério de validação
Após edições, abrir `/`, `/valuation`, `/sell`, `/vender`, `/auth` em viewport 360px, 390px e 440px e verificar:
- Sem scroll horizontal.
- CTAs nunca cortam texto.
- Highlight amarelo do hero não vaza.
- Stats numéricos cabem.

## Fora de escopo
- Mudanças estruturais (esconder colunas, transformar tabela em cards).
- Telas logadas (Painel, EB, Meus Anúncios, etc.) — pode ser próximo passo.
- Refatoração de componentes em variantes mobile/desktop.
