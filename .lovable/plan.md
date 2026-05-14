## Plano de correção — Security Advisor

Validei o schema antes de planejar. Pontos de fato relevantes:

- A view `public.public_buyer_profiles` **já existe** e expõe apenas campos não-sensíveis (sem email/whatsapp). Não precisa criar VIEW nova — basta apontar o front pra ela.
- `buyer_profiles` **não tem coluna `advisor_id`** — o dono é `user_id`. Já existe policy "Owners can view own buyer profiles" (`user_id = auth.uid()`) e admin policy. Logo a remoção da policy pública é segura.
- Em `whatsapp_messages` o dono é `advisor_id` (confirmado nos hooks). Vamos restringir Realtime via `realtime.messages` por topic = `wa:{advisor_id}`.
- `analytics_sessions.session_key` já é único e gerado client-side — vou trocar UPDATE público por UPDATE via service-role no edge `track-event` (que já faz upsert) e remover a policy aberta.
- A maioria das funções SECURITY DEFINER já tem `SET search_path` — os warnings da Supabase são genéricos (1 entry por categoria). Vou aplicar `REVOKE EXECUTE ... FROM anon` em funções sensíveis (ex.: `eb_read_advisor_token`, `eb_store_advisor_token`, `bootstrap_cron_secrets_internal`) e garantir `search_path` nas que faltam (auditarei na migration).
- Buckets públicos: `listing-images` e `avatars`. Vou limitar SELECT em `storage.objects` desses buckets a leitura por nome (sem `list`).

---

### 🔴 Fase 1 — Erros críticos

**1. `buyer_profiles` — PII pública**
- DROP policy `Public can view active buyer profiles`.
- Garantir `GRANT SELECT ON public.public_buyer_profiles TO anon, authenticated` (já existe a view).
- Front: trocar `MatchingBuyers.tsx` (linha 67) pra usar `public_buyer_profiles`. `AdminCRM.tsx` e `RegisterBuyer.tsx` continuam na tabela (admin/owner já têm policy).

**2. `api_settings` — leitura aberta a todo logado**
- DROP policy `Anyone authenticated can read api settings`.
- Manter apenas a admin policy existente (`Admins manage api settings`).
- Auditar usos no front: `rg "api_settings"` — se houver leitura cliente-side, mover pra edge function.

**3. `whatsapp_messages` Realtime sem RLS no canal**
- ENABLE RLS em `realtime.messages`.
- Policy: `SELECT` permitido se `topic` casa com `wa:{advisor_id}` onde `advisor_id = auth.uid()` OU `has_role(auth.uid(),'admin')`.
- Conferir/ajustar nome do canal no hook `useAdvisorWhatsAppStatus` para padrão `wa:<advisor_id>`.

**4. `fire-webhook` edge sem auth** (agent_security)
- Adicionar check `auth.getUser()` + `has_role(...,'admin')` no topo do handler. Validar `request_id` pertence ao caller.

**5. `cnpj-db-inspect` edge sem auth** (agent_security)
- Adicionar mesmo gate admin no topo do handler.

### 🟡 Fase 2 — Warnings

**6. `eb_pipeline_transitions`** — DROP policy aberta; criar SELECT só admin/advisor.
**7. `eb_pipeline_stages`** — manter SELECT autenticado (é config de UI sem PII), documentar no security-memory como aceito.
**8. `analytics_sessions` UPDATE aberto** — DROP policy; deixar apenas insert/upsert via edge `track-event` (service role).
**9. `track-event` user_id spoof** — derivar `user_id` de `auth.getUser()` quando houver Authorization; ignorar body.
**10. `whatsapp-webhook` mock sem assinatura** — em produção, retornar 403 se `META_APP_SECRET` ausente.
**11. SECURITY DEFINER executável por anon/authenticated** — `REVOKE EXECUTE ... FROM anon, authenticated` nas funções internas (lista na migration); manter apenas as chamadas pelo front.
**12. Function search_path mutable** — adicionar `SET search_path = public, pg_temp` nas funções que ainda não têm.
**13. Extension in public** — mover extensões de `public` para schema `extensions` (vou listar quais existem na migration; geralmente `pg_trgm`, `unaccent`, `vector`).
**14. Public bucket allows listing** — restringir SELECT em `storage.objects` para `listing-images` e `avatars` exigindo `name IS NOT NULL` e bloqueando `list` (policies separadas por bucket).

### 🔵 Fase 3 — Info

**15. RLS enabled no policy** — listar tabelas e ou criar policy mínima ou documentar como service-role only.

---

### Entregáveis

1. **1 migration SQL** consolidada com todas as mudanças (ordem: Fase 1 → 2 → 3).
2. Edits front:
   - `src/pages/MatchingBuyers.tsx` → usar `public_buyer_profiles`.
   - `supabase/functions/fire-webhook/index.ts` → gate admin.
   - `supabase/functions/cnpj-db-inspect/index.ts` → gate admin.
   - `supabase/functions/track-event/index.ts` → derivar `user_id` do JWT.
   - `supabase/functions/whatsapp-webhook/index.ts` → 403 se `META_APP_SECRET` ausente.
3. Update `@security-memory` com decisões aceitas (ex.: `eb_pipeline_stages` aberto, `public_buyer_profiles` view pública).
4. Rodar Security Advisor de novo após aplicar e reportar diff.

### Riscos / pontos a confirmar com você antes de codar

- **(a)** Confirmar que posso restringir `eb_pipeline_transitions` a admin+advisor (sem expor pra seller comum). OK?
- **(b)** Em `whatsapp-webhook`: posso assumir que produção sempre terá `META_APP_SECRET`? Se hoje está rodando em mock, vai parar de aceitar inbound até você setar o secret.
- **(c)** Mover extensions de `public` pra `extensions` pode quebrar funções que referenciam tipos sem schema qualificado (ex.: `vector`). Vou auditar antes — se houver risco, mantenho e marco como aceito na security-memory.

Aprovando, sigo direto pra migration + edits.