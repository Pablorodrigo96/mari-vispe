# Fase E2 — Scores SV/SAV + Tese Mari + Simulador VPL

Implementa a metodologia "Três Assimetrias" sobre o schema E1 já pronto. Não toca no `match_score` atual — `sav_score` roda em paralelo. Score só é apresentado se `sv_data_completeness >= 0.6` (caso contrário, badge "dados insuficientes").

## Dados validados (não vou re-perguntar)
- 249 companies `qualified` aptas pra calcular SV.
- 141.601 matches (vou processar em batch e priorizar top por `match_score`).
- 11 linhas em `taxonomia_compradores` ✓.
- 0 linhas em `benchmark_transactions` — comparáveis na tese e fallback do classificador SAV vão devolver vazio até o JSON ser carregado pela tela de E1; nada quebra.
- `matches.cnpj` (não `mandate_id`) — uso `companies!inner(cnpj)` direto e busco mandato pelo `company_cnpj` quando preciso.

## E2.1 — Função SQL `calculate_sv` + batch
**Migration** `..._sv_calculation.sql`:
- `equity_brain.calculate_sv(p_company_cnpj varchar)` retorna `(score, nivel, breakdown, data_completeness)` conforme spec (9 subscores, pesos, mapeamento 5 níveis, completeness = preenchidos/9). `STABLE SECURITY DEFINER`, `search_path = equity_brain, public`.
- GRANT EXECUTE pra `authenticated`.

**Edge function** `calculate-vendabilidade-batch`:
- Auth: admin OR service_role (mesmo pattern de `calculate-scores`).
- Pega até 250 companies `qualification_status='qualified'` com `sv_calculated_at IS NULL OR < now()-7d`, chama `rpc('calculate_sv')` por CNPJ, faz `update` em `companies` (score_vendabilidade, nivel_maturidade, sv_breakdown, sv_data_completeness, sv_calculated_at).
- Loga em `mari_ops.health_check`.

**Cron**: `0 4 * * *` via `pg_cron` (insert separado, não migration — por causa da anon key no body).

## E2.2 — Edge function `calculate-sav-score`
- Auth admin/service_role.
- Body: `{ match_id }` (single) ou `{ batch: true, limit?: 200 }`.
- Single: lê `matches` + `companies` (via cnpj) + `buyers`, busca até 5 deals históricos em `benchmark_transactions ILIKE comprador_nome` (vazio enquanto JSON não carregado → encaixe ganha 0 nesse fator).
- Calcula 6 fatores (sinergia custo 25% / receita 15% / eliminação 15% / geografia 15% / custo oportunidade 15% / encaixe estratégico 15%) usando `buyer.tipo_comprador`, setores/UFs/municípios de interesse, deals_last_12m, recent_capital_raise.
- `update matches set sav_score, sav_breakdown, sav_calculated_at` (filtra `is_current=true`).
- Batch: pega matches `is_current=true` order by `match_score DESC` com `sav_calculated_at IS NULL OR < now()-24h`, processa serial, agrega contagem.
- Loga health_check.

**Cron**: `15 */6 * * *`.

## E2.3 — Edge function `mari-generate-buyer-thesis`
- Auth: usuário autenticado (advisor/admin) — single use; batch protegido por admin.
- Body: `{ match_id }` ou `{ batch: true, limit?: 50 }`.
- Monta prompt PT-BR conforme spec (top 3 fatores SAV, taxonomia, comparáveis recentes do setor).
- `LOVABLE_API_KEY` + `google/gemini-2.5-flash` via `https://ai.gateway.lovable.dev/v1/chat/completions`.
- Trim 600 chars, `update matches set thesis_text, thesis_generated_at`.
- Loga health_check.

## E2.4 — Edge function `calculate-vpl-proposal`
- Auth: usuários com acesso ao mandato (verifico via RLS chamando como user). Admin sempre.
- Body: `{ proposal_id }`.
- Lê `transaction_proposals`, calcula VPL com 5 premissas fixas (custo capital 15%, prob earn-out 55%, prob escrow 70%, desconto liquidez ações 25%, prob garantias 30%), monta breakdown e assumptions, persiste `vpl_ajustado_brl_mm`, `vpl_breakdown`, `vpl_assumptions`, `vpl_calculated_at`.
- Retorna `{ total, breakdown }`.

## E2.5 — Tela `/equity-brain/crm/mandate/:id/propostas`
**Arquivo**: `src/pages/equity-brain/PropostasPage.tsx` + rota em `App.tsx`.

Layout:
```text
[← Voltar] Comparação de Propostas — <empresa>     [+ Nova proposta]
─────────────────────────────────────────────────────────────
                       Proposta A      Proposta B
Buyer / Tipo
Valor nominal
Componentes (vista, earn-out nominal/ajustado, escrow, parcelamento, ações)
Custos implícitos (non-compete, lockup, garantias)
─────────────────────────────────────────────────────────────
▶ VPL AJUSTADO          R$ X,XX MM     R$ Y,YY MM ← MELHOR (border Volt)
Diferença vs nominal
[Editar A]              [Editar B]     [Premissas usadas]
```

