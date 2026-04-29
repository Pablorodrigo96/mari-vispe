## Objetivo

1. Aumentar o tamanho dos logos nos cabeçalhos (público e logado).
2. Espalhar a presença da marca **mari** pelo site, com a mesma linguagem visual da home (símbolo "olho" Volt, wordmark "mari." gigante como watermark, tagline "designed forward" em caps espaçado).

---

## Parte 1 — Logos maiores nos cabeçalhos

| Local | Hoje | Proposto |
|---|---|---|
| `Header.tsx` (público) | `size={72}` em barra `h-20` (com `mt-[10px]/mb-[10px]/px-[50px]` herdado de edits visuais) | `size={96}`, remover padding lateral exagerado (`px-[50px]` → `px-2`), barra cresce para `h-24` |
| `AppSidebar.tsx` (logado, expandido) | `size={64}` em header `h-16` | `size={80}` e header sobe para `h-20`; colapsado: símbolo `size={48}` |
| `EBSidebar.tsx` (Equity Brain) | símbolo `size={48}` + texto "Equity Brain" pequeno | símbolo `size={56}` e título "Equity Brain" em `text-base` |
| `AppTopbar.tsx` | hoje só tem o texto "mari" no breadcrumb | adicionar `MariLogo variant="symbol-dark/light"` `size={28}` antes do breadcrumb (sutil mas presente) |
| `Footer.tsx` | lockup `size={88}` | manter, já está bom |

---

## Parte 2 — Identidade visual estendida (linguagem da home)

A home usa três "camadas" de marca que vamos replicar nas outras seções:

```text
[1] Símbolo Volt gigante, opacity ~0.07, sangrando pela borda
[2] Tagline "designed forward" em caps com letter-spacing 0.4em
[3] Wordmark "mari." em font-display gigante, opacity ~10%, no canto
```

### Páginas que recebem esse tratamento

**A. `Auth.tsx` (login/cadastro)**
- Adicionar `MariWatermark` Volt no canto superior direito (sangrando), opacity 0.06.
- Tagline "designed forward" em caps acima do título da tela.

**B. `Painel.tsx` (dashboard logado)**
- Hero do painel com `MariWatermark` Carbon discreto à direita (opacity 0.04 — fundo claro).
- Faixa fina "designed forward" sob o título da página.

**C. Hero das páginas de pilar (`Vender`, `Valuation`, `Investors`, `Capital`, `Matching`)**
- Já têm gradient escuro; adicionar o mesmo conjunto da home:
  - `MariWatermark` Volt sangrando à direita (`-right-40 -top-20 w-[640px]`).
  - Bloco `designed forward / mari.` no canto inferior direito (escondido em mobile).
- Componentizar como `<MariBrandStamp />` em `src/components/brand/MariBrandStamp.tsx` para reuso consistente.

**D. `BlindTeaser.tsx`**
- Adicionar marca d'água Volt no fundo do hero (apoia o tom premium do teaser).

**E. Seções intermediárias do site (cards de estatística, CTAs)**
- Inserir um separador decorativo `<MariDivider />` (linha fina + símbolo Volt centralizado) entre seções no Index, Vender e Valuation, no estilo editorial.

### Novos componentes

```text
src/components/brand/
├── MariLogo.tsx          (existente, recebe sizes maiores)
├── MariBrandStamp.tsx    (novo — watermark + wordmark canto)
└── MariDivider.tsx       (novo — separador editorial com símbolo)
```

`MariBrandStamp` props: `position` (`tr`|`br`|`bl`), `tone` (`volt`|`carbon`), `showWordmark` boolean.

`MariDivider`: linha horizontal fina com símbolo `size={28}` Volt no centro, padding vertical responsivo.

---

## Arquivos a editar

- `src/components/layout/Header.tsx` — logo maior, ajuste de altura
- `src/components/layout/AppSidebar.tsx` — logo maior
- `src/components/layout/AppTopbar.tsx` — adicionar símbolo
- `src/components/equity-brain/EBSidebar.tsx` — símbolo maior
- `src/components/brand/MariBrandStamp.tsx` — **novo**
- `src/components/brand/MariDivider.tsx` — **novo**
- `src/pages/Auth.tsx` — aplicar BrandStamp + tagline
- `src/pages/Painel.tsx` — BrandStamp sutil
- `src/pages/Vender.tsx`, `Valuation.tsx`, `Investors.tsx`, `Capital.tsx`, `Matching.tsx` — BrandStamp no hero
- `src/pages/BlindTeaser.tsx` — watermark no hero
- `src/pages/Index.tsx` — adicionar MariDivider entre as seções (substituir alguns `mt-X` por divider editorial)

Sem mudanças de banco, rotas ou lógica — puramente visual.