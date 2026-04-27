# Fase 2 — Motor de Scores (M&A / Vispe / Sucessão)

Transformar a soma de signals (Fase 1) em três scores normalizados 0–100, persistidos com versionamento e expostos via view consolidada.

---

## ⚠️ Correções vs. prompt original

Antes de aplicar, corrijo 4 pontos do prompt que quebrariam em produção:

1. **RLS do `profiles`**: o prompt usa `p.id=auth.uid()`. Mesmo bug da Fase 1 — em `public.profiles` o vínculo correto é `p.user_id = auth.uid()`. Ajusto.
2. **`UNIQUE (cnpj, formula_version, is_current)`**: essa constraint colide quando há mais de uma linha histórica com `is_current=false` para o mesmo cnpj+versão (recompute repetido). O padrão correto para "linha corrente única" é **UNIQUE INDEX parcial** `WHERE is_current = true`. Substituo.
3. **View `companies_scored` sem `security_invoker`**: views Postgres bypassam RLS por padrão. Igual à `companies_enriched` da Fase 1, uso `WITH (security_invoker = true)` para respeitar RLS de `companies` e `company_scores`.
4. **Auth da edge function**: padronizo com o padrão já estabelecido em `compute-signals` (CORS, admin via `user_roles` ou `service_role` via JWT claims, JSON errors, chunks de 1000 no insert).

---

## 2.1 — Migration: tabela `equity_brain.company_scores`

**Arquivo novo:** `supabase/migrations/<ts>_equity_brain_company_scores.sql`

```sql
CREATE TABLE IF NOT EXISTS equity_brain.company_scores (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cnpj            VARCHAR(14) NOT NULL REFERENCES equity_brain.companies(cnpj) ON DELETE CASCADE,
  ma_score        NUMERIC NOT NULL DEFAULT 0,
  vispe_score     NUMERIC NOT NULL DEFAULT 0,
  sucessao_score  NUMERIC NOT NULL DEFAULT 0,
  buyer_fit_score NUMERIC,                    -- preenchido na Fase 4
  ma_breakdown        JSONB,
  vispe_breakdown     JSONB,
  sucessao_breakdown  JSONB,
  formula_version VARCHAR(10) NOT NULL DEFAULT 'v1.0',
  computed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_current      BOOLEAN NOT NULL DEFAULT true
);

-- UNIQUE PARCIAL: apenas 1 linha "current" por (cnpj, formula_version).
-- Histórico (is_current=false) pode ter N linhas livremente.
CREATE UNIQUE INDEX IF NOT EXISTS uq_scores_current_per_cnpj_version
  ON equity_brain.company_scores(cnpj, formula_version)
  WHERE is_current = true;

CREATE INDEX IF NOT EXISTS idx_scores_cnpj_current  ON equity_brain.company_scores(cnpj, is_current);
CREATE INDEX IF NOT EXISTS idx_scores_ma_current    ON equity_brain.company_scores(ma_score DESC) WHERE is_current = true;
CREATE INDEX IF NOT EXISTS idx_scores_vispe_current ON equity_brain.company_scores(vispe_score DESC) WHERE is_current = true;
CREATE INDEX IF NOT EXISTS idx_scores_suc_current   ON equity_brain.company_scores(sucessao_score DESC) WHERE is_current = true;

ALTER TABLE equity_brain.company_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "scores_read_admins_advisors"
ON equity_brain.company_scores FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(),'admin')
  OR public.has_role(auth.uid(),'advisor')
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = auth.uid() AND p.is_partner_accountant = true)
);

CREATE POLICY "scores_write_service"
ON equity_brain.company_scores FOR ALL TO service_role
USING (true) WITH CHECK (true);
```

---

## 2.2 — Edge Function `calculate-scores`

**Arquivo novo:** `supabase/functions/calculate-scores/index.ts`

- POST com `{ cnpjs?: string[], filter?: { uf?, setor_ma?, min_signals? }, limit?: number }` (default 500, max 5000).
- Auth: admin (via `user_roles`) ou `service_role`. Mesmo padrão de `compute-signals`.
- Carrega `signal_catalog` em memória (lookup `affects_scores` + `default_weight`).
- Seleciona empresas alvo:
  - Se `cnpjs` vier → usa direto.
  - Senão → empresas com pelo menos 1 signal (subquery em `company_signals`), aplicando `filter.uf`/`filter.setor_ma`.
- Calcula `ma`, `vispe`, `sucessao` somando `weight` por categoria do catalog.
- Normaliza: `score = MIN(100, ROUND((sum / NORM) * 1000) / 10)` com `NORM = { ma:200, vispe:80, sucessao:100 }`.
- Persiste com **transação lógica em 2 passos**:
  1. `UPDATE company_scores SET is_current=false WHERE cnpj IN(...) AND formula_version='v1.0' AND is_current=true`.
  2. `INSERT` em chunks de 1000 com `is_current=true`.
  - Se o insert falhar, retorna 500 com `partial` count. Trade-off aceito: as poucas empresas do lote ficam temporariamente sem score corrente até retry — alternativa (commit em 1 statement) exigiria `supabase.rpc` em SQL puro, fora do escopo desta fase.