- Drawer "Nova/Editar proposta": buyer (select dos buyers do mandato), label, blocos vista / earn-out (valor + prazo + métricas) / escrow / parcelamento / ações (valor + lockup + ticker) / cláusulas (non-compete anos, lockup operacional, garantias).
- Botão "Calcular VPL" → invoca edge function → recarrega.
- Tabela comparativa com colunas dinâmicas; coluna do maior VPL com `border-volt/40`.
- Modal "Premissas usadas" abre as 5 constantes (read-only nesta versão).
- Tooltips usando `ebTooltips.ts` (vou estender com chaves novas: `sv_score`, `sav_score`, `vpl_ajustado`, etc.).

## E2.6 — Integração na UI existente
**A. `MandateDetailPage.tsx`** — bloco "Diagnóstico Vispe" acima da timeline:
- Gauge SV (reusa `ScoreDial`) + `NivelBadge` (1-5, label "Invendável/Desconto/Médio/Prêmio/Disputado").
- Alert se `sv_data_completeness < 0.6`.
- Top 3 fragilidades (menores subscores no breakdown).
- Botão "💰 Comparar propostas" → navega pra `/equity-brain/crm/mandate/:id/propostas`.

**B. `OportunidadesPage.tsx`** (cards de matches): SAV badge (>70 verde, 50-70 amber, <50 zinc), badge `tipo_comprador`, `thesis_text` em itálico, botão "Gerar/Regerar tese" (chama edge function, invalida query).

**C. `BuyerDetailPage.tsx`** — bloco "Perfil Vispe" com taxonomia (descricao, paga_premio_quando, paga_menos_quando, argumento_comercial_padrao, risco_principal_vendedor) + tabela "Deals históricos" lendo `benchmark_transactions ILIKE comprador_nome`.

**D. `DealDrawer.tsx`** — adiciona ActionButton "Simulador VPL" → mesma rota `/equity-brain/crm/mandate/:id/propostas`.

## Componentes novos compartilhados
- `src/components/equity-brain/Gauge.tsx` — círculo SVG simples 0-100 (reusa `scoreColor`).
- `src/components/equity-brain/NivelBadge.tsx` — 5 níveis com cor escalonada.
- `src/components/equity-brain/SAVBadge.tsx` — score badge com tooltip.
- `src/components/equity-brain/TopFragilidades.tsx` — lista os 3 menores subscores do `sv_breakdown`.
- `src/components/proposals/ProposalForm.tsx` (drawer).
- `src/components/proposals/ProposalCompareTable.tsx`.

## Arquivos
**Novos**
- `supabase/migrations/<ts>_sv_calculation.sql`
- `supabase/functions/calculate-vendabilidade-batch/index.ts`
- `supabase/functions/calculate-sav-score/index.ts`
- `supabase/functions/mari-generate-buyer-thesis/index.ts`
- `supabase/functions/calculate-vpl-proposal/index.ts`
- `src/pages/equity-brain/PropostasPage.tsx`
- `src/components/equity-brain/Gauge.tsx`, `NivelBadge.tsx`, `SAVBadge.tsx`, `TopFragilidades.tsx`
- `src/components/proposals/ProposalForm.tsx`, `ProposalCompareTable.tsx`

**Editados**
- `src/App.tsx` (rota propostas)
- `src/pages/equity-brain/MandateDetailPage.tsx` (bloco Diagnóstico Vispe)
- `src/pages/equity-brain/OportunidadesPage.tsx` (SAV badge + tese)
- `src/pages/equity-brain/BuyerDetailPage.tsx` (Perfil Vispe + deals históricos)
- `src/components/deal/DealActions.tsx` (botão Simulador VPL)
- `src/lib/ebTooltips.ts` (chaves novas)

**Insert (não migration)** — agendamento dos 2 crons via `pg_cron`/`pg_net`.

## Fora de escopo (V2/F+)
SQE, SDF, SCP, SCV, what-if scenarios, anuário Vispe, pitch deck por buyer, score de risco da transação, override de premissas pelo admin (UI fica read-only nesta fase).

## Critérios de aceite
- Migration aplica sem warnings; `calculate_sv` retorna shape correto pra um CNPJ qualificado.
- Batch SV roda e popula >= 100 companies (temos 249).
- Batch SAV roda e popula >= 1000 matches.
- 1 tese gerada manualmente, coerente com tipo + top 3 fatores.
- 2 propostas de teste validam: B (R$85MM mais à vista) com VPL > A (R$100MM mais earn-out/escrow/ações).
- MandateDetailPage, OportunidadesPage, BuyerDetailPage e DealDrawer mostram os novos blocos sem quebrar layout.
- `mari_ops.daily_smoke_tests` continua verde.

Posso prosseguir?
