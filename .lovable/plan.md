# Diagnóstico do erro "Drenar fila agora"

Após deploy das edge functions novas (`process-event`, `drain-events-bulk`, `embed-signal`, `feedback-from-call`, `setup-equity-brain-crons`), inspecionei a fila e identifiquei **4 problemas reais** — não basta redeploy:

## O que está acontecendo

1. **846 eventos pendentes** em `equity_brain.events` (quase todos `buyer.thesis_added`).
2. Ao rodar `process-event` manualmente: **100/100 eventos falharam com `match-buyer 401: {"error":"Unauthorized"}`**.
3. `drain-events-bulk` retorna **non-2xx** porque cada batch leva ~12s × 30 iterações = excede timeout do gateway.
4. O painel "Fila de eventos (Fase 7)" mostra `unprocessed: 0` mesmo com 846 eventos — está consultando tabela errada.
5. Warning no console: `Badge` não suporta refs (Radix Tabs reclama).

## Causa raiz do 401

Todas as functions chamadas internamente (`match-buyer`, `match-company`, `calculate-scores`, `embed-signal`, `claude-generate-pitch`) validam auth com `supabase.auth.getClaims(token)`. Esse método valida JWT contra o JWKS atual — mas a `SUPABASE_SERVICE_ROLE_KEY` é uma JWT legada e em alguns casos `getClaims` retorna `claims=null`, fazendo o check cair em "Unauthorized". O `match-buyer` invocado direto com auth admin funciona (200), mas service_role falha.

# Correções

## 1. Auth resiliente para service_role (5 functions)

Em `match-buyer`, `match-company`, `calculate-scores`, `embed-signal`, `claude-generate-pitch`: adicionar **fallback determinístico** comparando o bearer token diretamente com `SUPABASE_SERVICE_ROLE_KEY` antes de tentar `getClaims`. Padrão:

```ts
const token = authHeader.replace("Bearer ", "");
if (token === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) return { ok: true };
// ... fallback existente para getClaims (usuários admin)
```

Aplicar o mesmo no `process-event` e `drain-events-bulk` por consistência.

## 2. Drain assíncrono (sem timeout do gateway)

`drain-events-bulk` hoje processa síncrono e estoura 150s. Mudar para padrão **fire-and-forget**:
- Retornar 202 imediatamente com um `job_id`.
- Usar `EdgeRuntime.waitUntil(...)` para iterar `process-event` em background.
- Persistir progresso numa tabela leve `equity_brain.drain_jobs` (id, started_at, finished_at, totals jsonb, status).
- Reduzir `MAX_ITERATIONS` para 20 e adicionar **delay 200ms** entre iterações (para evitar rate limit de 50/s do gateway que apareceu nos logs).

Frontend faz polling (a cada 2s) na tabela `drain_jobs` via Supabase realtime ou query simples.

## 3. RPC para stats da fila

Criar função `public.eb_event_queue_stats()` SECURITY DEFINER que retorna `{unprocessed, errors, by_type[]}` lendo de `equity_brain.events`. O componente já tem fallback, mas hoje o fallback chama `eb_events` (nome inexistente) — também atualizar `EventQueueHealthCard` para usar a RPC + remover queries diretas a `eb_events`.

## 4. Fix Badge forwardRef

Converter `src/components/ui/badge.tsx` para `React.forwardRef<HTMLDivElement, BadgeProps>` — elimina o warning quando Radix Tabs/Tooltip envolve Badges.

# Arquivos afetados

**Edge functions (modificar auth):**
- `supabase/functions/match-buyer/index.ts`
- `supabase/functions/match-company/index.ts`
- `supabase/functions/calculate-scores/index.ts`
- `supabase/functions/embed-signal/index.ts`
- `supabase/functions/claude-generate-pitch/index.ts`
- `supabase/functions/process-event/index.ts`
- `supabase/functions/drain-events-bulk/index.ts` (refatorado para fire-and-forget)

**Migration:**
- Tabela `equity_brain.drain_jobs` (id uuid, started_at, finished_at, status, totals jsonb)
- Função `public.eb_event_queue_stats()` SECURITY DEFINER

**Frontend:**
- `src/components/ui/badge.tsx` (forwardRef)
- `src/components/equity-brain/EventQueueHealthCard.tsx` (usar RPC + polling de drain_jobs)

# Validação pós-deploy

Após implementar, vou:
1. Redeployar as 7 functions.
2. Chamar `process-event` direto e confirmar `success > 0` (esperado: drenar `buyer.thesis_added` reais).
3. Disparar `drain-events-bulk` pela UI e confirmar progresso na tabela `drain_jobs`.
4. Inserir um signal teste e validar que `signal.embed_pending` vira `embedding` populado em `company_signals`.
5. Postar um `feedback-from-call` "qualified" e validar que `next_pitch` é gravado.

Posso começar?
