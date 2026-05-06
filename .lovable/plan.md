# Mapa ANATEL — malha por proximidade (k-NN) em vez de hub central

## Problema
Hoje todas as cidades do provedor desenham uma linha até a cidade-sede (maior número de acessos). Resultado visual: leque de linhas convergindo em São Paulo, sem refletir a topologia real da rede.

## Solução
Trocar o algoritmo de linhas por uma **malha de vizinhos mais próximos (k-NN)**: cada ponto se conecta aos `k` pontos geograficamente mais próximos, formando uma rede orgânica que segue a expansão regional do provedor.

## Mudanças

**Único arquivo:** `src/components/equity-brain/AnatelProviderMap.tsx`

1. Remover o bloco `hub` + loop que cria polylines `[hub → p]`.
2. Adicionar função `haversineKm(a, b)` (distância esférica simples).
3. Para cada ponto resolvido, calcular distância até todos os outros e pegar os `k=3` mais próximos.
4. Deduplicar arestas com chave `min(i,j)|max(i,j)` para não desenhar a mesma linha duas vezes.
5. (Opcional/limite) Ignorar arestas > 600 km para evitar conectar regiões isoladas com travessias enormes pelo oceano/Amazônia.
6. Estilo das linhas: `weight: 0.8`, `opacity: 0.45`, `dashArray: "3 4"`, cor Volt `#D9F564`.
7. Manter o destaque visual da cidade-sede (maior `acessos_empresa`) apenas no marcador (anel branco + raio fixo 12), **sem** linhas especiais saindo dela — ela passa a ser só mais um nó da malha.
8. Cap de segurança: se `resolved.length > 400`, reduzir `k` para 2 para não poluir.

## Detalhes técnicos
- Complexidade: O(n²) no cálculo de vizinhos. Para n≤500 (limite atual do footprint) roda em <30 ms — sem impacto perceptível.
- Não exige mudanças no backend, hook, schema ou tipos.
- Popups, badge "approx", contadores e fitBounds permanecem iguais.

## Critérios de aceite
- Visualmente: ao abrir um provedor com várias cidades (ex.: VIVO), as linhas formam uma teia que acompanha a geografia (cidades vizinhas conectadas entre si), sem o leque convergente atual.
- A cidade-sede continua visualmente distinta no marcador, mas não é mais o único ponto de convergência das linhas.
- Performance idêntica ou melhor (menos linhas redundantes).
