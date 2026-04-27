# Equity Brain — Fase 1.5 a 1.7: ingestão, sinais e view enriquecida

## Objetivo

Fechar a Fase 1 do Equity Brain com:
1. **Edge function `sync-companies-from-cnpj`** — popula `equity_brain.companies` + `company_partners` a partir da base nacional da Receita Federal (`EXTERNAL_DB_URL`).
2. **Edge function `compute-signals`** — gera sinais determinísticos em `equity_brain.company_signals` a partir das regras do catálogo.
3. **View `equity_brain.companies_enriched`** — consolida companies + signals (JSONB) + listing para leitura única do front e dos scores.

---

## ⚠️ Correção crítica vs. prompt original

O prompt assume que `EXTERNAL_DB_URL` é uma **API REST** (`fetch(${EXTERNAL_DB_URL}/companies?...)`). **Não é.** Verifiquei `supabase/functions/national-search/index.ts` e confirmei:

- `EXTERNAL_DB_URL` é uma **connection string Postgres** (usada com `deno-postgres`, mesmo padrão da edge `national-search` que já roda em produção).
- O schema real é o **layout oficial da Receita Federal**: tabelas `empresas`, `estabelecimentos`, `socios` — **não** uma tabela única `companies`.
- Não existe `EXTERNAL_DB_TOKEN` na lista de secrets.

**Adapto o `sync-companies-from-cnpj`** para conectar via `deno-postgres` exatamente como o `national-search`, fazer JOIN entre `estabelecimentos + empresas + socios` e mapear para `equity_brain.companies`. O resto do pipeline (filtros ATIVA/idade≥5, mapeamento CNAE→setor, upsert, retorno JSON) fica idêntico ao prompt.

---

## 1.5 — Edge function `sync-companies-from-cnpj`

**Arquivo novo:** `supabase/functions/sync-companies-from-cnpj/index.ts`

- `POST` com body `{ uf?: string, cnae_prefixes?: string[], limit?: number, offset?: number }` (default `limit=1000, offset=0`, máx 5000).
- Conecta no `EXTERNAL_DB_URL` via `deno-postgres`.
- Query base com JOIN `estabelecimentos + empresas`, filtrando `situacao_cadastral='02'` (ATIVA na codificação RF) e `data_inicio_atividade <= CURRENT_DATE - INTERVAL '5 years'`. Filtros opcionais por `uf` e `cnae_fiscal_principal LIKE ANY(prefixes)`.
- Segunda query para sócios: `SELECT ... FROM socios WHERE cnpj_basico = ANY($cnpj_basicos)`.
- Mapeamentos:
  - `situacao_cadastral`: `'02'→'ATIVA'`, `'03'→'SUSPENSA'`, `'04'→'INAPTA'`, `'08'→'BAIXADA'`, `'01'→'NULA'`.
  - `porte_empresa`: `'01'→'ME'`, `'03'→'EPP'`, `'05'→'DEMAIS'`; reclassifica para `MEDIA` quando `capital_social > 1_000_000`.
  - `identificador_socio`: `1→'PJ'`, `2→'PF'`, `3→'PF'`.
- Lookup `setor_ma`/`subsetor_ma` via `equity_brain.cnae_setor_map` em memória.
- Marca `has_listing=true` e preenche `listing_id` cruzando com `public.listings.cnpj` no lote.
- **UPSERT** em `equity_brain.companies` com `onConflict: 'cnpj'`.
- **Sócios:** `DELETE WHERE cnpj = ANY($cnpjs_do_lote)` + `INSERT` em massa (idempotência por refresh do snapshot).
- Retorna `{ imported, skipped, partners_imported, errors }`.
- **Auth:** `verify_jwt` no default (true) — operação cara, só admin/service role.

---

## 1.6 — Edge function `compute-signals`

**Arquivo novo:** `supabase/functions/compute-signals/index.ts`

