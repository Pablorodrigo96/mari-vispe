## Block 3 — Fix de contraste/tema no cockpit Bloomberg

### Diagnóstico
O screenshot mostra que todos os painéis Bloomberg do `/painel` estão "apagados": títulos, valores e CTAs em cinza-claro sobre fundo claro. A raiz é simples — os 5 componentes novos usam classes Tailwind `zinc-*` fixas (paleta dark-only), mas o painel está em tema claro. Resultado: `text-zinc-500` vira quase branco em fundo branco, `border-zinc-800` somem, `bg-zinc-950/40` não rende.

Nenhuma feature, query ou layout muda. Só presentation.

### Mudanças (5 arquivos)

**1. `src/components/painel/bbg/BBGPanel.tsx`**
- `border-zinc-800 bg-zinc-950/40` → `border-border bg-card/60 backdrop-blur-sm`
- Header: `text-zinc-500` → `text-muted-foreground`; `accent ? text-volt` mantém Volt
- Divisor: `bg-zinc-800` → `bg-border`
- BBGEmpty: `text-zinc-500` → `text-muted-foreground`

**2. `src/components/painel/bbg/BloombergTopBar.tsx`**
- `border-zinc-800 bg-zinc-950/60` → `border-border bg-card/80 backdrop-blur`
- `text-zinc-200` → `text-foreground`; `text-zinc-500/600` → `text-muted-foreground`
- Badges role: `border-zinc-800 text-zinc-400` → `border-border text-muted-foreground`
- Botão notificações: `hover:bg-zinc-900` → `hover:bg-muted`

**3. `src/components/painel/bbg/ColEmpresa.tsx`**
- Nome empresa: `text-zinc-100` → `text-foreground`
- Segmento: `text-zinc-400` → `text-muted-foreground`
- Score (62): `text-zinc-100` → `text-foreground` + classe `text-5xl font-black` pra dar peso (Bloomberg-style mas legível)
- Barra progress: `bg-zinc-900` → `bg-muted`; preenchimento mantém `bg-volt`
- Label "PRÉ-VENDA": `text-volt` (já ok), aumentar para `text-xs font-bold`
- Breakdown items: `text-zinc-400/200/600` → `text-muted-foreground` / `text-foreground` / `text-muted-foreground/60`
- Janela de venda: `text-zinc-500` → `text-muted-foreground`; `text-zinc-200` → `text-foreground`
- Anúncios: `text-zinc-100` → `text-foreground`; `text-zinc-500` → `text-muted-foreground`

**4. `src/components/painel/bbg/ColValuationBuyers.tsx`**
- "ATUAL ESTIMADO" label: `text-zinc-500` → `text-muted-foreground font-semibold`
- Valor R$ 17,8M: `text-zinc-100` → `text-foreground` (já vem do tema, fica preto sólido)
- Card potencial: trocar `border-volt/30 from-volt/5` por `border-volt/40 bg-volt/10` para destacar — o card volt deve "saltar"
- `text-zinc-300` (texto interno) → `text-foreground`
- `text-zinc-500` → `text-muted-foreground`
- "Detalhes técnicos": `text-zinc-400 hover:text-volt` → `text-muted-foreground hover:text-foreground`
- Compradores: número grande `text-zinc-100` → `text-foreground`; barras `bg-zinc-900` → `bg-muted`; labels `text-zinc-300/400` → `text-foreground` / `text-muted-foreground`

**5. `src/components/painel/bbg/ColFeedAgenda.tsx`**
- Icon wrapper: `border-zinc-800 bg-zinc-900/50` → `border-border bg-muted/50`
- Icon: `text-zinc-400` → `text-muted-foreground`
- Label feed: `text-zinc-200` → `text-foreground`
- Detail/data: `text-zinc-500/600` → `text-muted-foreground / text-muted-foreground/60`

### Ganhos visuais esperados
- "R$ 17,8M" e "R$ 24M" passam a aparecer em preto sólido (foreground) — agora dominam a tela como num terminal real.
- Headers "VALUATION", "FEED DE ATIVIDADE" passam de fantasma a `muted-foreground` legível.
- CTA "Cadastrar agora" no card Sua Empresa fica em Volt sólido visível.
- Score 62 ganha peso tipográfico.
- Card de Potencial (pico 2027) ganha destaque com `bg-volt/10` em vez de gradiente quase transparente.
- Dark mode continua funcionando (tokens semânticos rendem nos dois).

### Não inclui
- Nenhuma alteração em queries, hooks, dados, rotas
- Nenhuma feature nova
- Layout/grid permanecem idênticos

Próximo bloco (4) seria animação count-up nos números, pulse no "live" e micro-borders 1px — só depois desse fix de contraste, porque polish sobre algo ilegível não resolve.
