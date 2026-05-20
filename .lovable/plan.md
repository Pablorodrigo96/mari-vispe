## Causa raiz

Hoje existe **um único `<Suspense>` no topo do `App.tsx`** (linha 174) envolvendo **todas** as rotas, inclusive os layouts pai (`AppShell`, `EquityBrainLayout`, `AdminLayout`).

Como praticamente todas as páginas estão em `lazy(() => import(...))`, quando você clica numa aba do sidebar:

1. O React Router troca o componente filho do `<Outlet/>`.
2. O novo chunk ainda não está em cache → dispara o `Suspense` **do topo**.
3. Esse Suspense fica **acima** do layout, então **o shell inteiro (sidebar + topbar) é desmontado** e substituído pelo `RouteFallback`, que é um skeleton de página inteira (`min-h-[100dvh]` + `max-w-7xl` centralizado).
4. Resultado visual: tela toda branca / skeleton por alguns segundos até o chunk chegar, depois o shell volta a montar.

Isso é especialmente visível em `/painel`, `/equity-brain/*` e `/admin/*` porque cada página é um chunk separado e alguns (mapa, grafo, dashboards) são pesados.

## Solução

Adicionar **Suspense aninhados dentro de cada layout**, ao redor do `<Outlet/>`, com um fallback pequeno que ocupa só a área de conteúdo. Assim o sidebar e o topbar **permanecem montados** durante a troca de rota e o usuário vê apenas um spinner discreto no painel central — sem flash branco.

### Arquivos a alterar

1. **`src/components/layout/AppShell.tsx`**
   - Envolver `<Outlet />` em `<Suspense fallback={<InnerLoader />}>`.
   - `InnerLoader` = um div com `h-full` + spinner centralizado, herdando o `bg-muted/20` do `<main>`. Sem `min-h-[100dvh]`, sem skeleton de página inteira.

2. **`src/components/equity-brain/EquityBrainLayout.tsx`**
   - Mesmo tratamento: envolver `<Outlet />` dentro do `<main>` com `<Suspense>` + spinner zinc-950.

3. **`src/components/admin/AdminLayout.tsx`**
   - Envolver `{children}` (dentro do `AdminErrorBoundary`) com `<Suspense>` + spinner.

4. **`src/App.tsx`** (opcional, polish)
   - Manter o `<Suspense>` raiz só para o **primeiro carregamento** da aplicação. Trocar o `RouteFallback` atual por uma versão mais neutra (tela cheia com spinner), já que o skeleton de cards "cartões + grid" não casa com várias rotas (admin, equity-brain dark, etc.) e contribui pra sensação de "recarregamento".

### Componente compartilhado

Criar `src/components/layout/RouteLoader.tsx` com duas variantes:

```tsx
// Pequeno, para área de conteúdo dentro de um layout
export function ContentLoader({ dark = false }: { dark?: boolean }) { ... }

// Cheio, para o boot inicial da app
export function FullPageLoader() { ... }
```

Ambas usam `Loader2` do lucide-react com `animate-spin` e cores semânticas (`text-accent` / `text-zinc-500` no modo dark do EB).

## Resultado esperado

- Clicar em "Pipeline" → "Compradores" → "Hoje" dentro do EB: sidebar e topbar continuam visíveis; só a área central mostra um spinner por ~200-800 ms (dependendo do chunk).
- Mesmo comportamento em `/painel`, `/meus-anuncios`, `/admin/*`, `/parceiro/*`.
- Sem mais flash branco / skeleton de página inteira ao trocar de aba.

## Fora de escopo

- Não vou pré-carregar chunks (prefetch) agora — a mudança de Suspense já resolve a percepção de flash. Se ainda houver páginas notavelmente lentas (ex.: `EBGrafoJarvisPage` com three.js), podemos adicionar `link rel="modulepreload"` num passo seguinte.
- Não vou mexer no `vite.config.ts` / chunking.
