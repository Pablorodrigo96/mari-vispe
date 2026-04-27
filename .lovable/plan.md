# Equity Brain v2 — Plano de Execução em 4 Fases

## Diagnóstico do que já existe vs. o que falta

A base atual é **sólida e compatível** com a evolução proposta:
- Schema `equity_brain` com 15 tabelas (companies, buyers, matches, signal_catalog, company_signals, investment_theses, buyer_theses, opportunities_ready, etc.)
- Edge functions já existentes: `match-company`, `match-buyer`, `match-batch`, `compute-signals`, `calculate-scores`, `refresh-opportunities`, `claude-classify-thesis`, `claude-generate-pitch`, `claude-analyze-call`, `feedback-from-call`
- 86 companies, 105 buyers (60 estratégicos, 21 fundos, 14 PE platform, 8 family office), 32 sinais no catálogo, 448 sinais observados, 29 teses, 114 vínculos buyer↔tese
- `matches` está zerado (provavelmente foi truncado ao mexer no grafo) — bom momento para virar o motor

O que **NÃO existe** e o plano vai construir:
- Sinais probabilísticos (`p_true`, `evidence_strength`, `freshness`)
- Arquétipos de comprador com pesos por feature
- Bayesian Buyer Model (pesos revelados a partir de deals fechados)
- Decisão calibrada com CI, EV (faixa de preço p10/p50/p90), abstenção, contrafactual, comparáveis
- Tabela `deal_events` (feedback estruturado de BDR)
- Tabela `canonical_transactions` (comparáveis de mercado)
- Bayesian fusion de "mandato ativo em 12m"
- UI `MatchDecisionCard` com tudo isso

## Princípios de execução

1. **Shadow mode primeiro**: novo motor escreve numa coluna paralela (ou flag) antes de virar default.
2. **Manter motor antigo como fallback**: nenhum endpoint em produção quebra.
3. **Adaptar nomenclatura ao schema atual**: usar `cnpj` como PK de empresa (não `company_id` UUID), `thesis_key` (não `thesis_id`), `setor_ma`/`subsetor_ma`, `setores_interesse[]`, `ufs_interesse[]`, `porte` etc. Isso evita migrations gigantes.
4. **Usar `tipo` existente para inferir arquétipo default**: `estrategico`+`vertical=telecom` → consolidator; `plataforma_pe` → buy-and-build; etc. Admins refinam manualmente.
5. **Sem quebrar UI atual**: o grafo estratégico continua funcionando; o painel de decisão é um novo componente que aparece quando o match v2 está disponível.

---

## FASE 1 — Fundação de dados (1–2 dias)

**Objetivo**: criar o schema novo e popular dados iniciais sem ainda mexer no scoring.

### 1.1 Migrations
Adicionar em `equity_brain`:
- Colunas em `company_signals`: `p_true NUMERIC DEFAULT 1.0`, `evidence_strength TEXT CHECK (...)`, `evidence_ts TIMESTAMPTZ`, `source TEXT`, `freshness_decay_days INT DEFAULT 90`
- Colunas em `buyers`: `archetype_id TEXT`, `pause_signal BOOLEAN`, `deals_last_12m INT`, `pe_sponsor_name`, `pe_sponsor_entry_date`, `recent_capital_raise_brl`, `recent_capital_raise_date`, `avg_multiple_paid_recent`, `median_target_size_recent`
- Colunas em `matches`: `p_close_12m`, `p_close_ci_lower`, `p_close_ci_upper`, `ev_p10/p50/p90`, `multiple_p10/p50/p90`, `price_per_client_p50`, `data_confidence`, `abstain BOOLEAN`, `abstain_reason`, `buyer_archetype`, `sector_cycle_phase`, `counterfactual TEXT`, `comparables JSONB`, `feature_contributions JSONB`, `engine_version TEXT DEFAULT 'v1'`
- Nova tabela `equity_brain.buyer_archetypes` (id, name, description, default_weights JSONB)
- Nova tabela `equity_brain.buyer_revealed_thetas` (buyer_id, feature_name, posterior_mean, posterior_std, n_observations, last_updated)
- Nova tabela `equity_brain.deal_events` (match_id, event_type, event_ts, rejection_reason, notes, bdr_user_id, metadata) com índices
- Nova tabela `equity_brain.canonical_transactions` (buyer_name, target_name, sector, deal_date, ev_brl, ebitda_multiple, revenue_multiple, price_per_client, geography, thesis, buyer_archetype) — sem `vector(64)` por enquanto (pgvector já está habilitado mas embeddings ficam para fase 4)
- RLS em todas: leitura admin/advisor, escrita service_role

