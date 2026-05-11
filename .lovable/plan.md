## Cérebro 3D — mais nós e melhor espaçamento

Dois ajustes no `JarvisGraph3D.tsx` para o globo parecer mais rico e os pontos pararem de se sobrepor.

### 1. Trazer mais empresas (parecer "muito mais cadastros")

Limites atuais nas queries (linhas 272, 282, 326):
- `eb_companies` → 150
- `eb_companies_scored` → 150
- `eb_matches` → 300

Aumentar para:
- `eb_companies` → **500**
- `eb_companies_scored` → **500**
- `eb_matches` → **1000**

Buyers e teses já vêm sem limite — sem mudança.

### 2. Aumentar a distância entre nós (linhas 446-464)

Atual:
```
R   = clamp(500 + N*3.5, 600, 1800)
charge.strength(-180).distanceMax(R * 1.6)
link.distance = 60 + (1-weight)*90   // 60..150
collide = visualRadius + 4
radial(R).strength(0.18)
```

Novo (mais espalhado, casca maior):
```
R   = clamp(800 + N*5.0, 900, 2600)   // sphere 50% maior
charge.strength(-340).distanceMax(R * 1.8)   // ~2x repulsão
link.distance = 110 + (1-weight)*160  // 110..270
collide = visualRadius + 14           // 4 → 14 (anti-overlap)
radial(R).strength(0.14)              // casca um pouco mais "frouxa"
```

E ajuste do damping para acomodar a expansão maior sem tremor:
```
d3VelocityDecay(0.50)   // 0.55 → 0.50
d3AlphaDecay(0.010)     // 0.012 → 0.010
```

### 3. Câmera inicial (linha 561-563)

Aumentar `camR` proporcional ao novo R (mantendo o fator já existente) — sem mudança de código, pois deriva de `sphereRadiusRef.current`.

### Escopo
- Único arquivo: `src/components/equity-brain/jarvis/JarvisGraph3D.tsx`
- Sem migrações, sem mudanças em dados, sem mudanças em UI/HUD.
- Smoke: abrir `/equity-brain/grafo-jarvis`, conferir contador "N" ≥ 400 e ausência de clusters sobrepostos no centro.