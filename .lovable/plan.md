
Cria a unidade fundamental do Equity Brain: **matches** (empresa↔buyer↔tese com score e justificativa). Inclui tabela versionada, 3 edge functions (1 empresa, 1 buyer, 1 lote), view enriquecida e ajuste pequeno em `companies_scored` para expor `porte` (necessário ao cálculo de `porte_fit`).

---

## ⚠️ Correções vs. prompt original

1. **`assigned_bdr REFERENCES auth.users(id)`** — Supabase desencoraja FK direta para `auth.users` (quebra restore/migrate). Padrão do projeto: `UUID` simples sem FK. Mesmo critério usado em `buyers.responsavel_id` na Fase 3.
2. **`UNIQUE (cnpj, buyer_id, thesis_key, is_current) DEFERRABLE`** — incluir `is_current` no UNIQUE permite duas linhas `is_current=false` que colidem. Substituo por **partial unique index** `WHERE is_current = true` (mesmo padrão da Fase 2 em `company_scores`). Histórico fica preservado sem colisão.
3. **`companies_scored` não tem `porte`** — confirmei via schema. O cálculo de `porte_fit` depende disso. Adiciono `c.porte` à view via `CREATE OR REPLACE VIEW` (sem perda de dados) com `security_invoker = true`.
4. **`match-buyer` chamando `match-company` por HTTP** — funciona, mas dobra latência. Refatoro: `match-buyer` faz scoring **inline** (cópia controlada do helper) — sem fetch interno e sem problema de propagar auth.
5. **`match-batch`** — escopo lista mas não detalha. Implemento como wrapper sobre o **mesmo helper inline**, aceitando filtros (`uf`, `setor_ma`, `min_ma_score`, `limit`) e processando em chunks de 200.
6. **Auth nas edges** — Fase 1/2 padronizou em "admin OR service_role" via `getClaims`. Sigo o mesmo padrão nas 3 functions novas.
7. **`UF_NEIGHBORS`** — completo a tabela para os 27 estados brasileiros (não deixar só os 8 do exemplo). Importante para qualidade do `geografia_fit=0.5`.

---

## 4.1 — Migration consolidada

**Arquivo:** `supabase/migrations/<ts>_equity_brain_matches.sql`

### A) Ajuste em `companies_scored` (adiciona `porte`)

```sql
CREATE OR REPLACE VIEW equity_brain.companies_scored
WITH (security_invoker = true) AS
SELECT
  c.cnpj, c.razao_social, c.nome_fantasia, c.uf, c.municipio,
  c.setor_ma, c.subsetor_ma, c.cnae_principal, c.cnae_descricao,
  c.data_abertura, c.capital_social, c.porte,            -- ← NOVO
  c.qtd_socios, c.has_listing, c.listing_id,
  s.ma_score, s.vispe_score, s.sucessao_score, s.buyer_fit_score,
  s.ma_breakdown, s.vispe_breakdown, s.sucessao_breakdown,
  s.computed_at AS scores_computed_at,
  EXTRACT(YEAR FROM AGE(NOW(), c.data_abertura)) AS idade_empresa
FROM equity_brain.companies c
LEFT JOIN equity_brain.company_scores s
  ON s.cnpj = c.cnpj AND s.is_current = true;

GRANT SELECT ON equity_brain.companies_scored TO authenticated;
```

### B) Tabela `matches`