### 1.2 Seeds
- Inserir os 10 arquétipos (consolidator_regional_strict, consolidator_national_aggressive, integrated_telco, pe_platform_buy_and_build, serial_acquirer_saas_vertical, infra_fund_buy_and_hold, family_office_direct, health_strategic_vertical, education_premium_medical, b2b_services_consolidator)
- Inserir as 21 transações canônicas (Claro×Desktop, Brasil TecPar×Ligga, Unifique×CCS, TOTVS×TBDC, etc.)
- Adicionar ao `signal_catalog` os sinais novos (pe_sponsor_age_4plus, mandate_active_proba_high, leverage_trajectory_rising, target_advisor_engagement_90d, lider_microregional, arpu_above_sector_median, ftth_pct_high, arr_recurring_high, churn_low, sector_cycle_phase_3_or_4, valuation_arbitrage_window_open, etc.)

### 1.3 Backfill arquétipos
Mapear `archetype_id` automaticamente para os 105 buyers existentes via heurística:
- `tipo='estrategico' + vertical='telecom'` → tentar inferir via `ufs_interesse` (1–2 estados ⇒ regional_strict; ≥4 ⇒ national_aggressive)
- `tipo='estrategico' + vertical='telecom' + nome ∈ {Claro, Vivo, TIM, Oi}` → `integrated_telco`
- `tipo='plataforma_pe'` → `pe_platform_buy_and_build`
- `tipo='estrategico' + vertical='saas'` → `serial_acquirer_saas_vertical`
- `tipo='estrategico' + vertical='saude'` → `health_strategic_vertical`
- `tipo='estrategico' + vertical='educacao'` → `education_premium_medical`
- `tipo='estrategico' + vertical='servicos_b2b'` → `b2b_services_consolidator`
- `tipo='financeiro_fundo'` com vertical=infra → `infra_fund_buy_and_hold`
- `tipo='family_office'` → `family_office_direct`
- Resto: `archetype_id=NULL` (admin classifica depois pela UI)

**Entregável Fase 1**: schema novo migrado, seeds carregados, todos os buyers com arquétipo (NULL = pendente). Nada quebra.

---

## FASE 2 — Bayesian fusion + Hybrid scoring em shadow mode (3–5 dias)

**Objetivo**: rodar o motor v2 em paralelo, escrever na mesma tabela `matches` com `engine_version='v2'`, comparar com v1 antes de cortar.

### 2.1 Edge function `compute-mandate-active-proba`
- Lê sinais de uma empresa, faz fusão Bayesiana log-odds
- Persiste resultado como sinal derivado `mandate_active_proba_high` com `p_true`, `evidence_strength='inferred'`, `source='bayesian_fusion_v1'`
- Schedule diário via pg_cron para todas companies com sinais novos nos últimos 7d

