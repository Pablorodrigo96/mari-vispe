# Sistema de Notícias Corporativas — Equity Brain News

Pipeline automático que monitora notícias sobre empresas-alvo, extrai eventos de M&A com IA, alimenta `canonical_transactions` e gera alertas no CRM.

## Decisões confirmadas

- **Escopo de monitoramento (4 fontes):** Mandatos ativos do CRM, Top 500 do `ma_score`, listings ativos do marketplace, buyers ativos do CRM.
- **Ação em deal fechado detectado:** notificação para advisor responsável (sem auto-fechar mandato).
- **Profundidade IA:** **híbrido** — extração estruturada completa (EV, múltiplo, partes, advisors) só quando o evento for `ma_closed`, `ma_announced`, `funding_round` ou `ipo`. Demais notícias ficam como sinal informativo.
- **APIs:** Perplexity (linkado ✅) para search + extração. Firecrawl recusado — fica para v2 se precisarmos de scraping profundo de site institucional.

## Arquitetura

```text
┌─────────────────────────────────────────────────────────────┐
│  CRON (pg_cron)                                              │
│  ├─ daily 03h BRT  → ingest-company-news (escopo completo)   │
│  └─ hourly         → ingest-company-news (mandatos ativos)   │
└─────────────┬───────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────┐
│  ingest-company-news (edge function)                         │
│  1. Monta lista de empresas-alvo (4 escopos)                 │
│  2. Para cada empresa: Perplexity sonar com filtros          │
│     (search_recency_filter='week', search_domain_filter)    │
│  3. Dedupe por hash(url + cnpj)                              │
│  4. Insere em equity_brain.company_news (status='ingested')  │
│  5. Enfileira eventos pending para extract-news-event        │
└─────────────┬───────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────┐
│  extract-news-event (edge function — chamada em batch)       │
│  1. Classifica tipo via Lovable AI (gemini-2.5-flash-lite)   │
│     enum: ma_closed, ma_announced, funding_round, ipo,       │
│     leadership_change, expansion, regulatory, generic        │
│  2. Se for evento M&A/funding/ipo:                           │
│     → Perplexity sonar-pro + structured output JSON schema   │
│       (ev_brl, multiplo_ebitda, comprador, vendedor,         │
│        advisors_financeiros[], advisors_legais[], data)     │
│  3. Atualiza company_news com evento + dados estruturados    │
│  4. Para ma_closed: cria registro em canonical_transactions  │
│  5. Dispara news-to-crm-alert se empresa tem mandato ativo   │
└─────────────┬───────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────┐
│  news-to-crm-alert                                            │
│  - Busca advisor responsável pelo mandato/setor              │
│  - Insere em equity_brain.crm_activities (type='news_alert') │
│  - Insere em public.notifications                            │
│  - Atualiza company_signals (signal_key='news_ma_signal')    │
└─────────────────────────────────────────────────────────────┘
```

## Schema (migration)

```sql
-- enum dos tipos de evento
CREATE TYPE equity_brain.news_event_type AS ENUM (
  'ma_closed','ma_announced','funding_round','ipo',
  'leadership_change','expansion','regulatory','generic'
);

CREATE TABLE equity_brain.company_news (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cnpj varchar(14),                 -- nullable: pode ser buyer/grupo sem CNPJ
  company_id uuid REFERENCES equity_brain.companies(cnpj), -- ajustado p/ FK real
  buyer_id uuid REFERENCES equity_brain.buyers(id),
  listing_id uuid,
  source_url text NOT NULL,
  source_domain text,
  title text NOT NULL,
  summary text,
  published_at timestamptz,
  ingested_at timestamptz DEFAULT now(),
  event_type equity_brain.news_event_type DEFAULT 'generic',
  event_data jsonb DEFAULT '{}'::jsonb, -- {ev_brl, multiplo, comprador, vendedor, advisors[]}
  raw_perplexity jsonb,
  status text DEFAULT 'ingested',  -- ingested | extracted | failed | duplicate
  dedupe_hash text UNIQUE,         -- sha1(source_url + (cnpj||buyer_id))
  alert_sent boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_company_news_cnpj ON equity_brain.company_news(cnpj) WHERE cnpj IS NOT NULL;
CREATE INDEX idx_company_news_buyer ON equity_brain.company_news(buyer_id) WHERE buyer_id IS NOT NULL;
CREATE INDEX idx_company_news_event ON equity_brain.company_news(event_type, published_at DESC);
CREATE INDEX idx_company_news_status ON equity_brain.company_news(status) WHERE status = 'ingested';

ALTER TABLE equity_brain.company_news ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins/advisors view all news"
  ON equity_brain.company_news FOR SELECT TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'advisor'));

CREATE POLICY "Service role manages news"
  ON equity_brain.company_news FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- novos signals em signal_catalog
INSERT INTO equity_brain.signal_catalog VALUES
  ('news_ma_signal','market',  'Empresa ou setor com M&A recente nos últimos 90 dias', 0.15, ARRAY['ma_score','vispe_score']),
  ('news_funding',  'market',  'Empresa captou rodada de equity ou dívida nos últimos 180 dias', 0.10, ARRAY['ma_score']),
  ('news_leadership','signal', 'Mudança de liderança/sucessão noticiada nos últimos 180 dias', 0.20, ARRAY['sucessao_score']);
```

