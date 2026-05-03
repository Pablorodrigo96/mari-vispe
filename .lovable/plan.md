## Diagnóstico — por que está vazio

**1. CNPJ / website / linkedin / email / pe_sponsor não vêm**
- Na DB, `buyers.id=3ddb9d75…` (Brasil TecPar) tem TODOS esses campos `NULL`.
- O prompt do `enrich-buyer-via-ai` **não pede** esses campos à IA — só pede `tese_atualizada`, `deals_recentes`, `ultima_captacao`, `equipe_chave`, `setores_foco`, `regioes_foco`, `fontes_sugeridas`.
- O `EnrichReviewModal` também não tem opção de aplicá-los — só salva `tese_text`, `setores_interesse`, `ufs_interesse`, `recent_capital_raise_brl`.
- Resultado: mesmo se a IA respondesse, não teria onde ir.

**2. Métricas (deals históricos / múltiplo / 12m / captação) zeradas**
- `deals_realizados=0`, `deals_last_12m=0`, `avg_multiple_paid_recent=NULL`, `recent_capital_raise_brl=NULL`.
- Mesmo problema: prompt não pede `total_deals`, `deals_12m`, `multiplo_medio`. Modal só aplica captação.
- Bloco "Deals históricos (Vispe Database)" busca em `equity_brain.benchmark_transactions` por `comprador_nome ILIKE '%Brasil%'` — confirmei que não há registros desse comprador nessa tabela (base é interna).

**3. Notícias vazias**
- `company_news` tem 25 linhas, **0 com `buyer_id`**. A varredura roda só no escopo `mandates/top500` (Onda D anterior).
- O `ingest-company-news` já aceita `scope='buyers'`, mas nunca foi disparado para buyers — e não há botão na UI do buyer para forçar coleta sob demanda.
- `NewsPanel` filtra por `buyer_id`, então naturalmente vazio.

---

## Plano

### Job 1 — Expandir prompt do `enrich-buyer-via-ai`
Adicionar ao schema JSON pedido:
```json
{
  "cnpj": "00.000.000/0001-00 ou null",
  "website": "https://… ou null",
  "linkedin_url": "https://linkedin.com/company/… ou null",
  "email_contato_principal": "string ou null",
  "telefone_contato": "string ou null",
  "pe_sponsor_name": "string ou null",
  "vertical_principal": "string ou null",
  "metricas": {
    "deals_realizados": "número total histórico ou null",
    "deals_last_12m": "número ou null",
    "avg_multiple_paid_recent": "ex: 8.5 (EV/EBITDA) ou null",
    "recent_capital_raise_brl": "valor em R$ (não em milhões) ou null"
  },
  "tese_atualizada": …,
  "deals_recentes": [...],
  "ultima_captacao": {...},
  "equipe_chave": [...],
  "setores_foco": [...],
  "regioes_foco": [...],
  "fontes_sugeridas": [...]
}
```
Reforçar no prompt: "Pesquise especificamente em LinkedIn, site oficial, Crunchbase, releases, mídia BR (Valor, Pipeline, Brazil Journal). Não invente — use null se incerto."

### Job 2 — Expandir `EnrichReviewModal`
Adicionar 2 novas seções com checkboxes:
- **Identidade & contato** → `cnpj`, `website`, `linkedin_url`, `email_contato_principal`, `telefone_contato`, `pe_sponsor_name`, `vertical_principal` (cada campo com checkbox individual; só aplica os marcados E que vieram preenchidos).
- **Métricas do comprador** → `deals_realizados`, `deals_last_12m`, `avg_multiple_paid_recent`, `recent_capital_raise_brl` (idem).

Mostrar valor sugerido pela IA ao lado do checkbox. Patch direto em `equity_brain.buyers`. Manter "Salvar tudo como nota" como fallback.

### Job 3 — Botão "Buscar notícias agora" no buyer
Em `BuyerDetailPage` (header, ao lado de Enriquecer via IA) e/ou no topo da aba "Notícias":
- Botão **"Buscar notícias"** (ícone Newspaper + Loader2)
- Chama `ingest-company-news` via `supabase.functions.invoke` com body `{ scope: 'buyer', buyer_id, lookback_days: 365 }` — **adicionar suporte a buyer_id único** na função (hoje só aceita scope='buyers' que faz batch de qualified).
- Toast com nº inserido. Re-fetch do `NewsPanel` (invalidar query / refazer effect).

### Job 4 — Ajuste mínimo no `ingest-company-news`
Aceitar `body.buyer_id` (single): se presente, ignora scope/limit, busca aquele buyer e gera 1 target. Mantém retrocompatibilidade.

### Job 5 — Hint amigável quando IA volta vazio
Se a IA retornar todos os campos `null` para um buyer (por ser pequeno/desconhecido), mostrar mensagem no modal: "IA não encontrou informação pública confiável sobre este buyer. Tente preencher manualmente ou buscar pelo CNPJ se você tiver."

---

## Não vou fazer
- Não vou refatorar `BuyerTrackRecordBlock` (a busca em `benchmark_transactions` é correta — só não há dados pra Brasil TecPar lá).
- Não vou agendar cron novo de notícias por buyer (é sob demanda via botão).
- Não vou mexer em outras telas/rotas.

**Custo estimado**: ~R$ 0,05 por enrichment (Gemini Flash) + ~R$ 0,01 por busca de notícias (Perplexity sonar). Zero custo recorrente.

Aprova?