## Problema

Na rodada anterior eu cortei DEMAIS:
- Partículas direcionais (raios animados nas conexões) só ligam em foco/hover ou em gold → no estado idle o globo fica "morto", sem fluxo.
- Os ~2k pontos da nuvem RFB ficaram cinza muito escuro (`hsl(220, 8%, 55%)`) com opacidade 0.45 e raio 2.2 — sobre o vídeo escuro de fundo, somem.

## Correções (apenas visual, sem mexer em física/dados)

### 1. Nuvem fria visível de novo
Em `JarvisGraph3D.tsx` (~linhas 672-681) ajustar geometria/material compartilhados dos `seller_cold`:
- Raio da esfera compartilhada: `2.2 → 3.0`
- Cor: `hsl(220, 8%, 55%)` → `hsl(220, 18%, 72%)` (graphite mais claro, lê sobre vídeo escuro)
- Opacidade: `0.45 → 0.78`
- Atualizar `NODE_COLORS.seller_cold` em `equityGraphScoring.ts` para o mesmo HSL claro, mantendo coerência da legenda.

Custo: zero — continua sendo 1 geometria + 1 material compartilhados via `Mesh(coldGeoRef, coldMatRef)`.

### 2. Raios de conexão de volta no estado idle
Em `JarvisGraph3D.tsx` (~linhas 1127-1137) reescrever `linkDirectionalParticles` para manter fluxo permanente nos tipos "sempre vivos" sem explodir a contagem:

```
- Em foco: vizinhos do nó focado → 3 (gold) / 2 (outros). Resto → 0.
- Sem foco:
    - gold (seller↔seller fusão/rollup): 2
    - buyer_acquires_seller, platform_addon, valuation_arbitrage: 1
    - demais: 0
```

Isso traz de volta a sensação de "sinapses correndo" no globo enquanto custa pouco: a maioria dos links continua sem partícula (cross_sell, geo, tech, etc.), só os eixos M&A principais ficam animados.

Manter velocidade/largura atuais (`linkDirectionalParticleSpeed` e `Width` já estão bons).

### 3. Validação
Abrir `/equity-brain/admin/jarvis` e conferir:
- Pontos cinza da nuvem RFB legíveis sobre o vídeo de fundo
- Raios azuis/dourados/rosa fluindo permanentemente nos links M&A
- FPS continua na faixa de 20+ (HUD canto inferior)

Nenhuma outra parte da otimização anterior (DPR cap, sem console.log, segmentos 14, ghost/flares off, link interval removido) é tocada.
