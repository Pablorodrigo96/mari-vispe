## Problema

A plataforma está com tela branca em **todas as rotas** (não só no Jarvis 3D). Causa raiz nos logs do dev server:

```
ERROR: No matching export in "node_modules/three/build/three.module.js" for import "Timer"
  three-render-objects/dist/three-render-objects.mjs:1:122
```

E em seguida:
```
The file does not exist at "node_modules/.vite/deps/react-dom_client.js" ...
```

O que aconteceu:
1. `react-force-graph-3d@1.24.3` → `three-render-objects` importa `{ Timer }` de `"three"`.
2. Em `three@0.179.1`, `Timer` existe em `three.core.js` mas **não é re-exportado** pelo entrypoint `three.module.js` no formato que o esbuild (dev) consegue resolver. O build de produção (Rollup) tolera, mas o pre-bundle do Vite no dev quebra.
3. Como o erro ocorre durante o pre-bundle de dependências, o Vite invalida o cache de deps e o `react-dom_client.js` some — derrubando a aplicação inteira (tela branca em `/`, `/valuation`, etc.).

## Correção (2 etapas)

### 1. Desbloquear a plataforma agora (lazy-load do Jarvis 3D)

Tornar o import de `react-force-graph-3d` totalmente preguiçoso, para que ele só toque em `three-render-objects` quando o usuário entrar em `/equity-brain/grafo-jarvis`. Assim, o pre-bundle do Vite não tenta resolver `Timer` no boot, e o resto do app volta.

- `src/App.tsx`: trocar o import direto de `GrafoJarvisPage` por `React.lazy(() => import(...))` envolvido em `<Suspense>`.
- `src/components/equity-brain/jarvis/JarvisGraph3D.tsx`: trocar o `import ForceGraph3D from "react-force-graph-3d"` por `lazy` + `Suspense`, ou um dynamic `import()` dentro de `useEffect`, garantindo que o módulo só seja carregado quando o componente monta.
- `vite.config.ts`: adicionar `react-force-graph-3d`, `three-render-objects` e `three` em `optimizeDeps.exclude` para impedir o pre-bundle (esbuild) de tocar neles. Isso resolve o `Timer`/`webgpu` no dev sem afetar o build.

### 2. Limpar cache do Vite

Após a mudança, remover `node_modules/.vite` para forçar re-otimização limpa (resolve o `react-dom_client.js` faltante).

### 3. Validação

- Confirmar que `/`, `/valuation`, `/equity-brain` carregam normalmente.
- Confirmar que `/equity-brain/grafo-jarvis` ainda renderiza o 3D (agora sob lazy + suspense com fallback "Carregando cérebro 3D...").
- Conferir `tail` do `/tmp/dev-server-logs/dev-server.log` sem o erro do `Timer`.

## Fora de escopo

- Não vamos mudar a versão do `three` novamente (já está em 0.179.1, que satisfaz o build de produção).
- Não vamos mexer em edge functions, rotas, dados ou no grafo 2D.

## Risco

Baixo. Apenas isolamos o módulo 3D atrás de lazy loading — comportamento idêntico para o usuário, exceto por um spinner inicial ao abrir a rota Jarvis 3D pela primeira vez.