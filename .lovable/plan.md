
# Oráculo v3 — Plano consolidado de execução (Blocos 1→4 revistos)

## Contexto descoberto na auditoria pré-execução
- `interest_logs` válidos: **0** (1 row sem email)
- `messages`: **1**
- `partner_lead_reservations` com CNPJ na listing: **0** (de 31 reservas)
- `deal_events` reais: **1**
- Drift v1↔v2 **arquiteturalmente impossível**: matches v1 estão `is_current=false`, v2 nunca compartilhou CNPJ-buyer com v1 ativo simultaneamente
- `compute-drift-snapshot` aponta para tabela inexistente `matches_v2` (bug)

Conclusão: os Blocos do plano original assumiam dados que **não existem**. Este plano substitui com decisões já aprovadas: sintetizar dados, dry-run QSA, redesenhar drift.

---

## Bloco 1 — Eventos sintéticos plausíveis (destrava o loop)

**Objetivo:** popular `equity_brain.deal_events` com ~200 registros plausíveis para que `update-buyer-revealed-thetas` produza thetas com `n_observations ≥ 5` e o motor possa começar a aprender.

**Implementação:**
1. Criar edge function `seed-synthetic-deal-events` (idempotente via `metadata.source = 'synthetic_v1'`).
2. Sortear ~200 matches da `equity_brain.matches` ativa, distribuídos por buyer (mín. 5 buyers com ≥10 eventos cada).
3. Distribuição: 50% `contacted`, 20% `reply_received`, 15% `rejected` (com `rejection_reason`), 10% `nda_signed`, 4% `loi_received`, 1% `closed`.
4. Probabilidade ponderada por `score`: matches de score alto têm mais chance de "reply"/"nda", baixos têm mais "rejected" — gera sinal Bayesiano coerente.
5. `created_at` distribuído nos últimos 60 dias.
6. Marcar todas com `metadata.source = 'synthetic_v1'`, `metadata.synthetic = true` para serem **identificáveis e removíveis** depois.
7. Rodar `update-buyer-revealed-thetas` em seguida.

**Critério de sucesso:** ≥150 eventos inseridos, ≥5 buyers com `n_observations ≥ 5` em ≥3 features.

---

## Bloco 2 — QSA dry-run (5 CNPJs)

**Objetivo:** validar pipeline `sync-companies-from-cnpj` sem comprometer 6 minutos cegos.

**Implementação:**
1. Selecionar 5 CNPJs distintos de `equity_brain.companies` (variando UF/setor).
2. Inspecionar `sync-companies-from-cnpj` (ou função equivalente que popula `company_partners`) para confirmar:
   - secrets usados (provavelmente CNPJ.ws, Receitaws ou similar)
   - shape de inserção em `equity_brain.company_partners`
3. Executar 1 por 1 com sleep de 2s entre chamadas.
4. Validar inserções e medir taxa de sucesso.
5. Se ≥4/5 OK → relatório verde, sugestão de batch completo (116 CNPJs) em outra rodada.
6. Se ≥1 falha → relatar root cause (secret faltando, rate limit, schema drift).

**Critério de sucesso:** ≥4/5 CNPJs com partners populados.

---

## Bloco 3 — Refatorar drift como série temporal v2

**Objetivo:** substituir o desenho v1↔v2 (impossível) por v2-hoje vs v2-ontem.

**Implementação:**
1. Editar `supabase/functions/compute-drift-snapshot/index.ts`:
   - Trocar `from('matches_v2')` por `from('matches').eq('engine_version','v2').eq('is_current',true)`.
   - Em vez de comparar v1 vs v2, comparar **snapshot atual** vs **drift_snapshot mais recente** (mesma cnpj, top_n).
   - Se for o **primeiro snapshot** (não há baseline): inserir snapshot inicial sem cálculo de drift, marcar `metadata.is_baseline = true`.
2. Schema check: `drift_snapshots` precisa aceitar nullable em `mean_score_v1` (renomear conceitualmente para "previous" / "current"). Se atual schema exigir, migration leve renomeando colunas para `mean_score_prev` / `mean_score_curr`.
3. Rodar imediatamente para criar snapshot baseline.
4. Agendar via `pg_cron` para rodar a cada 24h (insert no SQL via tool de insert, não migração).

