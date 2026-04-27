# Fase 5 — Warm Layer (Opportunities Ready)

Pré-cozinha o ranking das melhores oportunidades em uma tabela "fast-read" (`opportunities_ready`) para o front abrir em <500ms, com cron diário de refresh.

---

## ⚠️ Correções vs. prompt original

1. **`assigned_bdr REFERENCES auth.users(id)`** — mesma correção da Fase 4: Supabase desencoraja FK para `auth.users`. Uso `UUID` simples sem FK (consistente com `matches.assigned_bdr`).
2. **RLS `profiles p WHERE p.id = auth.uid()`** — `profiles` usa `user_id`, não `id`. Corrijo para `p.user_id = auth.uid()`.
3. **View `opportunities_public` sem `security_invoker`** — sem isso, a view roda com privilégios do dono e burla RLS subjacente. Adiciono `WITH (security_invoker = true)`.
4. **GUCs `app.settings.*` + `ALTER DATABASE`** — não funciona no Supabase gerenciado (requer superuser). Sigo o padrão do projeto (ver `docs/EQUITY_BRAIN_CRON.md` da Fase 2): documento o snippet `pg_cron` com URL hardcoded e placeholder `<SERVICE_ROLE_KEY>`, para o admin executar manualmente. **Não vai em migration** (vazaria service_role_key em remix).
5. **Possível duplicidade no upsert** — `matches_enriched` traz múltiplas linhas por cnpj (uma por buyer×tese). Garanto dedup por cnpj antes do upsert (evita "ON CONFLICT cannot affect row a second time").
6. **Auth da edge function** — sigo o padrão Fase 2/4: admin OR service_role via `getClaims`.
7. **Preservação de pipeline** — upsert envia apenas colunas de snapshot/computed; `status` e `assigned_bdr` ficam intactos em registros existentes.

---

## 5.1 — Migration: `opportunities_ready` + view pública

**Arquivo:** `supabase/migrations/<ts>_equity_brain_opportunities_ready.sql`

- Tabela `equity_brain.opportunities_ready` (PK `cnpj`, FK para `companies`).
- Snapshot de empresa + scores + best thesis + `top_buyers JSONB` (até 3) + `default_pitch` + `ai_pitch` (null por ora) + `bubble_size`/`bubble_color` para grafo + `status`/`assigned_bdr` para pipeline.
- Indexes: `(setor_ma, uf)`, `ma_score DESC`, `bubble_color`, `status`, parcial em `assigned_bdr`.
- RLS: read para admin/advisor/partner_accountant; update para `assigned_bdr` ou admin; full para service_role.
- View `equity_brain.opportunities_public` com `security_invoker = true`, ofusca razão social quando `ma_score < 70` ("Empresa #XXXX"). GRANT SELECT para anon e authenticated.

## 5.2 — Edge Function `refresh-opportunities`

**Arquivo:** `supabase/functions/refresh-opportunities/index.ts` (~200 linhas)

- POST body: `{ setor_ma?, uf?, top_n? }` (default 50000, cap 100000).
- Auth: admin OR service_role via `getClaims` (padrão Fase 2/4).
- Lê `matches_enriched` ordenado por `match_score DESC`, paginado em chunks de 1000 via `range()` (PostgREST limita a 1000 por request), até atingir `top_n` cnpjs distintos OU 200k linhas processadas.
- Carrega catálogo `investment_theses` uma vez para `default_pitch` via template (`{idade_empresa}`, `{regiao}`, `{municipio}`, `{setor}`, `{qtd_compradores}`, `{comprador}`).
- Helpers:
  - `colorFor(score)`: ≥80 'gold', ≥60 'blue', ≥40 'cyan', else 'gray'.
  - `sizeFor(score)`: `Math.round(8 + (score/100)*32)`.
- Para cada cnpj: agrega top 3 matches → `top_buyers` JSONB; usa o top 1 para `best_thesis_*` e contexto do template.
- Dedup final por cnpj.
- UPSERT em chunks de 1000 com `onConflict: "cnpj"`, **sem enviar `status`/`assigned_bdr`** (preserva pipeline).
- Retorna `{ refreshed, distinct_cnpjs, sample: top 3 }`.

## 5.3 — Documentação do cron

**Arquivo:** atualizar `docs/EQUITY_BRAIN_CRON.md` adicionando seção "Refresh diário de opportunities":

```sql
SELECT cron.schedule(
  'refresh-opportunities-daily',
  '0 6 * * *',  -- 06:00 UTC = 03:00 BRT
  $$
  SELECT net.http_post(
    url := 'https://eiprjgotjruiutztjavp.functions.supabase.co/refresh-opportunities',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer <SERVICE_ROLE_KEY>"}'::jsonb,
    body := '{"top_n":50000}'::jsonb
  );
  $$
);
```

Inclui inspeção (`cron.job_run_details`) e desativação (`cron.unschedule`). Snippet roda manualmente — não em migration porque contém `service_role_key`.

---

## ✅ Verificação após apply

```sql
\d equity_brain.opportunities_ready
SELECT COUNT(*) FROM equity_brain.opportunities_ready;
SELECT bubble_color, COUNT(*) FROM equity_brain.opportunities_ready GROUP BY 1;
SELECT cnpj, razao_social, ma_score, best_thesis_name, buyers_count, bubble_color
FROM equity_brain.opportunities_ready ORDER BY ma_score DESC NULLS LAST LIMIT 10;
SELECT display_name, uf, ma_score, bubble_color FROM equity_brain.opportunities_public LIMIT 10;
```

```bash
curl -X POST $URL/functions/v1/refresh-opportunities \
  -H "Authorization: Bearer <ADMIN_JWT>" -H "Content-Type: application/json" \
  -d '{"setor_ma":"isp_telecom","uf":"RS","top_n":1000}'
```

---

## 📁 Diff resumido

```
+ supabase/migrations/<ts>_equity_brain_opportunities_ready.sql   (~70 linhas)
+ supabase/functions/refresh-opportunities/index.ts                (~200 linhas)
~ docs/EQUITY_BRAIN_CRON.md  (acrescenta seção do refresh diário)
~ .lovable/plan.md
```

Sem alterações em: `public` schema, código React, `types.ts`, outras edges.

---

## 🚫 Fora de escopo

- `ai_pitch` enriquecido por LLM (Fase 6 com Lovable AI / Gemini).
- Tela `/admin/equity-brain/opportunities` (Fase 8).
- Atribuição automática de BDR (Fase 7).
- Ativação efetiva do cron (admin executa snippet quando quiser).

---

## 📌 Notas operacionais

- **Preserva pipeline**: upsert não toca em `status`/`assigned_bdr` de registros existentes.
- **Custo**: sempre filtre (`setor_ma`/`uf`) ou limite `top_n`. Cron diário roda com 50k.
- **Saturação de cor**: com poucos buyers seedados, espere distribuição enviesada para gold/blue. Calibra quando crescer a base.