## Edge functions

| função | gatilho | descrição |
|---|---|---|
| `ingest-company-news` | cron + manual | Monta target list (4 escopos), chama Perplexity `sonar` com filtros temporais e de domínio (valor.globo.com, neofeed.com.br, brazilfunds.com, infomoney, exame, …). Insere em `company_news` com `status='ingested'`. |
| `extract-news-event` | trigger interno + cron 5min | Pega lote de `status='ingested'`, classifica com Gemini Flash Lite, e para eventos M&A roda Perplexity `sonar-pro` com `response_format: json_schema` para extrair EV, múltiplo, partes. Atualiza para `status='extracted'`. Cria `canonical_transactions` quando há valor confirmado. |
| `crawl-ma-sources` | cron diário 04h BRT | Varre os 8 portais brasileiros de M&A (sem precisar conhecer CNPJ específico) buscando deals do dia. Cruza com `companies` por razão social. Cobre M&As de empresas que ainda não estão no nosso radar. |
| `news-to-crm-alert` | chamada por extract-news-event | Para cada notícia M&A relacionada a empresa com mandato/buyer ativo: cria `crm_activity` tipo `news_alert`, `notification` para advisor, atualiza `company_signals`. |

Todas seguem padrão Edge Functions já estabelecido (CORS, auth admin/service_role, log em `engine_runs`).

## Cron jobs (adicionados em `setup-equity-brain-crons`)

```text
news-ingest-hourly-mandates     0 * * * *      ingest-company-news  {scope:'mandates'}
news-ingest-daily-full          0 6 * * *      ingest-company-news  {scope:'all'}
news-extract-batch-5min         */5 * * * *    extract-news-event   {limit:50}
news-crawl-sources-daily        0 7 * * *      crawl-ma-sources     {}
```

## UI

1. **Aba "Notícias" em `MandateDetailPage`** (`/equity-brain/crm/mandate/:id`): timeline de notícias da empresa-alvo, com badge colorido por `event_type`, link para a fonte original e card destacado quando há M&A com EV/múltiplo extraído.
2. **Aba "Notícias" em `BuyerDetailPage`**: notícias do buyer (movimentos, novas teses, aquisições paralelas).
3. **Widget "Pulso de Mercado" no Dashboard Executivo** (`/equity-brain/dashboard`): últimas 10 notícias M&A do setor de qualquer mandato ativo + contador de deals do mês por setor.
4. **Página global `/equity-brain/news`**: feed completo filtrável por setor, UF, tipo, período. Acesso admin/advisor.

## Mari Brain integration

- KB doc `04-noticias-mercado.md` em `supabase/functions/mari-brain/kb/` explicando como o sistema funciona, quais portais são monitorados, o que cada `event_type` significa e exemplos de queries que a Mari pode responder ("quais M&As o concorrente X fechou em 2026?", "qual o múltiplo mediano dos deals de logística no último trimestre?").
- Mari Brain ganha contexto vivo: ao abrir um mandato, as 5 últimas notícias da empresa entram automaticamente no system prompt.

## Custos esperados (mensais)

| item | qtd | valor |
|---|---|---|
| Perplexity sonar (search) | ~3.500 chamadas/mês | ~US$ 35 |
| Perplexity sonar-pro (extração M&A) | ~400 chamadas/mês | ~US$ 25 |
| Lovable AI Gemini Flash Lite (classificação) | ~5.000 chamadas/mês | ~US$ 8 |
| **Total** | | **~US$ 68/mês** |

## Entregáveis (ordem de implementação)

1. Migration: schema + enum + RLS + 3 novos signals.
2. `ingest-company-news` + deploy.
3. `extract-news-event` + deploy.
4. `crawl-ma-sources` + deploy.
5. `news-to-crm-alert` + deploy.
6. Atualização de `setup-equity-brain-crons` com 4 novos jobs.
7. UI: tab Notícias em MandateDetailPage + BuyerDetailPage, página `/equity-brain/news`, widget no Dashboard Executivo.
8. KB doc `04-noticias-mercado.md` para Mari Brain + injeção de contexto vivo.
9. Doc técnico `docs/EQUITY_BRAIN_NEWS.md`.

Tempo estimado: ~3-4 horas de implementação contínua.

Pronto para implementar — confirme aprovando o plano.
