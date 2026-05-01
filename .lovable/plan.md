
# Fase A — Limpeza & correções críticas

Estado atual confirmado no banco:
- `equity_brain.mandates`: 529 linhas
- `equity_brain.matches WHERE is_current=true`: 103.562 linhas
- `equity_brain.buyers WHERE is_synthetic=true`: 107 (98 batem `#A###`)
- `equity_brain.deals`: 0 linhas (UnifiedDealPage exposto sem dado)
- `equity_brain.drain_jobs`: 0 linhas, **RLS desativado**
- `gabriel@vispe.com.br`: existe em `auth.users`, **sem role**
- Materialized views `mv_dashboard_*`: **não existem** no banco
- Índice parcial confirmado: `uniq_matches_current ON matches(cnpj, buyer_id, thesis_key) WHERE is_current=true`

## A.1 — Dedupe robusto (resolve o erro que travou o merge)

Migration `20260502_dedupe_partial_unique_safe.sql`:

1. **`equity_brain._merge_fillup`**: além de excluir colunas de PK/UNIQUE constraint (já feito), passar a excluir também colunas presentes em qualquer **UNIQUE INDEX parcial** (`pg_index.indisunique=true AND indpred IS NOT NULL`). Resolve o caso `uniq_matches_current` e os outros 5 índices parciais detectados (`buyers`, `companies`, `company_scores`).

2. **`equity_brain.merge_matches`** (e demais merges de tabelas com índice parcial): adicionar passo "steal-then-null" antes do fillup para os campos do índice parcial — se o `keep` ainda não tem o valor e o `drop` tem, copiar; depois, **nullificar/marcar `is_current=false` no `drop`** dentro da mesma transação para liberar a unique condicional.

3. **`equity_brain.eb_run_safe_dedupe(p_table, p_dry_run, p_batch_size)`**: refatorar com `BEGIN ... EXCEPTION WHEN OTHERS` por par (loop com SAVEPOINT implícito do bloco PL/pgSQL), retornando `{total_pairs, merged, failed, errors[]}` em vez de abortar o batch inteiro.

4. **`DedupeAdminPage.tsx`**: ler o JSON novo (`merged`/`failed`/`errors`) e exibir tabela de pares falhos com mensagem para o admin investigar caso a caso.

## A.2 — Buyers sintéticos invisíveis no CRM

Migration:
- `UPDATE equity_brain.buyers SET is_synthetic=true WHERE nome ~ '#A[0-9]+' AND is_synthetic IS DISTINCT FROM true`
- Recriar `equity_brain.buyers_blind` com filtro `WHERE is_synthetic = false OR has_role(auth.uid(),'admin')` (mantém comportamento atual de mascarar nome para non-admin)

## A.3 — Esconder UnifiedDealPage até existir dado

Em `src/App.tsx` linha 279, trocar:
```tsx
<Route path="deal/:id" element={<UnifiedDealPage />} />
```
por redirect para a rota de mandato ativa (mantém o componente em código para reativar depois):
```tsx
<Route path="deal/:id" element={<Navigate to="/equity-brain/pipeline" replace />} />
```
(Não há rota `crm/mandate/:id` — a navegação canônica de mandato hoje é `/equity-brain/mandatos/tabela` ou pipeline; preferimos pipeline para não quebrar UX.)

## A.4 — Materialized views + cron de refresh

As views `mv_dashboard_*` **não existem** no banco. Duas opções:

- **A.4a (recomendado para Fase A)**: apenas **criar a função `public.refresh_dashboard_views()` defensiva** (`IF EXISTS` checagem por matview antes de cada `REFRESH`) e **agendar cron horário**. Quando as views forem criadas em outra fase, o cron já passa a refrescá-las sem mudança.
- **A.4b**: criar as 4 matviews agora (executivo/mandato/match/nbo) — fora do escopo de "limpeza", deixar para fase de Dashboards.

Vou seguir A.4a para não inventar schema novo nesta fase.

## A.5 — RLS em `drain_jobs`

Migration:
```sql
ALTER TABLE equity_brain.drain_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY drain_jobs_admin_only ON equity_brain.drain_jobs
  FOR ALL USING (public.has_role(auth.uid(),'admin'));
```

## A.6 — Role advisor para Gabriel

Insert via tool de dados (não migration):
```sql
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'advisor'::app_role FROM auth.users
WHERE email='gabriel@vispe.com.br'
ON CONFLICT (user_id, role) DO NOTHING;
```

## A.7 — Mover admin pra dentro do shell EB

Atualmente `/admin/monday-parity` e `/admin/advisors-mapping` rodam no AppShell admin (linhas 185-186 do `App.tsx`).

1. Adicionar dentro do bloco `<Route path="/equity-brain" element={<EquityBrainLayout/>}>`:
   ```tsx
   <Route path="admin/monday-parity"     element={<MondayParity />} />
   <Route path="admin/advisors-mapping"  element={<AdvisorsMapping />} />
   ```
2. Substituir as duas rotas em `/admin/...` por `<Navigate to="/equity-brain/admin/..." replace />`.
3. `EBSidebar.tsx`: trocar os `to:` de `ADMIN_ITEMS` para os novos paths `/equity-brain/admin/monday-parity` e `/equity-brain/admin/advisors-mapping` (atualizar também `adminActive` matcher).

## Arquivos que serão tocados

- **Novas migrations**:
  - `supabase/migrations/<ts>_dedupe_partial_unique_safe.sql` (A.1)
  - `supabase/migrations/<ts>_buyers_blind_hide_synthetic.sql` (A.2)
  - `supabase/migrations/<ts>_refresh_dashboard_views_cron.sql` (A.4a)
  - `supabase/migrations/<ts>_drain_jobs_rls.sql` (A.5)
- **Insert de dados** (não migration): `user_roles` para Gabriel (A.6)
- **Código**:
  - `src/App.tsx` (A.3 redirect deal, A.7 mover admin pra EB shell + redirects legacy)
  - `src/components/equity-brain/EBSidebar.tsx` (A.7 atualizar paths)
  - `src/pages/equity-brain/DedupeAdminPage.tsx` (A.1 mostrar `errors[]`)

## Validação pós-deploy (vou executar via read_query e reportar)

```sql
SELECT COUNT(*) FROM equity_brain.mandates;       -- esperado: < 400
SELECT COUNT(*) FROM equity_brain.matches WHERE is_current=true;
SELECT relrowsecurity FROM pg_class WHERE oid='equity_brain.drain_jobs'::regclass;
SELECT role FROM public.user_roles ur JOIN auth.users u ON u.id=ur.user_id WHERE u.email='gabriel@vispe.com.br';
SELECT jobname, schedule FROM cron.job WHERE jobname='refresh-dashboards-hourly';
```

Mais smoke checks:
- `/equity-brain/deal/qualquer-uuid` deve redirecionar para `/equity-brain/pipeline`
- `/admin/monday-parity` redireciona para `/equity-brain/admin/monday-parity` e a sidebar EB segue visível
- Rodar `eb_run_safe_dedupe('mandates', false, 50)` em batches até zerar candidatos; depois `('matches', false, 50)`

## Pontos que difiro do briefing original

- **A.3**: o briefing pede `Navigate to="../crm/mandate/:id"` — essa rota **não existe** no router atual. Vou redirecionar para `/equity-brain/pipeline` (caminho seguro). Se houver intenção de criar `crm/mandate/:id`, faço em fase separada.
- **A.4**: as 4 matviews **não existem**. Faço só a função+cron defensivos agora; criação das views fica para a fase de Dashboards para não inflar esta limpeza.

Posso prosseguir?
