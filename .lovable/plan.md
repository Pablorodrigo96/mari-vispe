

## Plano: Redesign Premium do Blind Teaser

Baseado nas imagens de referencia (Vispe Capital), vou elevar significativamente a qualidade visual do Blind Teaser com graficos, animacoes avancadas, mapa SVG do Brasil e layout mais sofisticado.

---

### Mudancas

#### 1. `src/components/teaser/TeaserHero.tsx` — Redesign completo

- Adicionar textura de notas de dinheiro mais visivel como background (SVG pattern mais elaborado com opacity maior)
- Melhorar o arco dourado para ficar mais proximo da referencia (maior, mais visivel, com dupla curva)
- Adicionar efeito de parallax sutil com framer-motion
- Branding "PME.B3" mais destacado no canto inferior direito com logo/icone

#### 2. `src/components/teaser/TeaserIntro.tsx` — Mapa SVG do Brasil

- Substituir o circulo dourado com estado por um **mapa SVG do Brasil** com os 27 estados
- Destacar o estado da empresa em dourado mais forte (cor diferente dos demais)
- Mapa em perspectiva 3D via CSS transform (rotateX + rotateY) para simular o efeito isometrico da referencia
- Label "Operacao em [STATE]" posicionado ao lado do mapa com linha decorativa
- Melhorar tipografia do texto introdutorio

#### 3. `src/components/teaser/TeaserFinancials.tsx` — Graficos e KPIs

- Adicionar um **grafico de barras** usando Recharts (ja instalado) mostrando faturamento anual/projecao
- Adicionar KPIs extras em cards dourados: Faturamento Medio Mensal, Margem Liquida
- Layout em 2 colunas: grafico a esquerda, KPI cards a direita (como na referencia)
- Barras com gradiente dourado e labels de valor no topo
- Animacao de entrada dos cards com stagger

#### 4. `src/components/teaser/TeaserDetails.tsx` — Cards estilo metricas operacionais

- Redesenhar para usar o estilo da referencia: header escuro com label dourado + body branco com valor grande
- Grid de 3-4 colunas com cards mais impactantes
- Adicionar background com imagem de edificios corporativos (SVG pattern ou gradient overlay)
- Numeros em tamanho muito maior para impacto visual

#### 5. `src/components/teaser/TeaserContact.tsx` — Refinamentos

- Arcos dourados decorativos duplos (como na referencia)
- Disclaimer com texto mais completo e formatacao melhor
- Manter o botao "Registrar Interesse" e WhatsApp

#### 6. Novo: `src/components/teaser/BrazilMap.tsx` — Componente SVG

- SVG inline com paths dos 27 estados brasileiros
- Props: `highlightState` para colorir o estado em destaque
- Cores: estados normais em dourado claro, estado destacado em dourado forte
- CSS transform para efeito 3D isometrico
- Animacao de entrada com framer-motion

#### 7. `src/index.css` — Novos utilitarios

- Adicionar keyframe para animacao de "count up" dos numeros
- Adicionar classe de perspectiva 3D para o mapa

---

### Secao Tecnica

**Dependencias ja instaladas que serao usadas:**
- `recharts` — grafico de barras na secao financeira
- `framer-motion` — animacoes de entrada e parallax
- `lucide-react` — icones

**Mapa SVG do Brasil:**
- Paths simplificados dos 27 estados (AC, AL, AM, AP, BA, CE, DF, ES, GO, MA, MG, MS, MT, PA, PB, PE, PI, PR, RJ, RN, RO, RR, RS, SC, SE, SP, TO)
- Mapeamento de sigla para path SVG
- Transform CSS: `perspective(800px) rotateX(15deg) rotateY(-15deg)` para efeito 3D

**Grafico de barras (Recharts):**
- Dados derivados: se tiver `annual_revenue`, mostra projecao de 3 anos (atual, -10%, -20%)
- Barras com fill gradiente dourado
- Labels customizados com `formatFullCurrency`
- Sem grid/eixos para visual limpo

**Arquivos modificados/criados:**

| Arquivo | Acao |
|---|---|
| `src/components/teaser/BrazilMap.tsx` | Novo — SVG do Brasil com highlight por estado |
| `src/components/teaser/TeaserHero.tsx` | Melhorar texturas e arcos decorativos |
| `src/components/teaser/TeaserIntro.tsx` | Integrar BrazilMap, melhorar layout |
| `src/components/teaser/TeaserFinancials.tsx` | Adicionar grafico Recharts + layout 2 colunas |
| `src/components/teaser/TeaserDetails.tsx` | Redesign cards estilo metricas operacionais |
| `src/components/teaser/TeaserContact.tsx` | Refinamentos visuais nos arcos e disclaimer |
| `src/index.css` | Adicionar utilitarios de perspectiva 3D |

