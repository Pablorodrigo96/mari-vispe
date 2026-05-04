# Painel Executivo — Quanto vale, quanto pode valer, quando vender

Vou transformar `/painel` num relatório executivo visual seguindo o anexo, mantendo os módulos atuais como rodapé. Nenhum custo de IA — tudo vem do último valuation salvo + tabelas estáticas por setor.

## Estrutura final do `/painel`

```text
[Saudação personalizada + badges de role]
─────────────────────────────────────────
ZONA 1 · QUANTO VOCÊ VALE
  3 cards: Hoje · Potencial 2027 · Delta (+50%)
  (Se sem valuation → CTA "Calcule seu valuation primeiro")
─────────────────────────────────────────
ZONA 2 · CONTEXTO DE MERCADO
  Gráfico recharts 2022-2028 do setor (pico 2027 destacado)
  Timeline Agora / Ideal / Depois (você-está-aqui)
─────────────────────────────────────────
ZONA 3 · PLANO DE AÇÃO
  4 pilares (Máquina vendas, Controladoria, M&A, Crescimento)
  Resumo ROI consolidado
  Compradores anônimos (número 3-14 por sessão)
─────────────────────────────────────────
ZONA 4 · MÓDULOS CLÁSSICOS (mantém)
  CockpitWeekStrip, KPIs, módulos 2x2, onboarding, atividade
```

## Dados já disponíveis (sem migrations novas obrigatórias)

`valuation_history.result` (último registro do user) traz:
- **multiples**: `mashupValue`, `metrics.ebitda`, `metrics.ebitdaMargin`, `inputs.segment`, `inputs.annualRevenue`, e quando há diagnóstico, `lossMetrics.potentialValue` / `lossMetrics.gap` (já é a versão "real" do potencial)
- **dcf**: `enterpriseValue`, `valueLow`, `valueHigh`

Lógica do hook `useValuationSnapshot`:
1. Se houver `lossMetrics.potentialValue` → usa como potencial 2027; senão `valor × 1.5`.
2. `valorAtual` = `mashupValue` ou `enterpriseValue`.
3. IC = `valueLow/valueHigh` (DCF) ou `± 10%` (multiples).
4. `segment` define o setor para o gráfico/pilares.

## Tabela nova (estática, populada por seed)

```sql
create table public.sector_market_trends (
  segment text not null,
  ano int not null,
  num_deals int not null,
  volume_m numeric not null,
  tendencia text not null check (tendencia in ('historical','estimated','projection')),
  primary key (segment, ano)
);
alter table public.sector_market_trends enable row level security;
create policy "public read" on public.sector_market_trends for select using (true);
```
Seed inicial 2022–2028 para os segmentos que aparecem no valuation (Varejo, Indústria, Serviços, Tecnologia, Saúde, Agronegócio, Construção, Telecom/ISP, Outros). Pico em 2027. Fallback para "Outros" quando segmento não bater.

## Componentes novos (`src/components/painel/exec/`)

- `ExecutiveReport.tsx` — orquestra zonas 1-3, recebe snapshot do valuation.
- `NoValuationCTA.tsx` — card cheio quando `valuation_history` está vazio, link para `/valuation/multiplos`.
- `ValuationTriCard.tsx` — 3 cards (Hoje cinza, Potencial volt, Delta verde), formatação brasileira `R$ 7,1M`, IC e EBITDA por baixo.
- `SectorTrendChart.tsx` — `LineChart` recharts, linha histórica tracejada cinza + linha projeção volt sólida, `ReferenceDot` em 2027 com label "PICO 2027". Lê `sector_market_trends` por segmento (react-query).
- `MarketTimeline.tsx` — 3 colunas (Agora 2026 / Ideal 2027 / Depois 2028), bloco do meio em volt, marcador "VOCÊ ESTÁ AQUI" embaixo do bloco atual.
- `ActionPillars.tsx` — 4 cards (ícones lucide: Cog, ClipboardCheck, Target, TrendingUp). Cada card: problema · o que fazer · impacto · investimento · retorno · ROI %. Templates por segmento em `src/lib/painelPillars.ts` (default fallback).
- `RoiSummary.tsx` — Soma investimento/retorno/ROI dos 4 pilares.
- `AnonBuyersCard.tsx` — `useMemo` com `Math.floor(Math.random()*12)+3`, distribuição fixa 60/30/10. Botão abre `AdvisorGateModal`.
- `AdvisorGateModal.tsx` — Dialog explicando NDAs + CTA "Agendar conversa com advisor" → `https://wa.me/5551992338258?text=...` via `getWhatsAppLink`.

## Mudanças em `Painel.tsx`

- Adicionar query `useQuery(['painel-last-valuation'])` para `valuation_history` ordenado desc limit 1 do user.
- Renderizar `<ExecutiveReport snapshot={...} />` logo após a saudação e antes do `CockpitWeekStrip`.
- Manter intactos: CockpitWeekStrip, grid de KPIs, módulos 2x2, onboarding, atividade recente, boxes contextuais (advisor/franqueado/EB/admin).
- Saudação atualizada para incluir subtítulo "Sua janela de venda começa agora..." quando há valuation.

## Detalhes visuais

- Tema dark mantido (Carbon/Volt/Bone). Cards usam `bg-card`/`border-border`, destaques em `text-accent` (volt) e `text-emerald-500` (delta).
- Tipografia: títulos `text-3xl font-bold tracking-tight`, números grandes `text-4xl font-bold tabular-nums`.
- Mobile: cada zona empilha; gráfico mantém `ResponsiveContainer` com altura 280.
- `break-words` em todos os textos longos.

## Fora de escopo

- Sem alterar `/equity-brain`, `/mari`, Sell Wizard, Header, Footer, AppShell.
- Sem nova IA / edge function.
- Dashboard admin para editar `sector_market_trends` fica para próxima iteração (seed manual agora).

## Memória

Ao concluir, registrar em `mem://features/painel-executive-report` resumindo zonas, fonte de dados (`valuation_history` + `sector_market_trends`) e fallback aleatório 3–14 de buyers.
