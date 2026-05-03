# Fix: ao abrir Jarvis 3D via ?focus=, trazer vizinhos diretos visíveis

## Problema
Hoje o handler de `?focus=` só ativa o **tipo** do nó focado (ex.: `buyer_strategic`) e a camada `ma_direct`. Resultado: o buyer aparece sozinho — sellers/thesis/platforms ligados a ele continuam ocultos porque seus tipos não estão em `selectedNodeTypes` e várias camadas (rollup, capital, thesis, etc.) seguem desligadas.

## Fix em `src/components/equity-brain/jarvis/JarvisGraph3D.tsx`
Substituir o `useEffect` do `focusParam` (linhas 108-135) por uma versão que:

1. **Liga todos os node types** (`ALL_NODE_TYPES`) para que vizinhos de qualquer tipo sejam renderizáveis.
2. **Liga todas as camadas de aresta** (`ALL_LAYERS`) para revelar arestas como capital_match, thesis_fit, rollup, etc.
3. **Aplica `buyerFilter` no builder** quando `prefix === "buyer"`, para o `buildStrategicGraph` priorizar e manter o subgrafo do buyer (caso contrário o cap de 350 nós pode podar a vizinhança).
4. (Para `seller`, o builder não tem `sellerFilter`; manter `ALL_*` ativos já basta porque o seller estará entre os 350 nós e suas arestas ficam visíveis.)

```ts
useEffect(() => {
  if (!focusParam) return;
  setSelectedNodeTypes(new Set(ALL_NODE_TYPES));
  setEnabledLayers(new Set(ALL_LAYERS));
  const [prefix, ...rest] = focusParam.split(":");
  const id = rest.join(":");
  if (prefix === "buyer" && id) setBuyerFilter(id);
}, [focusParam]);
```

Sem mudanças em outros arquivos, sem migration. O destaque visual (dimming dos não-vizinhos) já funciona via `focusId/focusNeighborIds` assim que o nó é selecionado.

## Não fazer
- Não introduzir `sellerFilter` novo no builder.
- Não tocar nos defaults para usuários sem `?focus=`.
