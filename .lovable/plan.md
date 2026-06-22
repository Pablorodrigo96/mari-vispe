## Objetivo

Disparar uma pesquisa de IA em segundo plano assim que o empresário informa **Razão Social + CNPJ** no Equity Planner. Enquanto ele continua preenchendo o questionário, a IA já busca sinais externos da empresa. Ao final, o diagnóstico abre com um novo painel **"Mapeamento de Mercado"** — visual, com frases-chave e números grandes, sem poluição.

## O que a pesquisa cobre

Para cada empresa, a IA tenta responder 8 perguntas estruturadas:

1. **Site & posicionamento** — existe site? qualidade do pitch? clareza da proposta de valor?
2. **Capital social & estrutura societária** — valor declarado vs faturamento (gap fiscal)
3. **Holding** — empresa está sob holding? (sinal de eficiência tributária / sucessão)
4. **Reputação Google** — nota média, volume de avaliações
5. **Equity Story** — empresa tem narrativa pública estruturada (sim/parcial/inexistente)
6. **Mídia & menções** — já foi citada? em que veículos? última menção
7. **Presença digital** — LinkedIn, Instagram, indícios de tração
8. **Sinais de risco/oportunidade** — processos, reclamações, prêmios, certificações

## Fluxo

```text
Step 1 (Identificação)
  └─ usuário digita razão + CNPJ → debounce 1.5s
       └─ dispara equity-market-scan em background (não bloqueia UI)
            ├─ chip discreto no topo: "Pesquisa de mercado rodando…"
            └─ grava em equity_market_scans (status: running)

Steps 2-4 (usuário segue preenchendo)
  └─ scan continua. Chip atualiza: "Mapeamento pronto ✓"

Step 5 (Gerar diagnóstico)
  └─ aguarda scan terminar (se ainda rodando) + roda análise atual
       └─ Diagnóstico abre com nova aba/seção "Mapeamento de Mercado" no topo
```

## Design do painel "Mapeamento de Mercado"

Mantém identidade (Carbon/Volt/Bone, glassmorphism), mas com **linguagem editorial** — menos cards-iguais, mais hierarquia:

- **Hero quote**: 1 frase grande (40-56px) sintetizando o achado-chave. Ex: *"Sua empresa fala pouco para o mercado que pagaria mais por ela."*
- **3 big numbers** em linha (não-cards): nota Google, menções na mídia (12m), capital social vs faturamento (gap em %). Tipografia 64-80px, label minúsculo em cima.
- **Strip de 4 sinais** (chips horizontais coloridos): Site · Holding · Equity Story · Reputação — cada um com status (Forte / Médio / Frágil / Ausente) e 1 linha curta.
- **Insight fiscal** (faixa Volt/10 com borda esquerda Volt): se capital social muito baixo ou sem holding, destaca economia tributária potencial em R$.
- **Trechos da mídia** (máx 3): citação + veículo + data, em estilo blockquote.
- **Próximo passo** (1 frase + CTA): conecta com o plano anual já existente.

Diferente do resto do diagnóstico (que é denso/operacional), este painel é **editorial/executivo** — espaços generosos, menos divisões, foco em ler e absorver em 30 segundos.

## Detalhes técnicos

**Nova tabela** `equity_market_scans`:
- `id`, `user_id`, `assessment_id` (nullable enquanto draft), `cnpj`, `razao_social`
- `status` (`pending|running|done|error`), `started_at`, `completed_at`
- `payload jsonb` (estrutura abaixo), `error_msg`
- RLS: owner-only; grants padrão
- Index único em `(user_id, cnpj)` para cache de 24h

**Shape do `payload`** (validado por zod no edge function):
```ts
{
  hero_insight: string,
  big_numbers: { google_rating, midia_12m, capital_gap_pct },
  signals: { site, holding, equity_story, reputacao } // cada um {status, nota}
  fiscal_insight: { has_opportunity, economia_estimada_brl, racional },
  media_clips: [{ veiculo, data, trecho, url }],
  next_step: { titulo, racional }
}
```

**Nova edge function** `equity-market-scan`:
- Input: `{ cnpj, razao_social, assessment_id? }`
- Steps: (1) BrasilAPI/ReceitaWS para capital social + sócios + atividade. (2) Google search via Perplexity `sonar` (mídia, reputação) — barato e com citações. (3) Tenta scrape do site oficial (se descoberto) com Firecrawl format `summary+branding`. (4) Heurística para "tem holding" (sócios PJ + CNAE 6463-8). (5) Gemini 3 Flash para sintetizar `hero_insight`, `fiscal_insight`, `next_step` em pt-BR a partir dos sinais coletados.
- Grava resultado em `equity_market_scans`.
- Cache: se já existe scan `done` < 24h para o mesmo CNPJ daquele user, reusa.

**Frontend**:
- `src/pages/EquityPlannerNew.tsx`: useEffect com debounce em `[razao, cnpj]` válidos → chama `equity-market-scan` via `supabase.functions.invoke`. Estado local `marketScanStatus` controla o chip no topo do wizard.
- `src/components/equity-planner/MarketMappingPanel.tsx` (novo): renderiza o painel editorial.
- `src/pages/EquityPlannerAssessment.tsx`: ao montar, busca `equity_market_scans` por `assessment_id` e injeta `MarketMappingPanel` como **primeira seção** do diagnóstico (acima do AnnualPlanTimeline).
- Reaproveita tokens existentes (`bg-carbon/90`, `text-volt`, `text-bone`). Sem cores novas.

**Conectores necessários** (verificar/pedir):
- Perplexity (busca + mídia)
- Firecrawl (scrape site oficial)
- Lovable AI Gateway (síntese final — já disponível)

## Fora do escopo desta entrega

- Não muda o questionário em si (steps 0-4 permanecem)
- Não muda a análise IA que já roda no step 5
- Não cria CRM/follow-up sobre os achados
