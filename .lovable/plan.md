# Auditoria Equity Planner — Diagnóstico + Plano de Correção

## Diagnóstico (resumo)

Auditoria completa cobriu 4 páginas, 9 componentes, 8 edge functions, 18 tabelas + RLS, 3 RPCs e cruzamento com as Waves 1–9 documentadas.

### 🔴 Críticos (4)
1. **Edge functions sem checagem de ownership**: `equity-planner-compute`, `classify`, `buyer-letter`, `deepdive-questions`, `deepdive-compile` e `annual-plan-build` usam `service_role` mas nunca comparam o `user_id` do JWT com o `user_id` do `assessmentId`. Qualquer usuário autenticado pode **sobrescrever o diagnóstico/carta/iniciativas de outro usuário** forjando uma chamada HTTP.
2. **`equity-planner-compute` não-atômico**: 5 DELETEs + 5 INSERTs em round-trips separados sem transação. Crash entre eles deixa o assessment com dados parciais; `status='computed'` pode coexistir com dim_scores zerados.
3. **`intakeText` sem `maxLength`** no modo meeting_paste — ata gigante quebra o prompt do Claude (custo + erro `context_length_exceeded`).
4. **Constantes divergentes**: `ARQUETIPOS_LABEL` lista 5 arquétipos, banco tem 3 seedados → `projeto_obra_estruturado` e `produto_ip` retornam `undefined` no UI quando classificados.

### 🟠 Altos (7)
- `EquityPlannerReport.tsx` e `Assessment.tsx` sem `useAuth`/redirect → anon user trava em spinner.
- Sleep hardcoded de 8 s pós-compute aguardando market scan.
- `equity_progress_log` sem GRANT INSERT (ok hoje, mas frágil para futuro).
- Wizard sem validação entre steps (avança vazio até o step 5).
- Race condition: market scan dispara antes do `draftAssessmentId` existir; re-link depende de CNPJ informado.
- `EquityDocsUpload` invisível antes do step 5 (porque `ensureDraft` só roda no compute).
- Waterfall de 3 camadas sequenciais carregando o Assessment (~10 round-trips).

### 🟡 Médios (8)
- `equity_dimension_benchmarks` / `equity_comps_benchmarks` com policy `USING (true)` → expostos com anon key.
- Advisor com `FOR ALL` em todas as tabelas filhas → pode escrever em assessment de qualquer user.
- "Re-medir" envia `JSON.stringify(raw_intake)` quando não há `meetingText` → degrada qualidade.
- "Baixar PDF" usa `window.print()` (não é PDF real).
- Promote-to-mandate funciona por coincidência da substring match no erro.
- Nenhum cache de prompt no Anthropic (paga input ~8–12k tokens em toda chamada).
- Sem rate limit / quota de compute por user.
- `equity_annual_plan.company_id NOT NULL` sem FK → orfãos possíveis.

### Wave coverage
Waves 1–9 todas implementadas. Lacunas: PDF é só print, fallback determinístico silencioso, 2 arquétipos referenciados sem seed.

---

## Plano de correção (3 ondas)

### Onda A — Segurança & Integridade (urgente, ~1 dia)
1. Criar `supabase/functions/_shared/equityAuth.ts` com `requireAssessmentOwner(req, assessmentId, supabaseAdmin)` — extrai JWT, valida `auth.getUser()`, busca `equity_assessments.user_id` e compara (libera para `admin`/`advisor`).
2. Aplicar em: `equity-planner-compute`, `equity-planner-classify`, `equity-planner-buyer-letter`, `equity-deepdive-questions`, `equity-deepdive-compile`, `equity-annual-plan-build`. Retornar 403 em mismatch.
3. Criar RPC PL/pgSQL `equity_compute_persist(p_assessment_id, p_dim_rows jsonb, p_inits jsonb, p_buyers jsonb, p_val jsonb, p_bridge jsonb, p_progress jsonb)` que faz DELETE+INSERT em uma transação. Compute passa a chamar esse RPC em vez de 10 statements.
4. Migration: trocar `USING (true)` por `USING (auth.uid() IS NOT NULL)` em `equity_dimension_benchmarks` e `equity_comps_benchmarks`. Restringir advisor a SELECT (manter INSERT/UPDATE só para owner+admin).
5. Validação backend em compute: `if (intakeText.length > 50000) return 400`.

### Onda B — UX & Confiabilidade (~1 dia)
6. `EquityPlannerNew.tsx`: `<Textarea maxLength={15000}>` no meeting_paste; trocar `setTimeout(8000)` por toast não-bloqueante e navegar imediatamente; chamar `ensureDraft` ao entrar no step 4 (libera upload de docs antes do compute).
7. Validação por step no wizard: bloquear "Próximo" quando campos obrigatórios do step vazios (razão+setor no step 1, faturamento no step 2, etc.).
8. `EquityPlannerReport.tsx` e `EquityPlannerAssessment.tsx`: adicionar `useAuth` + `<Navigate to="/auth?redirect=...">` quando `!user && !loading`.
9. "Re-medir": se `raw_intake.meetingText` ausente, abrir modal pedindo texto livre de update em vez de mandar JSON cru.
10. Fix do erro: padronizar `msg.includes("assessment_not_computed")` no front (mesmo string exato do RPC).
11. Seed das 2 archetypes faltantes (`projeto_obra_estruturado`, `produto_ip`) com pesos + faixa múltiplo + piso liquidez, ou removê-las de `ARQUETIPOS_LABEL`.

### Onda C — Performance & Estrutural (~1 dia)
12. RPC `equity_assessment_full(p_id)` retornando assessment + dim_scores + valuation + bridge + initiatives + buyers + deepdive + annual_plan + último market_scan em 1 round-trip. Refatorar `EquityPlannerAssessment.tsx` para consumir 1 query.
13. Cache de prompt Anthropic em `equity-planner-compute`: `cache_control: { type: "ephemeral" }` no bloco system (arquétipos + comps + library) — economiza ~70 % do input.
14. Rate limit em compute: bloquear se já houver `≥ 5` computes do mesmo `user_id` nas últimas 24h (configurável).
15. Paginação em `MyEquityPlanners` (`.range(0,19)` + "carregar mais").
16. Tipagem: criar `src/lib/equity-planner/types.ts` com shapes de `dim_scores`, `valuation`, `initiative`, etc. e remover `as any` de `EquityPlannerAssessment.tsx`.

---

## Fora do escopo (sem mexer agora)
- Substituir `window.print()` por geração de PDF server-side (Puppeteer) — requer infra nova, fica para depois.
- Modelo unificado das 8 edge functions (hoje misturam Claude Sonnet 4.6, Gemini 3 Flash, Gemini 2.5 Pro) — decisão de produto, não bug.
- Multi-tenant para advisor (segregação de carteira) — refactor maior do modelo de roles.

---

## O que aprovar
Posso começar pela **Onda A** (segurança + integridade), que é o que tem maior risco de produção. Confirma esse caminho? Ou prefere que eu execute as 3 ondas em sequência (~3 dias de trabalho)?
