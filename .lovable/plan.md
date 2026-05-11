## Objetivo

Padronizar a sidebar (`src/components/layout/AppSidebar.tsx`) usando tokens de design (`sidebar-*`) em vez de cores cruas (`bg-gray-900`, `text-slate-50`, `text-zinc-300/400`, `bg-muted`, `border-border`). Resultado: contraste alto e consistente entre todos os cards/textos da sidebar, com a mesma base visual que o "Personal Advisor".

## Contexto

`index.css` já define o conjunto `--sidebar-background` (0 0% 4%), `--sidebar-foreground` (0 0% 88%), `--sidebar-accent` (0 0% 12%), `--sidebar-border` (0 0% 16%) — idênticos em light e dark. O `<aside>` já usa `bg-sidebar text-sidebar-foreground`. Hoje o resto do arquivo mistura `text-zinc-300/400`, `text-foreground`, `bg-muted`, `border-border` (tokens do tema geral), o que gera o efeito "apagado" quando o tema global muda. O patch anterior resolveu isso no card do advisor adicionando `bg-gray-900` + `text-slate-50` hardcoded — esse é o débito a remover.

## Mudanças (somente `src/components/layout/AppSidebar.tsx`)

### 1. Card "Personal Advisor" (linhas 304–321)
- `rounded-lg border border-border bg-muted/40 p-2.5 bg-gray-900` → `rounded-lg border border-sidebar-border bg-sidebar-accent p-2.5`
- `text-zinc-400` (label "Seu advisor pessoal") → `text-sidebar-foreground/60`
- `text-foreground ... text-slate-50` (nome) → `text-sidebar-foreground`
- Avatar fallback e link Volt permanecem (já usam token `volt`).

### 2. Card "User footer" (linhas 326–347) — aplicar mesma casca do advisor
- Envolver o bloco do perfil em `rounded-lg border border-sidebar-border bg-sidebar-accent p-2.5` (espelhando o advisor) para que os dois cards inferiores fiquem visualmente irmãos.
- `hover:bg-muted` no `<Link to="/meu-perfil">` → `hover:bg-sidebar-accent/70`
- `text-foreground` (email) → `text-sidebar-foreground`
- `text-zinc-400` ("Meu perfil") → `text-sidebar-foreground/60`
- Botão "Sair": `text-zinc-300` → `text-sidebar-foreground/80`

### 3. Navegação (linhas 180–289) — varrer zinc/foreground/muted/border
- Botão de grupo (208): `text-zinc-300 hover:text-foreground hover:bg-muted/50` → `text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent/60`; ativo `text-accent` mantém (token semântico).
- `ul` filha (218): `border-l border-border` → `border-l border-sidebar-border`
- Itens filhos (229): `text-zinc-300 hover:text-foreground hover:bg-muted` → `text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent`
- Item ativo (228): `bg-accent/15 text-accent` mantém.
- Collapsed group icon (194): `text-zinc-300 hover:bg-muted hover:text-foreground` → `text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground`
- Cockpit Interno (246, 278): `border-t border-border` → `border-t border-sidebar-border`; links Admin → mesmas substituições zinc→sidebar-foreground/muted→sidebar-accent. Links Equity Brain mantêm `text-emerald-500`.
- Brand bar (166, 172): `border-b border-border` → `border-b border-sidebar-border`; botão de colapso `text-zinc-300 hover:text-foreground` → `text-sidebar-foreground/80 hover:text-sidebar-foreground`.
- Wrappers dos cards inferiores (292, 326): `border-t border-border` → `border-t border-sidebar-border`.

## Fora de escopo

- Outros arquivos com `bg-gray-900` / `text-slate-50` (ex.: `MondayParity`, cards do Equity Brain, `TeaserDetails`) — não tocados nesta passada; só a sidebar foi pedida.
- Nenhuma mudança em layout, espaçamento, tipografia, lógica ou queries.

## Validação

Após a edição: olhar `/painel` com sidebar expandida e colapsada; conferir (a) card do advisor sem o hack `bg-gray-900` e ainda contrastado; (b) card do usuário com a mesma casca; (c) itens de menu legíveis em hover/ativo; (d) nenhum `bg-gray-900`/`text-slate-50`/`text-zinc-*`/`bg-muted`/`border-border` remanescente em `AppSidebar.tsx` (`rg` final).