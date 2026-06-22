# Auditoria — botão "Começar diagnóstico" trava em loading

## Causa raiz (achei)

As 4 edge functions do Equity Planner importam de um módulo **que não existe**:

```ts
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
```

Esse subpath `/cors` nunca existiu no `@supabase/supabase-js`. Quando o frontend chama `supabase.functions.invoke("equity-planner-classify"|"…-compute")`:

1. A função falha no **boot** (import error) — por isso não há logs em `equity-planner-classify` (nem chega a executar).
2. O preflight `OPTIONS` retorna erro/timeout, mas o `supabase-js` no browser **não tem timeout configurado** no `invoke`.
3. Resultado: o botão fica eternamente com spinner ("Analisando…" no step 3 → 4, ou "Gerando…" no step 5).

Arquivos afetados:
- `supabase/functions/equity-planner-classify/index.ts`
- `supabase/functions/equity-planner-compute/index.ts`
- `supabase/functions/equity-planner-extract/index.ts`
- `supabase/functions/equity-planner-buyer-letter/index.ts`

## Bug secundário (warning no console)

`src/pages/EquityPlannerNew.tsx:63-66` chama `navigate()` durante render (anti-pattern do React Router). Não trava nada, mas polui console e pode causar loops em edge cases de auth. Vai junto.

## Correção

**1. Criar `supabase/functions/_shared/cors.ts`** (padrão de todas as outras funções do projeto não-existia para EP):

```ts
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};
```

**2. Trocar o import** nas 4 funções:
```ts
import { corsHeaders } from "../_shared/cors.ts";
```

**3. EquityPlannerNew.tsx** — mover o redirect de auth para `useEffect`:
```tsx
useEffect(() => {
  if (!user) navigate("/auth?next=/equity-planner/novo", { replace: true });
}, [user, navigate]);
if (!user) return null;
```

**4. Bônus defensivo** — adicionar timeout client-side de 60s no `runClassifier` e `handleSubmit` via `AbortController`, para que falhas futuras não travem a UI silenciosamente.

## Fora de escopo

- Sem mudanças no schema, prompts, lógica de classificação/compute, ou UI/visual dos steps.
- Sem mexer no design das páginas (foco no bug; o redesign anterior do hero/landing permanece).