### 2.2 Edge function `match-company-v2`
Reaproveita estrutura de `match-company` mas:
- Hard-exclusion (alavancagem extrema, geo não-contígua para regional, CADE telco×telco)
- Sub-fits expandidos (setor, geografia, tese, porte, ma_norm + tamanho, financeiro, tecnológico, governança, timing, sinergia_movel, recorrência, vertical_fit, densidade_local, sponsor_age)
- Stacking ensemble: `rule_prior` (calibrado) + `archetype_weighted` (pesos do arquétipo) + `bbm` (se buyer tem ≥5 deals em `deal_events`); pesos do ensemble dependem de `deals_last_12m`
- Regime multiplier (capital raise recente, pause_signal, sponsor age, fase do ciclo)
- Calibração via Platt scaling placeholder (refinar depois com histórico)
- Conformal-style CI; abstenção se largura > 0.40
- Price band via mediana p10/p50/p90 de `canonical_transactions` filtradas por `buyer_archetype`
- Top-3 comparáveis
- Decomposição estilo SHAP linear sobre os pesos do arquétipo
- Counterfactual ("subiria X pontos se governança fosse alta")
- Persiste em `matches` com `engine_version='v2'`

### 2.3 Job comparativo (shadow)
- Rodar v2 sobre as mesmas companies que v1 já processou
- Dashboard admin simples mostrando: distribuição de `p_close_12m`, taxa de abstenção, % concordância entre v1 score≥70 e v2 p_close≥0.5, top discrepâncias
- Calibrar Platt scaling após análise

### 2.4 Cutover controlado
- Adicionar feature flag `equity_brain.engine_version` em `integrations_config` (default `v1`, pode virar `v2`)
- `refresh-opportunities` passa a chamar v1 ou v2 conforme flag
- Documentar como reverter

**Entregável Fase 2**: motor v2 rodando, dados em `matches` com `engine_version`, dashboard de comparação, capacidade de cortar via flag.

---

## FASE 3 — UI de decisão + Feedback loop (3–5 dias)

**Objetivo**: dar acesso visual aos novos campos e começar a coletar feedback de BDR para alimentar a fase 4.

### 3.1 Componente `MatchDecisionCard`
Substitui/complementa o atual painel lateral do grafo (`NodeDetailPanel`) e o `MatchCard` de matching. Mostra:
- Probabilidade de fechamento em 12m com CI 80%
- Faixa de preço p10–p50–p90 + múltiplo mediano
- Top 5 contribuições por feature (cor/sinal positivo ou negativo)
- 3 comparáveis canônicos
- Counterfactual ("subiria X pts se Y")
- Badges: arquétipo, fase ciclo (1–4), confiança de dados (low/medium/high)
- Estado especial "abstain" quando incerteza alta

Aparece em:
- `NodeDetailPanel` (grafo) quando o nó é seller selecionado e há matches v2
- `MatchCard` na página `/matching/results`
- Página de detalhe do deal (`DealDetailPage`)

### 3.2 UI de feedback BDR
Botões no `MatchDecisionCard` e em `OportunidadesPage`:
- Marcar: rejeitou (com motivo dropdown), contatou, recebeu resposta, NDA, LOI, term sheet, fechou, dropou
- Cada clique grava em `deal_events` com `bdr_user_id = auth.uid()`
- Timeline visível por match
- Notificação para admin quando `closed` é marcado

### 3.3 Seed de eventos históricos
Importar `canonical_transactions` como `deal_events` "fechados" históricos quando há buyer e seller no nosso DB (alguns dos buyers da seed list já estão como buyers cadastrados).

**Entregável Fase 3**: BDRs conseguem ver decisão completa e marcar resultado. `deal_events` começa a acumular.

---

## FASE 4 — Bayesian Buyer Model + Loop adaptativo (3–4 dias)

**Objetivo**: o sistema aprende sozinho com cada deal fechado.

### 4.1 Edge function `update-buyer-revealed-thetas`
- Trigger ao inserir `deal_events.event_type='closed'`
- Update Bayesiano online (mean/std incremental) sobre 11 features (geografia, setor, tamanho, tecnologico, governanca, timing, sinergia_movel, densidade_local, recorrencia, vertical_fit, sponsor_age)
- Atualiza `buyer_revealed_thetas` por buyer
- Recalcula `buyers.deals_last_12m`, `pause_signal`, `avg_multiple_paid_recent`, `median_target_size_recent`

