## Problema

No mobile, a `GraphFilterSidebar` do Jarvis 3D (`/equity-brain/grafo-jarvis`) é renderizada como `aside w-64` absoluta — em telas de ~440px ela cobre ~60% da viewport sobre o globo, e fica aberta por padrão.

## Solução

Tornar a sidebar de filtros **colapsada por padrão no mobile** e, quando aberta, comportar como **drawer overlay** (largura proporcional + dim de fundo + botão fechar bem visível), em vez de barra lateral fixa que come metade da tela. No desktop nada muda.

## Mudanças

### 1. `src/components/equity-brain/jarvis/JarvisGraph3D.tsx`
- Importar `useIsMobile`.
- Inicializar `filterCollapsed` como `true` quando `isMobile`, `false` no desktop (via `useState(() => ...)` + efeito que sincroniza ao trocar de breakpoint).

### 2. `src/components/equity-brain/graph/GraphFilterSidebar.tsx`
- Aceitar comportamento mobile-friendly (sem precisar de prop nova — usar `useIsMobile` internamente).
- No estado **expandido** em mobile:
  - Largura `w-[78vw] max-w-[280px]` (em vez de `w-64` fixa).
  - Adicionar **backdrop** clicável (`fixed inset-0 bg-black/50 z-[9]`) atrás do `aside`, que fecha ao clicar.
  - Subir `z-index` do aside para `z-20` para ficar acima dos overlays do grafo.
  - Botão de fechar (ChevronLeft) já existe no header da sidebar — reforçar área de toque (`p-2`).
- No estado **colapsado** em mobile: o botão flutuante atual (top-3 left-3, h-9 w-9) já serve; aumentar levemente para `h-10 w-10` e garantir `z-20`.
- Nada muda no desktop (`md:` mantém comportamento atual).

### 3. Validação
- Confirmar que ao abrir o filtro no mobile o globo continua interagível ao fechar (backdrop clicável).
- Verificar que HUD top-right (`Equity Brain · Jarvis`) não conflita com o botão de abrir filtro (ele fica no top-left, sem sobreposição).
- Sem mudanças de lógica de filtro/dados.

## Fora de escopo
- 2D `StrategicGraph` (já tem o mesmo componente, ganha o fix de graça por usar a mesma `GraphFilterSidebar`).
- Mudar conteúdo dos filtros.
