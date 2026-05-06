## Mapa Anatel — Limpeza + Painel de Sinergia M&A

### Mudanças solicitadas

1. **Remover KPIs quebrados** do topo (`UF com mais oportunidades`, `Setor mais quente`, `Concentração top 5 cidades`).
2. **Esconder a sidebar de filtros** (Score M&A, UFs, Mostrar buyers, Vincular a tabela) **quando o modo for `anatel`** — ela só faz sentido no Heatmap. Manter quando `mode === "heat"`.
3. **Novo `ProviderSynergyPanel`** que aparece sempre que houver **2+ provedores** selecionados na aba Anatel.

### Painel de Sinergia (novo componente)

Layout side-by-side comparando todos os provedores ativos (2 ou 3), abaixo dos KPI cards e acima do mapa.

**Por provedor (coluna)**:
- Nome + cor do slot.
- Total acessos (soma de `acessos_empresa`).
- Cidades atendidas, UFs.
- Centroide (lat/lng médio ponderado por acessos).

**Bloco central de cruzamento (par a par; com 3 provedores → 3 pares colapsáveis)**:
- **Overlap de cidades**: `|A ∩ B|` por código IBGE, `% sobre menor`, lista top 5 cidades em comum (com acessos_A vs acessos_B).
- **Distância entre centroides** em km (haversine).
- **Sinergia geográfica** (0–100): `complementaridade × proximidade`, onde:
  - `complementaridade = 1 - jaccard(cidades_A, cidades_B)` (quanto menos overlap, mais espaço pra somar territórios).
  - `proximidade = clamp(1 - dist_km / 1500, 0, 1)`.
  - score final = `round(100 * (0.6 * complementaridade + 0.4 * proximidade))`.
- **Tendência M&A** baseada em razão de tamanho `r = menor / maior` (acessos):
  - `r ≥ 0.7` → **Fusão entre iguais** (badge âmbar).
  - `0.4 ≤ r < 0.7` → **M&A com co-gestão** (badge azul).
  - `r < 0.4` → **Aquisição** — explicita "**{maior} compra {menor}**" (badge volt).
- Frase humanizada estilo: *"ISP A (100k) e ISP B (90k) — tendência: fusão. Overlap baixo (8%), distância 320km → sinergia alta (78)."*
- Se `buyerCnpjs` tiver alguém marcado, sobrepõe o sinal: o marcado é tratado como comprador independente do tamanho, e a frase vira *"A (comprador marcado) → B (alvo)"*.

### Arquivos

- **NOVO** `src/lib/anatelSynergy.ts`
  - `computeProviderStats(rows)` → `{ totalAcessos, cities:Set<string>, ufs:Set<string>, centroid:{lat,lng} }`.
  - `computePairSynergy(a, b, opts?: { buyerCnpj?, aCnpj?, bCnpj? })` → `{ overlapCount, overlapPct, jaccard, distanceKm, synergyScore, tendency: "fusao"|"co-gestao"|"aquisicao", buyerLabel, sellerLabel, headline, topOverlapCities: [{cidade, uf, acessosA, acessosB}] }`.
  - Reusa haversine local; cidades-chave por `codigo_ibge_cidade` (fallback `cidade|uf`).

- **NOVO** `src/components/equity-brain/ProviderSynergyPanel.tsx`
  - Props: `providers: { cnpj, empresa, color, rows }[]`, `buyerCnpjs: Set<string>`.
  - Renderiza grid de colunas (1 por provedor) + uma faixa abaixo com cards de pares (2 prov → 1 card; 3 prov → 3 cards).
  - Estilo consistente com `bg-zinc-900 border-zinc-800` + bordas coloridas.

- **EDITA** `src/pages/equity-brain/MapaPage.tsx`
  - Apaga linhas 196–200 (grid de 3 KPIs) e o `useMemo kpis` + queries `ufStatsQ`/`muniStatsQ` que só serviam para esses KPIs.
  - Envolve `<aside>` (linhas 426–500) em `{mode === "heat" && (...)}`.
  - No bloco Anatel, quando `selectedProviders.length >= 2` e ao menos 2 footprints carregados, renderiza `<ProviderSynergyPanel />` dentro da coluna esquerda, acima dos KPI por provedor.

### Critério de aceite

- Topo da página `/equity-brain/pipeline?view=mapa` sem os 3 KPIs.
- Sidebar direita some no modo Anatel (mapa ocupa largura toda) e continua no Heatmap.
- Selecionar 2 provedores Anatel → aparece painel comparativo com overlap, distância, score de sinergia e tendência (fusão/aquisição) com nomes corretos de comprador/vendedor.
- Marcar slot como comprador força o papel mesmo quando ele é menor.
- Selecionar 3 provedores → 3 cards de par (A↔B, A↔C, B↔C).