### 4.2 Trigger SQL
`AFTER INSERT ON deal_events` chama a edge function via `net.http_post` quando `event_type='closed'`.

### 4.3 Backfill BBM
Script único que reprocessa todos os `deal_events` históricos (incluindo os 21 da seed) para popular `buyer_revealed_thetas` desde o dia 1.

### 4.4 Drift dashboard
Painel admin (`/admin/equity-brain/drift`) mostrando:
- Por buyer: posterior_mean atual vs. default do arquétipo (visualizar quando o buyer "vira" um arquétipo diferente do classificado)
- Calibration plot: P_close previsto × taxa real de fechamento (usando `deal_events.closed`)
- Feature importance global agregada por arquétipo
- Alerta quando `n_observations` ultrapassa 5 (BBM começa a pesar no ensemble)

### 4.5 Testes mínimos (Deno test)
- Hard exclusion: Unifique × empresa em SP retorna `excluded=true`
- Comparáveis: Unifique × empresa SC retorna comparáveis com `MKS Net`/`CCS Telecom`
- Ensemble: buyer com 0 deals usa só rule_prior+archetype; buyer com 10 deals usa BBM com peso ≥0.5
- Calibration: P_close para empresa com `intencao_venda_explicita=1` é >0.5

**Entregável Fase 4**: motor adaptativo completo, dashboard de drift, testes verdes.

---

## Detalhes técnicos importantes (para a Lovable executar)

### Compatibilidade com schema atual
| Proposta original | O que vamos usar |
|---|---|
| `companies.id UUID` | `companies.cnpj` (PK existente) |
| `company_signals(company_id, signal_id)` | `company_signals(cnpj, signal_key)` |
| `matches(thesis_id)` | `matches(thesis_key)` |
| `theses` | `investment_theses` |
| `signal_catalog(signal_id, weight_ma, weight_vispe, weight_sucessao)` | já existe como `signal_key, default_weight, affects_scores[]` — vamos popular `affects_scores=['ma','vispe','sucessao']` quando o sinal afeta o score |

### Edge functions a criar/modificar
- **Novas**: `compute-mandate-active-proba`, `match-company-v2`, `update-buyer-revealed-thetas`, `seed-canonical-transactions` (one-shot)
- **Modificar**: `refresh-opportunities` (lê flag e chama v1 ou v2), `match-batch` (usa v2 quando flag ativa), `compute-signals` (também escreve `p_true` baseado em qualidade do sinal)

### Cron schedule
- `compute-mandate-active-proba`: diário às 4h
- `update-buyer-revealed-thetas`: trigger por evento (não cron)
- `refresh-opportunities`: já existente, mantém

### RLS
Todas as novas tabelas:
- SELECT: admin OR advisor OR (partner_accountant em casos específicos)
- INSERT/UPDATE: service_role (escrita só via edge function) — exceção: `deal_events` permite INSERT por authenticated quando `bdr_user_id = auth.uid()`

### Não fazer agora (fica fora do escopo)
- pgvector embeddings em `canonical_transactions` (fase 5 futura)
- Treinamento ML real do calibrate (fica como Platt placeholder)
- Importação automática de notícias para sinais "press_mention_sale"
- Integração com PiperRun para sincronizar `deal_events`

---

## O que precisa do usuário antes de começar

1. **Aprovação do plano** para eu sair do modo plan
2. **Confirmação da fase 1 isolada primeiro**: prefere que eu execute fase por fase com checkpoint, ou autoriza ir até fim da fase 2 (shadow mode) sem parar?
3. **Arquétipo manual de buyers críticos**: posso classificar via heurística e você revisa depois, ou prefere classificar manualmente os top-20 buyers antes de eu rodar o backfill?
