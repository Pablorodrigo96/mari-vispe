## Diagnóstico — por que ISP-AJCO3 está conectada a tantas coisas?

Olhando `equityGraphBuilder.ts`, hoje cada seller pode receber **8 tipos diferentes de aresta** sem teto de quantidade. O ISP-AJCO3 (uma seller) recebe conexões por:

1. **`buyer_acquires_seller` / `buyer_funds_seller`** — para *todo* buyer cujo `setores_interesse` inclua o setor da empresa (sem limite de quantos buyers).
2. **`capital_match`** — replicado para cada buyer financeiro com ticket compatível.
3. **`seller_acquires_seller`** — para *toda* outra seller da mesma vertical com receita 3x menor/maior (loop O(n²)).
4. **`seller_merges_with_seller`** — para toda seller similar (ratio < 1.4) na mesma UF.
5. **`cost_synergy`** — para *toda* seller na mesma vertical + UF (sempre, mesmo com peso baixo).
6. **`platform_addon`** — para toda plataforma da mesma vertical.
7. **`valuation_arbitrage`** — se score ≥ 60 e não listada.
8. **`strategic_synergy`** via assets compartilhados.
9. **`geographic_expansion`** — buyers que ainda não atuam na UF dela.

O builder não tem **teto por nó** nem dedup entre tipos. Resultado: uma única seller acumula dezenas de arestas, sendo várias redundantes (ex.: o mesmo buyer aparece em `buyer_acquires_seller` + `capital_match` + `geographic_expansion`).

---

## O que vamos mudar

### 1. Reduzir ruído de conexões (em `equityGraphBuilder.ts`)

**Top-K por nó**: após gerar todas as arestas, manter apenas as N mais fortes (`weight × confidence`) por nó. Defaults sugeridos:
- Sellers: até **8** arestas (priorizando buyer_acquires + roll-up + platform_addon).
- Buyers: até **15** arestas.
- Plataformas/teses: sem teto (são hubs naturais).

**Dedup buyer↔seller**: se já existe `buyer_acquires_seller` entre o par, suprimir `geographic_expansion` e `capital_match` redundantes (manter só a aresta mais forte).

**Custo seller↔seller mais seletivo**: `cost_synergy` só dispara se vertical+UF+banda de receita iguais (hoje basta vertical+UF, gera explosão O(n²)).

### 2. Espalhar sellers 5x mais (em `JarvisGraph3D.tsx`)

No bloco de forças (linha ~287):

- Aumentar `seller-spread` de `-450` para **`-2200`** e `distanceMax` de 320 para **1600**.
- `forceCollide`: para sellers, multiplicar raio por **8** (em vez do `4.5` atual aplicado a todos).
- Link distance entre dois sellers: somar offset de **+800px** quando ambos endpoints forem sellers.

Resultado esperado: empresas seller ficam visualmente isoladas, conexões entre elas viram linhas longas e legíveis.

### 3. Cores de arestas (em `equityGraphScoring.ts`)

Atualizar `EDGE_COLORS`:

- `seller_acquires_seller` → **`hsl(45, 100%, 60%)`** (ouro reluzente Jarvis).
- `seller_merges_with_seller` → **`hsl(48, 95%, 65%)`** (ouro mais claro).
- `buyer_acquires_seller` (consolidador/buyer estratégico) → **`hsl(210, 100%, 62%)`** (azul Jarvis vibrante).
- `platform_addon` (consolidação por plataforma) → **`hsl(220, 95%, 65%)`** (azul-violeta).
- Demais (`thesis_fit`, `cost_synergy`, `geographic_expansion`, etc.) → **mantêm cores atuais**.

Adicionar leve glow/pulse extra nas seller↔seller (ouro) ajustando partícula:
```ts
linkDirectionalParticleColor={(l) => 
  l.edge_type === "seller_acquires_seller" ? "#fde047" : undefined}
```

### 4. Cores de nós sellers por porte/setor (em `JarvisGraph3D.tsx` + `equityGraphJarvisAdapter.ts`)

Hoje todo seller é verde-esmeralda fixo. Vamos derivar cor por **porte** (faturamento) e usar **setor** para variação de matiz:

**Tabela de tamanho** (luminância/saturação):
| Banda          | HSL                      | Visual                  |
|----------------|--------------------------|-------------------------|
| <R$1M          | `hsl(H, 50%, 35%)`       | apagado, menor presença |
| R$1–5M         | `hsl(H, 65%, 45%)`       | médio                   |
| R$5–10M        | `hsl(H, 80%, 55%)`       | brilhante               |
| R$10–50M       | `hsl(H, 90%, 60%)`       | muito brilhante         |
| R$50M+         | `hsl(H, 100%, 65%)` + ring|destaque com anel orbital|

**Matiz por setor** (mapa fixo, ~12 setores principais):
- Tech/SaaS → 160 (esmeralda)
- Saúde → 175 (teal)
- Indústria → 25 (laranja)
- Varejo/Comércio → 320 (rosa)
- Serviços → 200 (cyan)
- Alimentação → 15 (vermelho-quente)
- Educação → 270 (violeta)
- Logística → 45 (âmbar)
- Telecom → 220 (azul)
- Energia → 60 (amarelo)
- Construção → 30 (laranja-terra)
- Agro → 100 (verde-folha)
- Outros → 240 (zinc-azul)

Implementação: nova função `getSellerColor(node)` em `equityGraphJarvisAdapter.ts` ou helper inline em `JarvisGraph3D.tsx`. Adicionar campo `displayColor` em `JarvisNode` para sellers (outros tipos continuam usando `NODE_COLORS`).

Sellers com banda R$50M+ ganham um **anel orbital dourado** (mesmo tratamento visual de plataformas) para destacar visualmente.

### 5. Atualizar legenda (em `GraphLegend.tsx` se necessário)

Acrescentar mini-paleta explicando: "Seller → cor por setor, intensidade por porte". Edge legend já reflete cores novas automaticamente.

---

## Arquivos afetados

- `src/lib/equityGraphBuilder.ts` — top-K por nó, dedup, cost_synergy mais restrito.
- `src/lib/equityGraphScoring.ts` — atualizar `EDGE_COLORS` (ouro/azul).
- `src/lib/equityGraphJarvisAdapter.ts` — calcular `displayColor` por porte+setor; adicionar `bigSellerRing: boolean`.
- `src/components/equity-brain/jarvis/JarvisGraph3D.tsx` — usar `displayColor`, ajustar forças (seller spread 5x), adicionar anel para mega-sellers, cor de partícula para edges ouro.
- `src/components/equity-brain/graph/GraphLegend.tsx` — nota sobre cor de seller (opcional).

## Resultado esperado

- ISP-AJCO3 passa de ~30 conexões para ~6-8, mantendo só as estrategicamente fortes.
- Sellers ficam visualmente espaçados, sem aglomeração.
- Roll-ups e fusões saltam aos olhos em ouro reluzente; consolidações em azul Jarvis.
- Tamanho/setor da empresa é lido instantaneamente pela cor da bolinha.