```sql
CREATE TABLE IF NOT EXISTS equity_brain.matches (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cnpj            VARCHAR(14) NOT NULL REFERENCES equity_brain.companies(cnpj) ON DELETE CASCADE,
  buyer_id        UUID NOT NULL REFERENCES equity_brain.buyers(id) ON DELETE CASCADE,
  thesis_key      VARCHAR(40) NOT NULL REFERENCES equity_brain.investment_theses(thesis_key),
  match_score     NUMERIC NOT NULL DEFAULT 0,
  setor_fit       NUMERIC,
  geografia_fit   NUMERIC,
  porte_fit       NUMERIC,
  tese_fit        NUMERIC,
  ma_score_emp    NUMERIC,
  reasons         JSONB,
  ai_thesis_summary TEXT,
  ai_pitch          TEXT,
  ai_confidence     NUMERIC,
  status          VARCHAR(20) DEFAULT 'novo',
  prioridade      INTEGER DEFAULT 3,
  assigned_bdr    UUID,                  -- vínculo lógico p/ auth.users(id), sem FK
  computed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_current      BOOLEAN NOT NULL DEFAULT true
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_matches_current
  ON equity_brain.matches(cnpj, buyer_id, thesis_key)
  WHERE is_current = true;

CREATE INDEX IF NOT EXISTS idx_matches_cnpj_current   ON equity_brain.matches(cnpj) WHERE is_current=true;
CREATE INDEX IF NOT EXISTS idx_matches_buyer_current  ON equity_brain.matches(buyer_id) WHERE is_current=true;
CREATE INDEX IF NOT EXISTS idx_matches_score_current  ON equity_brain.matches(match_score DESC) WHERE is_current=true;
CREATE INDEX IF NOT EXISTS idx_matches_status         ON equity_brain.matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_assigned       ON equity_brain.matches(assigned_bdr) WHERE assigned_bdr IS NOT NULL;
```

### C) RLS

```sql
ALTER TABLE equity_brain.matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "matches_read_admins_advisors"
ON equity_brain.matches FOR SELECT TO authenticated
USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'advisor'));

CREATE POLICY "matches_update_assignee"
ON equity_brain.matches FOR UPDATE TO authenticated
USING (assigned_bdr = auth.uid() OR public.has_role(auth.uid(),'admin'))
WITH CHECK (true);

CREATE POLICY "matches_service_full"
ON equity_brain.matches FOR ALL TO service_role USING(true) WITH CHECK(true);
```

### D) View `matches_enriched`

```sql
CREATE OR REPLACE VIEW equity_brain.matches_enriched
WITH (security_invoker = true) AS
SELECT
  m.id, m.match_score, m.status, m.prioridade, m.assigned_bdr, m.computed_at,
  m.reasons, m.ai_thesis_summary, m.ai_pitch, m.thesis_key,
  c.cnpj, c.razao_social, c.nome_fantasia, c.uf, c.municipio,
  c.setor_ma, c.subsetor_ma, c.cnae_principal, c.cnae_descricao,
  c.data_abertura, c.capital_social, c.qtd_socios, c.has_listing,
  cs.ma_score, cs.vispe_score, cs.sucessao_score,
  b.id AS buyer_id, b.nome AS buyer_nome, b.tipo AS buyer_tipo,
  b.ticket_min, b.ticket_max, b.setores_interesse,
  t.display_name AS thesis_name, t.category AS thesis_category, t.description AS thesis_description
FROM equity_brain.matches m
JOIN equity_brain.companies c ON c.cnpj = m.cnpj
JOIN equity_brain.buyers b    ON b.id = m.buyer_id
JOIN equity_brain.investment_theses t ON t.thesis_key = m.thesis_key
LEFT JOIN equity_brain.company_scores cs ON cs.cnpj = m.cnpj AND cs.is_current = true
WHERE m.is_current = true;

GRANT SELECT ON equity_brain.matches_enriched TO authenticated;
```

---

## 4.2 — Edge Function `match-company`

**Arquivo:** `supabase/functions/match-company/index.ts`

- POST body: `{ cnpj?: string, cnpjs?: string[] }` (até 500 por chamada).
- Auth: admin OR service_role (mesmo padrão de `calculate-scores`).
- Carrega: empresas de `companies_scored`, signals agrupados, todos buyers ativos, buyer_theses ativas, catálogo de teses.
- Calcula `setor_fit / geografia_fit / porte_fit / tese_fit / ma_norm` exatamente como o prompt.
- Limiar: descarta `match_score < 30`.
- Marca `is_current=false` apenas dos cnpjs envolvidos, depois insere novos em chunks.
- Retorna `{ companies_processed, matches_created, top_5 }`.
- Inclui `UF_NEIGHBORS` completo (27 UFs).

