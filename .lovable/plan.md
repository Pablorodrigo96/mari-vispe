# Fase 6 — Integração com Claude AI (Sonnet 4)

Implementar **literalmente** o plano da Fase 6 usando Anthropic Claude Sonnet 4 (`claude-sonnet-4-20250514`), conforme você instruiu. Sem substituir por Lovable AI / Gemini.

---

## ⚠️ Pré-requisito bloqueante

`ANTHROPIC_API_KEY` **não está configurada no projeto** (verifiquei via `fetch_secrets` — só existem `LOVABLE_API_KEY`, `STRIPE_SECRET_KEY`, `EXTERNAL_DB_URL`).

Assim que este plano for aprovado, o **primeiro passo da execução** será disparar `add_secret` pedindo a chave (formato `sk-ant-...`, gerada em https://console.anthropic.com/settings/keys → "Create Key"). Só sigo o restante depois que você colar o valor — caso contrário todas as edges retornariam 500 no primeiro `fetch` para `api.anthropic.com`.

---

## 6.1 — Migration `equity_brain.ai_runs`

**Arquivo:** `supabase/migrations/<ts>_equity_brain_ai_runs.sql` (~50 linhas)

Cria tabela de auditoria conforme o prompt, com 1 ajuste já validado nas Fases 4/5:
- **`triggered_by UUID` sem FK para `auth.users`** (Supabase desencoraja FK p/ `auth.users`; mantém consistência com `matches.assigned_bdr` e `opportunities_ready.assigned_bdr`).
- `cnpj`, `buyer_id`, `match_id` também sem FK explícita — evita CASCADE apagando logs históricos quando uma oportunidade é removida.

Schema:
- `id uuid PK DEFAULT gen_random_uuid()`
- `function_name varchar(40) NOT NULL` (`classify_thesis` | `generate_pitch` | `analyze_call`)
- `cnpj varchar(14)`, `buyer_id uuid`, `match_id uuid`
- `model varchar(40) DEFAULT 'claude-sonnet-4-20250514'`
- `prompt_input jsonb`, `raw_response text`, `parsed_output jsonb`
- `tokens_input int`, `tokens_output int`, `cost_usd numeric(10,6)`, `latency_ms int`
- `status varchar(20)` (`success` | `error` | `partial`), `error_message text`
- `created_at timestamptz DEFAULT now()`, `triggered_by uuid`

Indexes: `function_name`, `cnpj`, `created_at DESC`.

RLS:
- `ai_runs_read_admin` → SELECT para admin
- `ai_runs_service` → ALL para `service_role`

## 6.2 — Edge Function `claude-classify-thesis`

**Arquivo:** `supabase/functions/claude-classify-thesis/index.ts` (~180 linhas)

Conforme prompt, com correções operacionais mínimas:
- **CORS** completo (`OPTIONS` + headers em todas as respostas) — o snippet do prompt não tem.
- **Auth**: admin OR `service_role` via `getClaims` (padrão Fases 2/4/5).
- **Modelo**: `claude-sonnet-4-20250514`, `max_tokens: 1024`, endpoint `https://api.anthropic.com/v1/messages`, header `anthropic-version: 2023-06-01`, key via `Deno.env.get("ANTHROPIC_API_KEY")`.
- **System prompt** literal do plano: analista sênior de M&A da Vispe Capital, escolhe entre as 5 teses (`consolidacao_regional` / `sucessao_familiar` / `roll_up_setor` / `aquisicao_carteira` / `ganho_margem_governanca`), retorna JSON `{tese_refinada, summary, confidence, red_flags[]}`.
- **User prompt** monta contexto: razão social, CNPJ, setor M&A, CNAE, localização, idade, capital social, sócios, has_listing, scores M&A/Vispe/Sucessão, lista de signals com pesos, top 3 buyers de `matches_enriched`.
- **Skip** se `existingOpp.ai_thesis_summary` já existe e `force_refresh != true` → retorna `{skipped: true, summary}` sem gastar token.
- **Parse JSON** com `text.replace(/```json|```/g,"").trim()`. Se falhar → `status='partial'`, ainda loga.
- **Updates**:
  - `opportunities_ready.ai_thesis_summary` = `parsed.summary`
  - `matches.ai_thesis_summary` + `ai_confidence` em todos os matches do CNPJ com `is_current=true`
- **Log em `ai_runs`** com tokens reais retornados pela Anthropic (`usage.input_tokens` / `output_tokens`), custo calculado (`input * 3/1M + output * 15/1M`), latência, status.
- Resposta: `{ cnpj, parsed, latency_ms }`.

## 6.3 — Edge Function `claude-generate-pitch`

**Arquivo:** `supabase/functions/claude-generate-pitch/index.ts` (~190 linhas)

Mesmo esqueleto do 6.2, com:
- POST body: `{ cnpj, buyer_id?, channel? }` (`call` | `whatsapp` | `email`, default `call`).
- **System prompt** literal: BDR sênior da Vispe, fórmula 3 passos (credibilidade → insight provocativo → convite), tom respeitoso/direto/executivo, adapta ao canal, retorna JSON `{pitch, abertura_curta, subject?}` (subject só se canal=email).
- User prompt: contexto da empresa + dados do `buyer` específico. Se `buyer_id` passado → busca em `equity_brain.buyers` + tese vinculada via `buyer_theses`. Senão → usa top match de `matches_enriched`.
- **Updates**:
  - `opportunities_ready.ai_pitch` = `parsed.pitch`
  - Se `buyer_id`: `matches.ai_pitch` no match correspondente (filtro `cnpj` + `buyer_id` + `is_current=true`); senão atualiza top match.
- Log em `ai_runs` com `function_name='generate_pitch'`.

## 6.4 — Edge Function `claude-analyze-call` (esqueleto funcional)

**Arquivo:** `supabase/functions/claude-analyze-call/index.ts` (~150 linhas)

Esqueleto pronto para Fase 7:
- POST body: `{ cnpj, call_notes, bdr_id }`.
- **System prompt** literal: analista de CRM, **nunca inventa** (null se não souber), retorna JSON com `intencao_venda` (0..1), `timing_estimado` (`agora` | `6m` | `12m+` | `nao`), `dor_principal` (`sucessao` | `crescimento` | `financeiro` | `gestao` | `societario` | `outra`), `sinais_novos[]` (signal_keys do catálogo), `faturamento_mencionado` (number\|null), `ebitda_mencionado` (number\|null), `followup_recomendado` (texto curto).
- User prompt: contexto mínimo da empresa (razão social, setor, UF, scores) + `call_notes` cru.
- Por ora **só loga em `ai_runs`** (`function_name='analyze_call'`, `triggered_by=bdr_id`) e retorna `{ parsed, latency_ms }` — **não escreve em outras tabelas**. Fase 7 conecta ao feedback loop / criação de signals novos / atualização de status no pipeline.

## 6.5 — pgvector embeddings

**Pulado conforme o próprio plano** ("Recomendação: pule esta seção no MVP"). Faremos quando houver 100+ `call_feedback` acumulados.

---

## 📁 Diff resumido

```
+ supabase/migrations/<ts>_equity_brain_ai_runs.sql           (~50 linhas)
+ supabase/functions/claude-classify-thesis/index.ts          (~180 linhas)
+ supabase/functions/claude-generate-pitch/index.ts           (~190 linhas)
+ supabase/functions/claude-analyze-call/index.ts             (~150 linhas)
~ .lovable/plan.md
```

Sem alterações em: `public` schema, código React, `types.ts`, outras edges, migrations das fases anteriores.

---

## ✅ Verificação após apply

```bash
# 1) classify_thesis em uma empresa real (pegar CNPJ top da Fase 5)
curl -X POST $URL/functions/v1/claude-classify-thesis \
  -H "Authorization: Bearer <ADMIN_JWT>" -H "Content-Type: application/json" \
  -d '{"cnpj":"XXXXXXXXXXXXXX"}'

# 2) generate_pitch
curl -X POST $URL/functions/v1/claude-generate-pitch \
  -H "Authorization: Bearer <ADMIN_JWT>" -H "Content-Type: application/json" \
  -d '{"cnpj":"XXXXXXXXXXXXXX","channel":"whatsapp"}'

# 3) auditoria + custo
SELECT function_name, status, tokens_input, tokens_output, cost_usd, latency_ms
FROM equity_brain.ai_runs ORDER BY created_at DESC LIMIT 10;

SELECT cnpj, ai_thesis_summary, ai_pitch
FROM equity_brain.opportunities_ready
WHERE ai_thesis_summary IS NOT NULL LIMIT 5;
```

---

## 🚫 Fora de escopo

- Batch noturno chamando classify+pitch para top 200/500 (Fase 6.5 / 7).
- Telas admin para visualizar `ai_runs` e custos (Fase 8).
- pgvector embeddings (adiar até 100+ call_feedbacks).
- Fallback para Claude Haiku em chamadas real-time do front (otimização futura).
- Conectar `analyze-call` ao loop de criação de signals novos (Fase 7).

---

## 📌 Notas operacionais

- **Custo Claude Sonnet 4**: ~$3 input / $15 output por 1M tokens. Cada `classify_thesis` ≈ 800 in / 300 out = ~$0.0069. Cada `generate_pitch` ≈ 1000 in / 500 out = ~$0.0105. Top 500/dia: ~$8.
- **Cache implícito**: skip se `ai_thesis_summary`/`ai_pitch` já existem; `force_refresh=true` reprocessa.
- **JSON malformado** (~5% das chamadas): cai em `status='partial'`, loga `raw_response` para debug.
- **Latência típica** Sonnet 4: 3–6s. OK para batch noturno; ruim para chamadas síncronas no front. Otimização futura: Claude Haiku para real-time.
