## Problema

A rota `/equity-brain/grafo-jarvis` está em branco. O console do preview não capturou logs (snapshot vazio) e os logs do Vite mostram apenas reloads HMR normais — sem stack trace. O typecheck passa, o `vite build` compila sem erro e o chunk `equity-brain-3d` é gerado normalmente. Logo, o problema é runtime, não compilação.

## Suspeitas (em ordem de probabilidade)

1. **Crash silencioso no `useEffect` de forças** após as últimas mudanças (`forceManyBody().distanceMax(1600)` aplicado a TODOS os nós com strength 0 — pode estourar custo de tick e travar a thread, ou disparar exceção dentro de `try/catch` mas deixando `react-force-graph-3d` em estado inconsistente).
2. **Throw no `buildNodeObject`** quando `node.displayColor` vem com formato inesperado para o `Color()` do three (ex.: nó seller sem `vertical` válido → `hsl(NaN, …%, …%)`). Three aceita `hsl()` mas `NaN` quebra silenciosamente.
3. **Loop de re-render** disparado pelo `visualPrefs` (state inicial lido de `localStorage` em cada mount + `useEffect` que regrava sempre) combinado com a mudança de chaves no objeto de defaults.
4. Algum endpoint Supabase (`eb_*`) devolvendo erro depois das mudanças — manda o componente para `isError`, mas o usuário relata branco e não a mensagem rosa de erro, então improvável.

## Plano de ação

### Passo 1 — Instrumentar com console.logs estratégicos (sem mexer em UI)
Adicionar logs no `JarvisGraph3D.tsx`:
- início do render: `[Jarvis3D] render`
- estado das queries: `isLoading`, `isError`, contagem de nodes/links em `graphData`
- entrada/saída do effect de forças
- catch já existe, mas acrescentar `console.error` (hoje só `warn`) com o `e.stack`

Após o user recarregar a página, os logs aparecerão no próximo snapshot e identificam exatamente o ponto de falha.

### Passo 2 — Hardening defensivo (independente do Passo 1)
- **`equityGraphJarvisAdapter.ts` → `sellerColor`**: garantir que `hue`, `sat` e `lum` nunca sejam `NaN`/`undefined` antes de montar a string `hsl(...)`. Se `revenue` for `null/undefined`, cair em valores seguros.
- **`JarvisGraph3D.tsx` → `buildNodeObject`**: envelopar a criação de `Color(...)` em try/catch e usar `NODE_COLORS[n.type]` como fallback.
- **`JarvisGraph3D.tsx` → effect de forças**: limitar a aplicação da `forceManyBody("seller-spread")` a iterações curtas (`distanceMax` menor) só se houver sellers no grafo; pular se `graphData.nodes.filter(n => n.type==='seller').length === 0`.
- **`JarvisGraph3D.tsx`**: acrescentar render de loading skeleton (spinner sobre fundo zinc-950) quando `isLoading`, em vez de renderizar `<ForceGraph3D graphData={vazio}>` direto.

### Passo 3 — Verificação visual
Tirar screenshot via browser tool da rota `/equity-brain/grafo-jarvis` autenticado como admin para confirmar que a tela voltou a renderizar e que o painel de ajustes / grafo aparecem corretamente.

### Passo 4 — Cleanup
Remover os `console.log` instrumentais do Passo 1 (manter o `console.error` no catch das forças).

## Arquivos afetados

- `src/components/equity-brain/jarvis/JarvisGraph3D.tsx` — instrumentação, fallback de loading, hardening de buildNodeObject e effect de forças
- `src/lib/equityGraphJarvisAdapter.ts` — guards no `sellerColor` / `bandFromRevenue`

## Observação

Como não consigo ver o erro real (snapshot do console veio vazio), o Passo 1 é essencial: ele garante que, se a correção defensiva do Passo 2 não resolver, os logs do próximo snapshot já apontam direto pra causa.
