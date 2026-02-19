

## Fix: Header e Responsividade Mobile nas Paginas Dark

### Diagnostico

Testei todas as paginas com hero dark no mobile (390x844):

| Pagina | Status | Observacao |
|--------|--------|-----------|
| `/` (Home) | OK | Hero dark, header transparente, particulas funcionando |
| `/matching` | OK | Hero dark com badge AI, steps glass, animacoes |
| `/investors` | OK | Hero dark, particulas, stats, scroll correto |
| `/capital` | OK | Hero dark, slider glass, animacoes |
| `/valuation` | OK | Hero dark, planos glass, badges |
| `/vender` | BUG | Header transparente (texto branco) sobre pagina com fundo CLARO - texto "PME" fica invisivel |

### Problema encontrado

No array `darkHeroRoutes` do Header, a rota `/vender` esta incluida, mas essa pagina e um formulario com fundo claro (`bg-background`). Resultado: o header fica transparente com texto branco sobre fundo branco, tornando o logo e menu invisiveis.

A rota `/sell` (que tem o hero dark de landing page) nao esta no array.

### Correcao

**`src/components/layout/Header.tsx`** - linha do `darkHeroRoutes`:

Remover `/vender` e adicionar `/sell`:

```
// De:
const darkHeroRoutes = ['/', '/matching', '/matching/results', '/investors', '/capital', '/vender', '/valuation'];

// Para:
const darkHeroRoutes = ['/', '/matching', '/matching/results', '/investors', '/capital', '/sell', '/valuation'];
```

### Resumo da verificacao mobile

- Particulas CSS: funcionando em todas as paginas dark
- Header scroll: transicao transparente -> solido funciona corretamente
- Menu hamburger: abre com fundo solido, itens visiveis e clicaveis
- Animacoes framer-motion: stagger e fade-in ok no mobile
- Glass cards: responsivos, sem overflow horizontal
- Unico bug: `/vender` com header transparente incorreto (corrigido acima)
