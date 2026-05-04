## Fixes no Relatório de Valuation

### 1. Hero "Mashup Value" — texto invisível no fundo verde
`src/components/valuation/ValuationReportDialog.tsx` linhas ~459-467: o card grande verde tem `text-emerald-100` em cima de gradient `emerald-500/600` — fica ilegível. Trocar para `text-white` puro (com `drop-shadow` leve) e o subtítulo "Mashup Value (Valor de Mercado Estimado)" / linha "Implícito: Xx Receita | Yy EBITDA" para `text-white/95`. Ajustar também o card "VALOR POTENCIAL" do `ValuationNarrativeReport` (mesmo problema possível).

### 2. Reduzir o upside do Valuation pela metade
`src/lib/diagnosticCalculator.ts`: `VISPE_APPRECIATION_FACTOR` cai de **1.78 → 1.35** (uplift máximo passa de +78% para +35%). Atualizar a copy "Média de **+78% de valorização**" no `ValuationNarrativeReport` para "**+35% de valorização**".

`src/components/valuation/ValuationReportDialog.tsx`: o `Gap de Equity` simula EBITDA +5pp via `calculateEquityGap`. Reduzir o boost para **+2pp** (uma melhoria mais realista) — diminui automaticamente o gap pela metade.

### 3. Remover frase técnica "Se sua empresa melhorar a margem EBITDA em 5pp..."
`ValuationReportDialog.tsx` linhas ~749-752 (modal) **e** ~272 (PDF): remover esse parágrafo. Substituir por uma chamada curta:
> "Empresas atendidas pela mari conseguiram destravar este upside com um trabalho estruturado de governança, fiscal e comercial. **Quer entender o que falta na sua?**"

### 4. Trocar "Falar com Franqueado Regional" por "Falar com um especialista"
Linhas ~754-765: botão do bloco Gap de Equity. Texto do botão e mensagem do WhatsApp devem usar "especialista mari" (não franqueado regional).

### 5. Subir "Análise de Impacto Financeiro" e melhorar copy
Hoje o card vermelho aparece DEPOIS de Methodology + Disclaimer. Mover para **logo abaixo do hero Mashup Value** (antes dos cards Dados da Empresa). Reescrever copy:

- Título: **"⚡ Antes de continuar: descubra seu valor real"**
- Subtítulo: "O Mashup Value acima é apenas o ponto de partida. Em 90 segundos, respondendo 12 perguntas sobre fiscal, governança e operação, você descobre **quanto a sua empresa está valendo de menos hoje** — e o que precisa mudar para destravar o valor potencial."
- Bullets curtos (3): "📉 Quanto você perde por mês" · "🎯 Itens que mais derrubam seu valor" · "🚀 Plano de ação personalizado"
- Botão maior, primário, com seta animada: **"Iniciar Diagnóstico de Valor →"**
- Manter o card visível em destaque (border vermelho/laranja, sombra) — mas agora no topo.

### 6. Memória
Atualizar `mem://features/valuation-diagnostic-degradation` com novo fator (1.35) e nova ordem do relatório (Diagnóstico em destaque no topo).

## Arquivos editados
- `src/lib/diagnosticCalculator.ts` (factor 1.78 → 1.35)
- `src/components/valuation/ValuationReportDialog.tsx` (hero text color, EBITDA boost +5→+2pp, remover copy técnica, trocar texto botão, mover Análise de Impacto pro topo + copy nova)
- `src/components/valuation/ValuationNarrativeReport.tsx` (texto +78% → +35% e cor do card potencial)
- `mem://features/valuation-diagnostic-degradation`
