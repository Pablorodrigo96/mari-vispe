# Inteligência de M&A e Risco Fiscal no Perfil da Empresa

Adicionar uma nova seção **"Análise de M&A e Tributária"** dentro do `CompanyProfileCard` (rota `/equity-brain/mercado?tab=anatel` → "Perfil da empresa"), separada visualmente do bloco técnico de fibra/rádio e do bloco financeiro existente.

## Onde entra

Arquivo: `src/components/equity-brain/CompanyProfileCard.tsx`. Inserir um novo `<Card>` **logo após** o card "Inteligência financeira & alertas M&A" atual, mantendo os blocos anteriores intactos (apenas removendo dali os alertas duplicados que serão substituídos pelos novos badges, ou mantendo ambos lado a lado — vou manter os existentes pra não quebrar nada e o novo card é aditivo).

## Lógica de cálculo (memoizada)

```ts
const [valuationPerSub, setValuationPerSub] = useState(1500);   // R$/assinante
const valuationEstimado = agg.totalAcessos * valuationPerSub;
const capitalSocial      = Number(rfb?.capital_social ?? 0) || 0;
const ganhoCapital       = Math.max(0, valuationEstimado - capitalSocial);
const impostoEstimado    = ganhoCapital * 0.225;

// risco
const gapCapital = valuationEstimado > 0 && capitalSocial > 0
  && capitalSocial < valuationEstimado * 0.10;

const porte = classifyPorte(rfb?.porte_empresa);            // "ME"|"EPP"|"DEMAIS"
const receitaAnualEst = agg.totalAcessos * ticket * 12;
const desenquadramento = (porte === "ME" || porte === "EPP")
  && receitaAnualEst > 4_800_000;
```

Reutiliza o `ticket` que já existe no card financeiro (mesma referência `useState`) e cria **um novo state separado** `valuationPerSub` (R$ 1.500 default, input editável).

## UI — novo bloco "Análise de M&A e Tributária"

Estrutura dentro de `<Card className="p-4 bg-zinc-900/60 border-zinc-800">`:

1. **Cabeçalho**: ícone `Calculator` + título "Análise de M&A e Tributária" + subtítulo cinza explicando que cruza Capital Social (RFB) com base de assinantes (Anatel).

2. **Linha de inputs e KPIs (grid 4 colunas no desktop)**:
   - Input editável "Valuation por assinante" (R$, default 1500) — visual igual ao do "Ticket médio".
   - KPI **"Valuation Estimado"** → `formatBRL(valuationEstimado)` — emerald.
   - KPI **"Capital Social (RFB)"** → `formatBRL(capitalSocial)` — neutro.
   - KPI **"Ganho de Capital Projetado"** → `formatBRL(ganhoCapital)` — emerald (ou cinza se 0).

3. **Card destaque "Estimativa de Imposto (22,5%)"** — full-width, borda/fundo âmbar:
   - Valor grande: `formatBRL(impostoEstimado)`
   - Subtítulo: "Imposto estimado sobre ganho de capital na venda · alíquota 22,5%".
   - Ícone `Receipt`. Cor âmbar (não vermelha, pois não é alerta) — `border-amber-900/60 bg-amber-950/30 text-amber-200`.

4. **Painel "Diagnóstico de Risco" (só renderiza se houver pelo menos 1 alerta)**:
   - Título pequeno com ícone `ShieldAlert`.
   - Badges/cards verticais empilhados:
     - **Gap de Capital** (se `gapCapital`): card vermelho `border-red-900/60 bg-red-950/30 text-red-200` — texto: "⚠️ **Alto Risco Societário (Gap de Capital)** — Capital social de {formatBRL(capitalSocial)} representa {pct}% do valuation estimado ({formatBRL(valuationEstimado)}). Vendedor terá alto impacto de IR na venda."
     - **Desenquadramento** (se `desenquadramento`): card vermelho — texto: "🚨 **Alerta de Desenquadramento** — Porte declarado **{porte}** mas receita anualizada estimada de {formatBRL(receitaAnualEst)} excede o teto do Simples ({formatBRL(4_800_000)}). Possível subfaturamento ou desorganização tributária."

5. **Disclaimer** em fonte 10px cinza ao final: "Estimativas baseadas em cenário de venda 100% das quotas, alíquota fixa de 22,5% sobre ganho de capital (Lei 13.259/2016 — faixa inicial). Não substitui análise tributária formal."

## Paleta (dark mode)

- Cards normais: `bg-zinc-900/60 border-zinc-800`.
- KPI principal (Valuation/Ganho): emerald (`border-emerald-900/60 bg-emerald-950/20 text-emerald-300`).
- Imposto: âmbar (`border-amber-900/60 bg-amber-950/30 text-amber-200`).
- Alertas críticos: vermelho (`border-red-900/60 bg-red-950/30 text-red-200`).
- Capital social neutro: `border-zinc-800 bg-zinc-950 text-zinc-100`.

## Formatação

- Monetário: `formatBRL()` já existente em `@/lib/anatelInsights`.
- Percentuais: `(x).toLocaleString("pt-BR", { style:"percent", maximumFractionDigits:1 })` ou string fixa "22,5%" para a alíquota.

## Não fazer

- Não mover/remover o card "Inteligência financeira & alertas M&A" existente (alertas atuais permanecem; os novos badges são complementares, mais explícitos sobre IR).
- Não criar nova rota nem migração — tudo client-side com dados já carregados pela página.
- Não persistir `valuationPerSub` (é apenas simulação local).

Confirme que posso aplicar.