- Retorna `{ scored, sample_top: [{cnpj, ma, vispe, suc}, …] }`.

`FORMULA_VERSION = "v1.0"` constante no topo, fácil de bumpar futuramente para `v1.1` rodando em paralelo (A/B).

---

## 2.3 — Migration: view `equity_brain.companies_scored`

**Mesmo arquivo da migration 2.1** (uma migration só, mais limpo):

```sql
CREATE OR REPLACE VIEW equity_brain.companies_scored
WITH (security_invoker = true) AS
SELECT
  c.cnpj, c.razao_social, c.nome_fantasia, c.uf, c.municipio,
  c.setor_ma, c.subsetor_ma, c.cnae_principal, c.cnae_descricao,
  c.data_abertura, c.capital_social, c.qtd_socios,
  c.has_listing, c.listing_id,
  COALESCE(s.ma_score, 0)        AS ma_score,
  COALESCE(s.vispe_score, 0)     AS vispe_score,
  COALESCE(s.sucessao_score, 0)  AS sucessao_score,
  s.buyer_fit_score,
  s.ma_breakdown, s.vispe_breakdown, s.sucessao_breakdown,
  s.computed_at AS scores_computed_at,
  EXTRACT(YEAR FROM AGE(NOW(), c.data_abertura))::int AS idade_empresa
FROM equity_brain.companies c
LEFT JOIN equity_brain.company_scores s
  ON s.cnpj = c.cnpj AND s.is_current = true AND s.formula_version = 'v1.0';

GRANT SELECT ON equity_brain.companies_scored TO authenticated;
```

Nota: uso `COALESCE(..., 0)` para atender o critério "empresas sem signals têm scores=0 (não NULL)" diretamente na view, sem depender de inicialização em `company_scores`.

---

## 2.4 — Cron diário (preparado, não ativado)

O entregável fala em "Cron diário para recalcular scores dos top 50k". Como esse SQL contém URL do projeto + anon key (dados específicos do ambiente, não migráveis), **não vai como migration**. Vou:

- Criar `docs/EQUITY_BRAIN_CRON.md` com o snippet pronto:

```sql
-- Rodar manualmente quando quiser ativar (não vai em migration):
SELECT cron.schedule(
  'equity-brain-recompute-scores-daily',
  '0 5 * * *',  -- 02:00 BRT
  $$
  SELECT net.http_post(
    url     := 'https://eiprjgotjruiutztjavp.functions.supabase.co/calculate-scores',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer <SERVICE_ROLE_KEY>"}'::jsonb,
    body    := '{"limit":5000}'::jsonb
  );
  $$
);
```

- Não disparo nada agora. Quando você pedir "ativa o cron", uso `supabase--read_query` (insert) e configuro com a service role real do ambiente.

Decisão: limitar `limit` a 5000 por chamada (não 50k) — uma chamada de 50k empresas em compute estoura o tempo de edge function (50s). A estratégia correta é cron rodar várias vezes por dia ou usar paginação interna. Ajustamos quando ativarmos.

---

## ✅ Verificação após apply

1. `\d equity_brain.company_scores` → coluna `buyer_fit_score` presente, índice parcial `uq_scores_current_per_cnpj_version` listado.
2. Curl (admin JWT):
   ```bash
   curl -X POST .../calculate-scores -H "Authorization: Bearer <jwt>" \
     -H "Content-Type: application/json" \
     -d '{"filter":{"setor_ma":"isp_telecom","uf":"RS"},"limit":1000}'
   ```
   → retorna `{ scored: N, sample_top: [...] }`.
3. ```sql
   SELECT cnpj, razao_social, uf, setor_ma, ma_score, vispe_score, sucessao_score
   FROM equity_brain.companies_scored
   WHERE ma_score > 0
   ORDER BY ma_score DESC LIMIT 20;
   ```
4. Reexecutar `calculate-scores` no mesmo lote → não duplica linhas `is_current=true` (constraint funciona); histórico cresce com `is_current=false`.

---

## 📁 Diff resumido

```
+ supabase/migrations/<ts>_equity_brain_company_scores.sql   (~60 linhas: tabela + índices + RLS + view)
+ supabase/functions/calculate-scores/index.ts               (~180 linhas)
+ docs/EQUITY_BRAIN_CRON.md                                  (snippet de cron, não auto-aplicado)
```

Sem alterações em: schema `public`, edges existentes, `supabase/config.toml`, `types.ts` (regenerado quando o front consumir).

---

## 🚫 Fora de escopo

- UI React em `/equity-brain/*`.
- `buyer_fit_score` (preenchido na Fase 4 — matching).
- Ativação do cron (deixo pronto, ativo quando você pedir).
- Recompute em massa nos 5M de CNPJs (estratégia de paginação vem na Fase 5).
