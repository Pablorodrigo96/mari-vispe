# Encerrar Blocos 1-2-4 + arrancar Fase 12 (Bloco 5)

## Diagnóstico atual (auditoria do checklist)

| Bloco | Status |
|---|---|
| **1 — Fundação** | ⚠️ Schema ✅, teses ✅ (10), buyers ✅ (13). **Mas `companies`=0, `signals`=0, `scores`=0** — sync CNPJ nunca rodou. |
| **2 — Motor** | ❌ `matches`=0, `opportunities_ready`=0. **3 crons não agendados.** **18 events presos na fila** (process-event nunca rodou). |
| **3 — UI** | ✅ 100% entregue (dashboard, oportunidades, buyers, teses, calls, mapa, grafo, RequireRole). |
| **4 — Operação ISP** | ⚠️ 5 teses ISP ✅, 5+ signals ISP ✅, filtro vertical ✅. Apenas 8 buyers ISP (faltam 12+). CSV top-100 sai vazio sem sync. |
| **5 — Maturidade** | ❌ `score_engine_versions` não existe, `/equity-brain/board` não existe, backtest/roadmap pendentes. |

**Causa raiz:** UI 100% pronta, schemas e seeds prontos, mas a base de empresas nunca foi puxada. Efeito cascata: sem `companies` → sem signals → sem scores → sem matches → sem opportunities → BDR sem o que ligar.

---

## Etapa 1 — Sync de empresas ISP (destrava Blocos 1, 2 e 4)

Disparar `sync-companies-from-cnpj` em batches paginados, **filtrado pelos 8 CNAEs ISP** do piloto.

- CNAEs alvo: `6110801, 6110802, 6190601, 6190602, 6190699, 6120501, 6141800, 6142600`
- Filtro `situacao_cadastral='Ativa'`
- Lote inicial: 5k → validar → escalar para ~50k

**Como:** invocar a edge via `supabase.functions.invoke('sync-companies-from-cnpj', { body: { cnaes: [...], limit: 5000, offset: 0 } })` em loop client-side. Se a edge não suportar o parâmetro `cnaes[]`, ajusto `supabase/functions/sync-companies-from-cnpj/index.ts`.

**Aceite:** `companies ≥ 5k`, `v_isp_universe ≥ 5k`, ≥ 30 com `lat/lng` não-nulos.

## Etapa 2 — Cadeia compute → score → match → opportunities

Após Etapa 1, executar **uma vez em série**:

1. `compute-signals` `{ limit: 5000 }`
2. `calculate-scores` `{ limit: 5000 }`
3. `match-batch` `{ top_n: 5000 }`
4. `refresh-opportunities` `{ top_n: 5000 }`

**Aceite:** `signals ≥ 10k`, `scores ≥ 5k`, `matches ≥ 1k`, `opportunities_ready ≥ 1k`.

## Etapa 3 — Drenar a fila de 18 events presos

Invocar `process-event` 1× manualmente (depois fica no cron da Etapa 4).

## Etapa 4 — Agendar os 3 crons do Equity Brain

Os jobs estão documentados em `docs/EQUITY_BRAIN_CRON.md` mas precisam ser ativados (não vão por migration porque expõem service role key).

**Solução:** criar **edge function `setup-equity-brain-crons`** (admin-only) que lê `SUPABASE_SERVICE_ROLE_KEY` do ambiente edge e executa os 3 `cron.schedule(...)`. Mais seguro que migration:

- `equity-brain-recompute-scores-daily` — `0 5 * * *`
- `refresh-opportunities-daily` — `0 6 * * *`
- `process-events-every-minute` — `* * * * *`

**Arquivo novo:** `supabase/functions/setup-equity-brain-crons/index.ts`

**Aceite:** `select * from cron.job` mostra os 3 ativos.

## Etapa 5 — Completar seed de buyers ISP (8 → 20+)

Migration `phase10_buyers_isp_complete.sql` idempotente (`ON CONFLICT (nome) DO NOTHING`) com 12-15 buyers reais adicionais:

**Estratégicos regionais (8):** Mob Telecom, Brasil TecPar, Sumicity, Giga+, Ligga, Veek, Sercomtel, Wevo Networks.

**Fundos PE / family offices (5):** Crescera Capital, Performa Investimentos, Bain Capital LATAM, General Atlantic, family office Lerner-telecom-RS.

Cada um com 1-3 `buyer_theses` apontando para as 5 teses ISP. Filtros (UFs, ticket, setores) seguem direto nos campos do `buyer` (alinhado ao schema atual).

**Aceite:** `buyers where source like 'seed_isp%'` ≥ 20.

## Etapa 6 — Fase 12 (Bloco 5): infra estrutural

UI principal está pronta — vale começar agora a parte estrutural não-bloqueante.

### 6.a — Tabela `score_engine_versions`

Migration nova:

```sql
CREATE TABLE equity_brain.score_engine_versions (
  id uuid PK default gen_random_uuid(),
  version text UNIQUE NOT NULL,         -- 'v1.0', 'v1.1'
  description text,
  weights_json jsonb NOT NULL,           -- snapshot dos pesos
  thresholds_json jsonb NOT NULL,        -- thresholds de tier
  activated_at timestamptz,
  deactivated_at timestamptz,
  created_at timestamptz default now(),
  created_by uuid references auth.users(id),
  notes text
);
```

Seed `v1.0` com snapshot dos pesos atuais lidos de `signal_catalog.default_weight`. RLS admin-only. Adicionar coluna `score_engine_version text default 'v1.0'` em `company_scores` para rastreabilidade/backtest.

### 6.b — Dashboard `/equity-brain/board` (executivo)

Página `src/pages/equity-brain/BoardPage.tsx` (admin-only via `RequireRole`) com 4 painéis:

1. **Saúde do motor:** totals + opportunities por tier + latência média do `process-event` + events não-processados.
2. **Funil semanal:** companies novas → signals novos → opportunities promoted → calls feitas → leads quentes (de `call_feedback`).
3. **Pipeline por buyer:** top 10 buyers por matches premium.
4. **Versão ativa do score:** badge `v1.0` + link para histórico.

Reaproveita `EBStatCard`, `EBFunnel`, `EquityBrainLayout`.

**Arquivos:**
- novo: `src/pages/equity-brain/BoardPage.tsx`
- novo: `supabase/migrations/<ts>_score_engine_versions.sql`
- editar: `src/App.tsx` (rota `/equity-brain/board`)
- editar: `src/components/equity-brain/EBSidebar.tsx` (link "Board")

### 6.c — Docs de backtest + roadmap (não-código)

- `docs/EQUITY_BRAIN_BACKTEST.md` — playbook para Vispe rodar backtest com 5 mandatos históricos.
- `docs/EQUITY_BRAIN_ROADMAP_VERTICALS.md` — template para Health/Varejo/Indústria/Agro seguirem o piloto ISP.

Itens "Backtest validado" e "Roadmap aprovado pelo board" são entregáveis de **produto**, não código — ficam pendentes do input da Vispe.

---

## Critérios de aceite globais

- Bloco 1: companies ≥ 5k, signals ≥ 10k, scores ≥ 5k.
- Bloco 2: matches ≥ 1k, opportunities_ready ≥ 1k, 3 crons ativos, fila de events drenada.
- Bloco 4: 20+ buyers ISP, top-100 CSV exporta com dados reais.
- Bloco 5 (parcial): `score_engine_versions` v1.0 ativa, `/equity-brain/board` operacional, docs de backtest e roadmap publicados.

## Armadilhas previstas

- **Sync lento:** 5k empresas pode levar 2-5min. Se a edge dá timeout (10s), pagino do client em loop.
- **`cron.schedule` privilégios:** se a service role não puder agendar, fallback é eu te entregar o snippet SQL pronto pra colar no SQL editor.
- **Backtest e roadmap:** intencionalmente fora do escopo de código — exigem input da Vispe (quais 5 mandatos históricos catalogar).