**Critério de sucesso:** snapshot baseline inserido + cron agendado.

---

## Bloco 4 — Dashboard de Qualidade & Drift + UI feedback BDR

**Objetivo:** monitoramento visual em `/equity-brain/shadow` (ShadowPage) com alertas e botões de feedback que geram `deal_events` reais.

**Implementação:**

### 4a. MatchQualityCard (já existe) — adicionar critérios de saúde
Adicionar painel "Saúde do Aprendizado" com 4 indicadores semáforo:
- **Cobertura matches v2**: ≥99% → verde
- **Eventos por buyer (mediana)**: ≥5 → verde / ≥2 → amarelo / <2 → vermelho
- **Buyers com thetas calibrados** (`n_obs≥5` em ≥3 features): ≥10 → verde
- **Drift estabilidade** (Spearman vs snapshot anterior): ≥0.85 → verde / ≥0.65 → amarelo / <0.65 → vermelho

### 4b. Novo `DriftMonitorCard.tsx`
- Gráfico de linha temporal de Spearman e overlap (pgrest query em `drift_snapshots` onde `cnpj IS NULL`)
- Histograma de scores atual vs anterior
- Lista top-5 CNPJs com maior drift

### 4c. Botões de feedback no `MatchExplainabilityCard.tsx`
Adicionar 4 botões: "✅ Contatado" / "💬 Respondeu" / "❌ Rejeitar" (com modal de motivo) / "📝 NDA assinado"
- Cada clique chama `eb_log_deal_event(match_id, event_type, ...)` (RPC já existe).
- Atualização otimista da UI.
- Restrito a admin/advisor (a função já valida).

### 4d. Critérios oficiais de "aprendizado saudável" (documentados no card)
| Métrica | Verde | Amarelo | Vermelho |
|---|---|---|---|
| Cobertura v2 | ≥99% | ≥90% | <90% |
| Eventos totais | ≥100 | ≥30 | <30 |
| Buyers calibrados (n_obs≥5, ≥3 features) | ≥10 | ≥3 | <3 |
| Drift Spearman (24h) | ≥0.85 | ≥0.65 | <0.65 |
| Drift overlap (24h) | ≥0.70 | ≥0.50 | <0.50 |

---

## Pós-execução: Relatório de gaps revalidados

Após Blocos 1→4, rodar query única que retorna:
- `deal_events` total (real vs sintético)
- `buyer_revealed_thetas` por buyer
- `company_partners` populados (5 do dry-run)
- `drift_snapshots` count
- Tabela: critério → valor → semáforo

---

## Arquivos afetados

**Edge functions:**
- ➕ `supabase/functions/seed-synthetic-deal-events/index.ts` (novo)
- ✏️ `supabase/functions/compute-drift-snapshot/index.ts` (refatorar v1↔v2 → série temporal v2)

**Migrations (se necessário):**
- Possível rename de colunas em `drift_snapshots` (`mean_score_v1` → `mean_score_prev`, etc.)
- Cron schedule via `pg_cron` para drift diário (insert tool, não migration — contém URL/anon key)

**Frontend:**
- ✏️ `src/components/equity-brain/MatchQualityCard.tsx` (adicionar painel Saúde)
- ➕ `src/components/equity-brain/DriftMonitorCard.tsx` (novo)
- ✏️ `src/components/equity-brain/MatchExplainabilityCard.tsx` (botões feedback)
- ✏️ `src/pages/equity-brain/ShadowPage.tsx` (incluir DriftMonitorCard)

**Memória:**
- ✏️ `mem://features/equity-brain-v2-drift-and-backfill` (atualizar: drift agora é v2-temporal, não v1↔v2)
- ➕ `mem://features/equity-brain-v2-synthetic-bootstrap` (registrar que existem eventos sintéticos `metadata.source='synthetic_v1'` removíveis)

---

## Ordem de execução
1. Bloco 1 (sintéticos + thetas) — ~2 min
2. Bloco 3 (refatorar drift + baseline) — ~3 min
3. Bloco 2 (QSA dry-run 5 CNPJs) — ~30s
4. Bloco 4 (UI + critérios) — ~5 min
5. Relatório final de gaps — ~30s

**Total estimado:** ~12 min de execução. Aprovação necessária para começar.