Implementação fiel ao prompt (TS puro sobre cliente Supabase, sem IA):
- Body: `{ cnpjs?: string[], filter?: { uf?: string, setor_ma?: string }, limit?: number }` (default 500).
- Query: `supabase.schema("equity_brain").from("companies").select("*, company_partners(*)")` com filtros opcionais.
- 11 regras determinísticas: idade da empresa (15+/10–15), situação ativa, sócios PF / único / família (mesmo último sobrenome), idade do sócio (usa `company_partners.idade_estimada` quando existir — fica nulo na maioria por ora, conforme aceito como "imprecisão temporária"), setor consolidando/recorrente, porte atrativo, capital alto, intenção de venda explícita, governança baixa, oportunidade CFO Vispe.
- `signal_value` numérico relevante; `signal_text` descritivo; `weight` do catálogo; `source='derived_sql'`; `confidence=1.0`.
- **UPSERT** com `onConflict: 'cnpj,signal_key'` (UNIQUE já criado na Fase 1.3).
- **`regiao_com_compradores_ativos`**: código preparado mas comentado — depende da Fase 3.
- Retorna `{ companies, signals }`.

---

## 1.7 — View `equity_brain.companies_enriched` (migration)

```sql
CREATE OR REPLACE VIEW equity_brain.companies_enriched
WITH (security_invoker = true) AS
SELECT
  c.*,
  COALESCE(
    (SELECT jsonb_object_agg(
        s.signal_key,
        jsonb_build_object('value', s.signal_value, 'weight', s.weight,
                           'text', s.signal_text, 'confidence', s.confidence))
     FROM equity_brain.company_signals s WHERE s.cnpj = c.cnpj),
    '{}'::jsonb
  ) AS signals,
  (SELECT COUNT(*) FROM equity_brain.company_signals s WHERE s.cnpj = c.cnpj) AS signal_count,
  (SELECT COALESCE(SUM(s.weight), 0) FROM equity_brain.company_signals s WHERE s.cnpj = c.cnpj) AS signal_weight_sum,
  l.title AS listing_title,
  l.asking_price AS listing_asking_price,
  l.created_at AS listing_created_at
FROM equity_brain.companies c
LEFT JOIN public.listings l ON l.id = c.listing_id;

GRANT SELECT ON equity_brain.companies_enriched TO authenticated;
```

**Segurança:** views Postgres por padrão executam como o dono e **ignoram RLS** das tabelas base. Como `companies`/`company_signals` têm RLS restrito (admin/advisor/contador parceiro), uso `WITH (security_invoker = true)` (Postgres 15+, suportado no Supabase) para respeitar o RLS das tabelas base. Sem isso, qualquer authenticated leria dados sensíveis via view.

---

## Verificação operacional após apply

1. Deploy automático das 2 edges.
2. Curl de teste do sync (JWT admin):
   ```bash
   curl -X POST https://eiprjgotjruiutztjavp.functions.supabase.co/sync-companies-from-cnpj \
     -H "Authorization: Bearer <admin_jwt>" -H "Content-Type: application/json" \
     -d '{"cnae_prefixes":["6190"],"uf":"RS","limit":1000}'
   ```
3. `SELECT COUNT(*) FROM equity_brain.companies;` → ≈1000.
4. `SELECT COUNT(*) FROM equity_brain.company_partners;` → variável.
5. Curl do compute-signals: `{"filter":{"setor_ma":"isp_telecom"},"limit":1000}`.
6. `SELECT cnpj, razao_social, signal_count, signal_weight_sum FROM equity_brain.companies_enriched ORDER BY signal_weight_sum DESC LIMIT 10;`

---

## 📁 Diff resumido

```
+ supabase/functions/sync-companies-from-cnpj/index.ts                  (novo, ~180 linhas)
+ supabase/functions/compute-signals/index.ts                           (novo, ~140 linhas)
+ supabase/migrations/<ts>_equity_brain_companies_enriched_view.sql     (novo, ~25 linhas)
```

Sem alterações em `supabase/config.toml`, schema `public`, edges existentes, ou `types.ts` (regenerado depois na Fase 2 quando o front consumir a view).

---

## 🚫 Fora de escopo

- UI React em `/equity-brain/*` (fase de UI).
- Tabela `equity_brain.buyers` e o sinal `regiao_com_compradores_ativos` ativo (Fase 3).
- Inferência de idade do sócio via IA (Fase 7).
- Cron schedule do sync via `pg_cron` (deixo pronto para ativar quando você pedir).