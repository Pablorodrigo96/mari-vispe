

## Plano: Fase 1 — Motor de Captação Vispe — Nova Landing /capital com Simulador Inteligente

### Escopo
Substituir completamente a landing `/capital` por uma página de alta conversão com simulador inline de 3 passos, resultado instantâneo (sem pedir dados pessoais), e modal de captura de lead apenas após o resultado.

---

### Estrutura da página (blocos em ordem)

1. **Hero + Simulador Inline (3 passos)**
   - Headline: "Capte de R$ 10 mil a R$ 5 milhões sem sair do digital"
   - Subheadline + badge
   - Simulador embedado no hero (sem modal), 3 steps com navegação inline:
     - **Step 1**: Valor desejado (slider + input numérico)
     - **Step 2**: Faturamento mensal (faixas) + Setor (select com categorias existentes) + Tempo de empresa (select: <1 ano, 1-3, 3-5, 5-10, 10+)
     - **Step 3**: Objetivo (giro, expansão, refinanciamento, equity/sócio)
   - Botão "Ver minha simulação" → exibe card de resultado inline:
     - Se dívida: faixa de taxa estimada, prazo médio, score de aprovação (0-100%), 3 linhas/instrumentos compatíveis
     - Se equity: faixa de participação sugerida, prazo de rodada, score, 3 tipos de investidor compatíveis
   - Score calculado client-side com lógica baseada em faturamento vs valor solicitado, tempo de empresa, setor

2. **CTA pós-resultado**: "Receber relatório completo em PDF + falar com especialista" → abre modal (reusa `CapitalLeadModal` ajustado) pedindo nome, email, WhatsApp, senha (se não logado). Ao submeter: cria conta, insere em `capital_requests` com dados do simulador (incluindo `sector`, `company_age`, `approval_score`), redireciona para `/minhas-captacoes`

3. **Prova Social**: Contador "R$ X+ captados", 3 cases com foto/valor/prazo, logos dos parceiros (imagens enviadas pelo usuário: gtnet, iplay, vvs, teamti, jrnet, intercol, wp telecom, gold, infoway, fix), selo LGPD

4. **Calculadora comparativa "Vispe vs Banco Tradicional"**: Gráfico Recharts (BarChart) mostrando economia ao longo do prazo (custo total Vispe vs banco), usa valores do simulador

5. **Como funciona em 4 passos**: Timeline horizontal com ícones (reutiliza estrutura do CapitalHowItWorks, ajusta copy)

6. **FAQ com 10 perguntas**: Accordion com perguntas relevantes sobre captação, taxas, prazos, equity, documentação

7. **CTA Final**: "Falar com especialista agora" com link WhatsApp (preparado para Calendly futuro)

---

### Migração SQL

Adicionar 3 colunas à tabela `capital_requests`:
- `sector` text (nullable)
- `company_age` text (nullable)
- `approval_score` integer (nullable)

---

### Arquivos

| Arquivo | Acao |
|---|---|
| Migração SQL | Adicionar colunas `sector`, `company_age`, `approval_score` |
| `src/pages/Capital.tsx` | Reescrever: state do simulador 3 steps + resultado + modal |
| `src/components/capital/CapitalSimulator.tsx` | **Novo**: Simulador inline 3 passos + card resultado com score |
| `src/components/capital/CapitalSocialProof.tsx` | **Novo**: Contador, cases, logos (imagens copiadas para src/assets), selo LGPD |
| `src/components/capital/CapitalComparison.tsx` | **Novo**: Gráfico Recharts Vispe vs Banco |
| `src/components/capital/CapitalFAQ.tsx` | **Novo**: Accordion 10 perguntas |
| `src/components/capital/CapitalFinalCTA.tsx` | **Novo**: CTA WhatsApp + preparação Calendly |
| `src/components/capital/CapitalHowItWorks.tsx` | Ajustar copy para contexto do motor |
| `src/components/capital/CapitalLeadModal.tsx` | Receber dados do simulador (sector, company_age, score) e incluir no insert |
| `src/components/capital/TrustLogos.tsx` | **Remover** (substituída por SocialProof) |
| `src/components/capital/CapitalHero.tsx` | **Remover** (substituída pelo novo hero integrado) |
| `src/components/capital/EquitySection.tsx` | **Remover** (funcionalidade movida para simulador) |
| `src/components/capital/MediaSection.tsx` | **Remover** (substituída por SocialProof) |
| `src/lib/capitalScoring.ts` | **Novo**: Lógica de scoring (0-100) + faixas de taxa/participação + instrumentos compatíveis |

### Lógica de Scoring (client-side)

```text
score = base(50)
  + revenueVsAmount: se faturamento > 3x valor → +20, 2x → +10, 1x → +5, <1x → -10
  + companyAge: 10+ → +15, 5-10 → +10, 3-5 → +5, 1-3 → 0, <1 → -10
  + sector: tech/telecom/saúde → +5 (setores premium)
  + objective: giro → +5 (menor risco), equity → 0

Instrumentos compatíveis (top 3 por score):
  - Score >80: "Linha BNDES", "Crédito Garantido", "Antecipação de Recebíveis"
  - Score 60-80: "Capital de Giro PJ", "Financiamento PME", "Nota Comercial"
  - Score <60: "Microcrédito", "Peer-to-Peer Lending", "Investidor Anjo"
```

### Logos dos parceiros
As 10 imagens enviadas serão copiadas para `src/assets/partners/` e importadas no componente SocialProof.

