# Testes unitários para `apiTrack.ts`

Criar suíte de testes Deno cobrindo cálculo de custo, total de tokens e cenários nulos para todos os providers (Lovable AI, Anthropic, Perplexity) e APIs externas (Stripe/BrasilAPI/CNPJ etc.) — sem depender de rede ou Supabase.

## Estratégia

`apiTrack.ts` hoje mistura lógica pura (cálculo de custo, soma de tokens, detecção de provider) com I/O (insert no Supabase, fetch HTTP). Para testar de forma confiável vamos:

1. **Extrair helpers puros exportáveis** em `apiTrack.ts` (sem alterar comportamento):
   - `computeCostUsd(pricing, inputTokens, outputTokens, requestCount)` — cálculo isolado em USD.
   - `resolveTotalTokens(total, input, output)` — replica a expressão `(total ?? (in+out)) || null` que já causou bug de precedência.
   - `detectProvider(url)` — extrai a lógica do `trackedAIFetch` (lovable_ai / anthropic / perplexity / unknown + embedding/llm).
   - `extractUsage(usage)` — normaliza payloads OpenAI-style (`prompt_tokens`/`completion_tokens`) e Anthropic-style (`input_tokens`/`output_tokens`).

2. **Refatorar `logApiUsage` e `trackedAIFetch`** para usar esses helpers (zero mudança comportamental).

3. **Criar `supabase/functions/_shared/apiTrack.test.ts`** com testes Deno cobrindo todos os cenários abaixo. Não toca rede nem DB.

4. **Teste de integração leve** com `fetch` mockado via stub global para validar que `trackedAIFetch` retorna o `Response` original (clone funcionando, body do caller preservado) — usando `stub` de `globalThis.fetch`.

## Cobertura de testes

### `computeCostUsd`
- Pricing `null` → retorna `0`.
- Lovable AI Gemini 2.5 Flash (`$0.075` in / `$0.30` out por 1M) com 1.000.000 in + 500.000 out → `0.075 + 0.15 = 0.225`.
- Anthropic Claude 3.5 Sonnet (`$3.00` / `$15.00`) com 10k in + 2k out → `0.03 + 0.03 = 0.06`.
- Perplexity Sonar (`flat_per_call_usd: 0.005` + tokens) → soma flat + variável.
- Tokens nulos (`null`/`undefined`) → tratados como 0, custo só do flat fee.
- `requestCount` default = 1; passar 5 multiplica o flat fee.
- Pricing com strings (vindo do Supabase como `numeric`) — `"3.00"` é convertido via `Number()`.

### `resolveTotalTokens` (regressão direta do bug de precedência `??` + `||`)
- `(total=300, in=100, out=200)` → `300`.
- `(total=null, in=100, out=200)` → `300` (somou).
- `(total=undefined, in=undefined, out=undefined)` → `null` (zero coerced).
- `(total=0, in=0, out=0)` → `null` (zero é falsy → vira null, comportamento atual preservado).
- `(total=null, in=0, out=50)` → `50`.
- `(total=null, in=null, out=null)` → `null`.

### `detectProvider`
- `https://ai.gateway.lovable.dev/v1/chat/completions` → `lovable_ai`/`llm`.
- `https://ai.gateway.lovable.dev/v1/embeddings` → `lovable_ai`/`embedding`.
- `https://api.anthropic.com/v1/messages` → `anthropic`/`llm`.
- `https://api.perplexity.ai/chat/completions` → `perplexity`/`llm`.
- `https://api.stripe.com/v1/customers` → `unknown`/`llm` (caso o helper seja chamado fora do escopo de IA).

### `extractUsage`
- Payload OpenAI: `{prompt_tokens:10, completion_tokens:20, total_tokens:30}` → `{10,20,30}`.
- Payload Anthropic: `{input_tokens:15, output_tokens:25}` (sem total) → `{15,25,40}`.
- Payload vazio `{}` → `{null,null,null}`.
- Payload `null` → `{null,null,null}`.
- Payload Perplexity sem `total_tokens`: `{prompt_tokens:50, completion_tokens:100}` → `{50,100,150}`.

### `trackedAIFetch` (integração com `fetch` stubado)
- Stub em `globalThis.fetch` que retorna 200 + JSON com `usage`. Chamada deve:
  - Retornar `Response` legível pelo caller (`.json()` funciona — clone preservou body).
  - Detectar provider correto a partir da URL.
- Stub que retorna 429 → resposta original repassada com status 429.
- Stub que lança erro de rede → `trackedAIFetch` re-lança a exceção.
- URL com `/embeddings` → categoria `embedding` no contexto (validado via spy do helper `detectProvider`).

## Detalhes técnicos

### Arquivo de testes
`supabase/functions/_shared/apiTrack.test.ts`:
- Convenção Deno: `Deno.test("nome", () => {...})`.
- Imports: `assertEquals`, `assertAlmostEquals`, `assertRejects` de `https://deno.land/std@0.224.0/assert/mod.ts`.
- `stub`/`restore` de `globalThis.fetch` via `https://deno.land/std@0.224.0/testing/mock.ts`.
- Para `trackedAIFetch`, stub também retorna sucesso silencioso para o insert no `_admin` (já é fire-and-forget e qualquer falha é só `console.error` — não interfere).
- Variáveis `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` setadas via `Deno.env.set` no topo do arquivo se não existirem (evita o `!` de non-null assertion explodir no import).

### Estrutura de seeds de pricing (in-memory, não toca DB)
Usados apenas como input para `computeCostUsd`:
```ts
const PRICING = {
  lovable_gemini_flash: { input_per_1m_usd: 0.075, output_per_1m_usd: 0.30, flat_per_call_usd: 0 },
  anthropic_sonnet:     { input_per_1m_usd: 3.00,  output_per_1m_usd: 15.00, flat_per_call_usd: 0 },
  perplexity_sonar:     { input_per_1m_usd: 0.20,  output_per_1m_usd: 0.20,  flat_per_call_usd: 0.005 },
  stripe_flat:          { input_per_1m_usd: 0,     output_per_1m_usd: 0,     flat_per_call_usd: 0 },
  brasilapi_free:       { input_per_1m_usd: 0,     output_per_1m_usd: 0,     flat_per_call_usd: 0 },
  cnpjws:               { input_per_1m_usd: 0,     output_per_1m_usd: 0,     flat_per_call_usd: 0.01 },
};
```

### Mudanças mínimas em `apiTrack.ts`
- Adicionar 4 funções puras exportadas no topo (linhas ~46).
- Substituir o bloco interno de cálculo dentro de `logApiUsage` por `computeCostUsd(...)` + `resolveTotalTokens(...)` (idempotente, mesmo resultado).
- Substituir o bloco de detecção dentro de `trackedAIFetch` por `detectProvider(url)` e a leitura de usage por `extractUsage(data?.usage)`.
- Sem mudança em `callLovableAI`, `callAnthropic`, `callPerplexity`, `trackExternalCall`.

### Como rodar
Via tool `supabase--test_edge_functions` com `{ "functions": ["_shared"] }` (ou sem filtro). Os testes não exigem credenciais reais nem rede.

## Arquivos afetados
- `supabase/functions/_shared/apiTrack.ts` — adicionar helpers puros + refatorar 2 trechos para usá-los.
- `supabase/functions/_shared/apiTrack.test.ts` — **novo**, ~25 testes cobrindo os 4 helpers + integração com fetch stubado.