## 4.3 — Edge Function `match-buyer`

**Arquivo:** `supabase/functions/match-buyer/index.ts`

- POST body: `{ buyer_id: string, max_companies?: number }` (default 2000, cap 5000).
- Auth: admin OR service_role.
- Filtra `companies_scored` por `setor_ma IN buyer.setores_interesse` e UF (se buyer.ufs preenchido), ordena por `ma_score DESC`, top N.
- Marca matches antigos do buyer `is_current=false`.
- **Reusa lógica scoring inline** (mesmo helper de `match-company` copiado) — sem fetch interno.
- Insere em chunks de 1000.
- Retorna `{ buyer_id, companies_evaluated, total_matches }`.

## 4.4 — Edge Function `match-batch`

**Arquivo:** `supabase/functions/match-batch/index.ts`

- POST body: `{ filter?: { uf?, setor_ma?, min_ma_score? }, limit?: number }` (default 1000, cap 5000).
- Auth: admin OR service_role.
- Seleciona cnpjs de `companies_scored` por filtro, processa em chunks de 200 com o **mesmo helper de scoring inline**.
- Retorna `{ companies_processed, total_matches, chunks }`.

---

## ✅ Verificação após apply

```sql
-- Estrutura
\d equity_brain.matches
SELECT column_name FROM information_schema.columns
WHERE table_schema='equity_brain' AND table_name='companies_scored' AND column_name='porte';
-- esperado: 1 linha

-- Após rodar match-buyer p/ buyers ISP seedados:
SELECT cnpj, razao_social, buyer_nome, thesis_name, match_score, ma_score
FROM equity_brain.matches_enriched
ORDER BY match_score DESC LIMIT 10;
```

```bash
# curl exemplos (admin JWT)
curl -X POST $URL/functions/v1/match-company -H "Authorization: Bearer <ADMIN_JWT>" \
  -H "Content-Type: application/json" -d '{"cnpjs":["..."]}'

curl -X POST $URL/functions/v1/match-buyer -H "Authorization: Bearer <ADMIN_JWT>" \
  -H "Content-Type: application/json" -d '{"buyer_id":"<UUID>"}'

curl -X POST $URL/functions/v1/match-batch -H "Authorization: Bearer <ADMIN_JWT>" \
  -H "Content-Type: application/json" -d '{"filter":{"setor_ma":"isp_telecom","uf":"RS"},"limit":1000}'
```

---

## 📁 Diff resumido

```
+ supabase/migrations/<ts>_equity_brain_matches.sql        (~120 linhas)
+ supabase/functions/match-company/index.ts                (~280 linhas)
+ supabase/functions/match-buyer/index.ts                  (~230 linhas)
+ supabase/functions/match-batch/index.ts                  (~180 linhas)
~ .lovable/plan.md
```

Sem alterações em: schema `public`, código React, `types.ts` (regenerado quando o front consumir).

---

## 🚫 Fora de escopo

- Tela `/admin/equity-brain/matches` (Fase 8).
- Embeddings semânticos para `tese_fit` (Fase 6 com pgvector).
- Cron de re-match diário (Fase 5 — irá ao `EQUITY_BRAIN_CRON.md`).
- Atribuição automática de BDR (Fase 7).

---

## 📌 Notas operacionais

- **Saturação**: com só 5 buyers ISP seedados, espere top matches todos com `match_score 70+` para empresas RS. Esperado — melhora ao cadastrar 30–50 buyers reais.
- **Custo**: `match-batch` em 5M empresas é proibitivo. Sempre filtre. O cron da Fase 5 vai rodar só sobre top 50k de `companies_scored`.
- **Re-match após edição de buyer**: front (Fase 8) deve invocar `match-buyer` automaticamente após salvar buyer.
