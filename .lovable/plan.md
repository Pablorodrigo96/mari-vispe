# Roadmap MARI / PME.B3 — 12 semanas, calibrado com diagnóstico real

## Diagnóstico que muda o plano original

Rodei queries contra o banco antes de escrever este plano. Três descobertas alteram materialmente o que você propôs:

**1. CRM "não mostra suas empresas" — não é UI, é ownership**
- 317 mandatos no total. **230 (73%) sem `responsavel_id`**. Apenas **1 advisor distinto** tem mandatos atribuídos.
- A correção da Fase 2-3 anterior moveu pipeline_stage automaticamente, mas não distribuiu ownership. Quando você (ou qualquer advisor que não seja "o 1") abre "Minhas Empresas", aparece vazio. Isso é correção de **1-2 dias**, não de roadmap.

**2. Labels para ML supervisionado — caso pior confirmado**
- 221 deal_events: **220 são `contacted`** (sinal fraco), **1 `nda_signed`**, **0 outcomes terminais** (closed_won/closed_lost).
- Logistic Regression treinado nisso aprende "todo mundo foi contatado" — zero valor preditivo. Bayesiano + active learning agressivo é o caminho correto, com supervisionado adiado para semana 10+ (ou trimestre seguinte) quando tivermos labels reais.

**3. company_news = 0**
- Confirmado. Pipeline de news está pronto mas sem fonte. Vamos com Google News RSS gratuito (sua escolha) e migrar para Firecrawl só se ROI exigir.

## Definition of Done MARI (anti-padrão "80%")

Todo entregável passa pelos 5 gates antes de fechar:

```text
G1 Schema       — migration aplicada + assertion no fim + rollback testado
G2 Backend      — edge function com wrapper observability, sem erro em log
G3 Pipeline     — dado real fluindo, volume dentro do esperado (não 0, não 10x)
G4 UI           — usuário-alvo completa fluxo sem ajuda do dev
G5 Observability — dashboard /admin/health verde por 48h + smoke test passando
```

Card só vira "done" com print do dashboard verde + smoke test 3x consecutivo.

---

## Cronograma consolidado

```text
Semana | Fase 0 (infra)        | Fase 1 (modelo)      | Fase 2 (UX/CRM)         | Fase 3 (news)
-------|------------------------|----------------------|-------------------------|------------------
1      | health_check + wrapper | -                    | CRM ownership fix       | -
2      | dashboard /admin/health| -                    | Smart Pipeline (semáforo)| -
3      | Smoke tests críticos   | Feature store v1     | Smart Pipeline (cont.)  | -
4      | -                      | Active learning UI   | Unified Action Drawer   | -
5      | -                      | Labels backfill+UI   | Unified Action Drawer   | -
6      | -                      | Bayesiano refinado   | Daily Briefing          | -
7      | -                      | Calibração + IC      | Daily Briefing          | Audit + RSS sources
8      | -                      | Coarse layer 200k    | Alertas inteligentes    | Pipeline reforçado
9      | -                      | -                    | Mari proativa           | Pipeline reforçado
10     | -                      | Logistic se ≥150 lbl | Mari proativa           | UI /news + feedback
11     | -                      | Coarse layer 1MM     | Polimento               | Loop feedback
12     | Hardening + retros     | Hardening            | Hardening               | Hardening
```

---

## FASE 0 — Fundação de Confiabilidade (Semanas 1-3, híbrida)

**Escopo escolhido:** wrapper universal automático + backfill apenas das 10 funções críticas + dashboard. Smoke tests só onde dá ROI claro.

### Semana 1
- Schema `mari_ops`: tabelas `health_check` (function_name, ts, status, duration_ms, payload_summary, error_text, request_id), `smoke_tests`, `alert_rules`.
- Wrapper TypeScript `withObservability(handler, { name })` em `supabase/functions/_shared/observability.ts`. Captura início/fim, duração, erros, e escreve em `mari_ops.health_check` via service role.
- Aplicar wrapper nas 10 funções críticas: `match-company-v2`, `calculate-scores`, `eb-import`, `mari-brain-chat`, `process-event`, `crawl-ma-sources`, `extract-news-event`, `news-to-crm-alert`, `setup-equity-brain-crons`, `valuation-pay`.

### Semana 2
- Página `/equity-brain/admin/health` (admin-only): tabela com semáforo verde/amarelo/vermelho por função. Métricas últimas 24h: success rate, p50/p95 latência, último erro com stack truncado, último timestamp.
- View `mari_ops.health_summary_24h` agregando.
- Cron job a cada 15min que detecta funções com >5% erro nas últimas 24h ou ausentes do SLA → cria notification para admins.

### Semana 3
- Smoke tests SQL/edge das 5 cadeias críticas:
  - `test_matching_v2_returns_results` (1 buyer ativo + 10 companies → ≥1 match score >50)
  - `test_calculate_scores_produces_current` (≥80% companies com `scored_at` últimas 24h)
  - `test_event_queue_drains` (deal_events processados em <5min)
  - `test_news_pipeline` (depois da Fase 3 — placeholder agora)
  - `test_crm_ownership_distribution` (≥3 advisors distintos com mandatos vivos)
- Cron a cada 6h roda smoke tests, escreve em health_check com status='red' se falhar.

**Aceite Fase 0:** dashboard mostra status de 10 funções; smoke tests rodando; pelo menos 1 alerta real disparado e resolvido; toda função nova já nasce com wrapper (template + lint rule).

---

## FASE 2 — UX/CRM (Semanas 1-11) — começa imediatamente

Suas 3 fricções (priorizar agora + saltar entre 5 telas + CRM incompleto) determinam a ordem.

### 2.0 — Correção emergencial CRM (Semana 1, paralelo à Fase 0)

**Não negociável. Resolve "CRM não mostra suas empresas".**

- Tela admin `/equity-brain/crm/admin/atribuicoes`: lista 230 mandatos sem responsável, ação bulk "atribuir a [advisor]". Filtros por origem, setor, valor.
- Função `equity_brain.suggest_responsavel(mandate_id)` que sugere advisor baseado em: setor histórico, geografia, carga atual.
- Botão "Auto-atribuir 50 próximos" usando a função.
- View `eb_my_companies_v2` para `/equity-brain/crm/minhas-empresas` que retorna mandatos onde `responsavel_id = auth.uid()` OR `co_advisor_id = auth.uid()` OR `created_by = auth.uid()` OR `origin_advisor_id = auth.uid()`. Hoje só usa responsavel_id, daí o vazio.
- Coluna `mandates.co_advisor_ids[]` para ownership compartilhado.

### 2.1 — Smart Pipeline Triage (Semanas 2-3) — fricção "qual mandato priorizar"

- Coluna calculada `priority_score` (0-100) por mandato:
  - Stage stagnation (dias na fase atual / SLA da fase) — 30%
  - Buyer interest signals (matches >75 nas últimas 7 dias) — 25%
  - Document readiness (vdr_readiness, equity_score) — 15%
  - Time decay (data assinatura mandato) — 15%
  - Manual boost do advisor — 15%
- Função `equity_brain.calc_priority_score()` em pg_cron 1h.
- UI `/equity-brain/crm/triagem`: lista ordenada por priority_score, top 20 do dia. Cada card: empresa, codename, stage + dias parado, próxima ação sugerida, semáforo (vermelho >SLA, amarelo 70-100% SLA, verde <70%).
- Pipeline Kanban existente ganha: badge de prioridade no canto do card, contador regressivo SLA, drag-drop com side effect (mover para NBO dispara checklist + atividade).

### 2.2 — Unified Action Drawer (Semanas 4-5) — fricção "saltar entre 5 telas"

- Componente global `<MariActionDrawer>` que abre lateralmente em qualquer página. Recebe `entityType` (mandate/buyer/match) + `entityId`.
- Conteúdo em abas: Resumo · Match SHAP · Documentos · WhatsApp · Atividades · Notas.
- Acessível via: clique em qualquer card de mandato/buyer/match em qualquer tela; atalho de teclado `Cmd+J`; CTA "Abrir 360" nos cards.
- WhatsApp embed (já existe em mandate-360) + botão "Registrar atividade" em 1 clique gera `activity` + opcional `deal_event`.
- Ação inline "Marcar fechou" / "Marcar perdeu" gera `deal_event` com label real (alimenta active learning da Fase 1).

### 2.3 — Daily Briefing (Semanas 6-7)

- Página inicial `/equity-brain` (atual DashboardPage) ganha bloco "Desde ontem" no topo, antes dos KPIs:
  - Matches novos com score >85 na sua carteira
  - Mandatos parados há >SLA na fase
  - Buyers que atualizaram tese e agora encaixam em N companies suas
  - Notícias relevantes (depois da Fase 3)
- Cada item com CTA primário 1-clique → abre Action Drawer.
- View `eb_advisor_briefing(advisor_id)` SECURITY DEFINER que agrega tudo.

### 2.4 — Alertas inteligentes (Semana 8)

- Tabela `equity_brain.alert_rules` configurável (rule_type, threshold, severity, action_template).
- Engine `process-alerts` cron 15min consome rules, gera `mari_alerts` (advisor_id, severity, deep_link, expires_at).
- Notificação in-app + opcional WhatsApp via Twilio (se conectar).
- Categorias: deal_risk, new_match_high, news_event (Fase 3), score_change, theta_drift, sla_breach.

### 2.5 — Mari Brain proativa (Semanas 9-10)

- Cron diário 8h: para cada advisor, Mari analisa carteira via gemini-2.5-pro e gera 3 sugestões em `mari_proactive_suggestions`.
- UI: chip "Mari sugere (3)" no AppShell topbar; modal com sugestões + botão "Aceitar" que executa ação (rascunhar email, agendar atividade, etc.).
- Resumo semanal automático segunda 8h: "Sua semana — 3 wins, 2 risks, 5 ações sugeridas" via notification + email opcional.
- Análise de call: upload de transcrição → Claude classifica tese, atualiza thetas, gera follow-up sugerido. (Já existe parte; adicionar gatilho automático e vinculação ao deal_event.)

---

## FASE 1 — Modelo (Semanas 3-11) — Bayesiano honesto + active learning

**Decisão calibrada:** com 220 contacted + 1 nda_signed + 0 outcomes, Logistic Regression é overfit garantido. Estratégia revisada:

### 1.A — Feature Store (Semanas 3-4)
- Tabelas `equity_brain.feature_store_pair`, `feature_store_company`, `feature_store_buyer` com `feature_set_version` e `snapshot_date`.
- Job batch noturno materializa as 3.
- Aceite: replicabilidade temporal exata (`AS OF '2026-04-01'` retorna mesmo score que aquele dia gerou).

### 1.B — Active Learning UI (Semanas 4-5) — gera os labels que faltam

**Sub-fase mais crítica.** Sem isto, ML nunca acontece.

- Tabela `equity_brain.training_labels` (pair_id, label_type, label_value, label_date, labeled_by, confidence, is_synthetic).
- UI 1-clique no Match Detail e no Action Drawer: 4 botões grandes "Fechou" / "Em andamento" / "Perdeu" / "Não relevante" → grava label + deal_event correspondente.
- Backfill semi-automático dos 317 mandatos existentes: se `outcome IN ('vendemos','concluido')` → label closed_won; se `outcome IN ('cancelado','vendeu_sozinho')` → label closed_lost. Esperado: ~50-100 labels reais sem clique humano.
- Synthetic negatives: 200 pares óbvios negativos (mineração + farmácia, geografia oposta) com `is_synthetic=true` e peso 0.3 no treino futuro.
- Dashboard `/equity-brain/admin/labels`: contador de labels reais por tipo, meta visível (precisamos 150+ closed para tentar Logistic).

### 1.C — Bayesiano refinado (Semanas 6-7)

- Já existe `buyer_revealed_thetas` com update Bayesiano. Refinar:
  - Adicionar **conformal prediction wrapper** ao redor do score atual: gera `score_lower_90` e `score_upper_90` honestos. Se incerteza alta → IC largo → UI mostra "explore mais antes de priorizar".
  - **Calibração isotônica** mensal usando training_labels acumulados.
  - Brier score tracking em `mari_ops.model_metrics`.
- Entregável real: matching v2 ganha IC 90% que aparece na UI como banda em vez de número único.

### 1.D — Coarse layer (Semana 8 + Semana 11)

- Função `equity_brain.calc_coarse_score(cnpj)` com 5-7 features baratas (setor RFB, UF, idade, faturamento estimado, sucessão proxy).
- Particionamento de companies por UF, paralelização via 27 edge function invocations concorrentes.
- Semana 8: rodar nas 200k companies já no banco.
- Semana 11: expandir para 1MM (Sul + Sudeste via import RFB chunked).
- Aceite: batch noturno completa <4h, todas com `coarse_score` + IC.

### 1.E — Logistic supervisionado (Semana 10, condicional)

- **Só executa se `training_labels` tiver ≥150 labels reais (closed/lost).** Caso contrário, vira backlog e ficamos no Bayesiano + IC.
- Logistic Regression L2 em Python via edge function ou export para serviço externo.
- Ensemble: `p_final = α·p_bayes + (1-α)·p_supervised`, α aprendido por CV.

---

## FASE 3 — Notícias gratuito (Semanas 7-12)

**Decisão:** Google News RSS + crawl direto (sem Firecrawl). Aceitando trade-off de qualidade vs custo zero.

### Semana 7 — Audit + fontes RSS
- Documento `news_pipeline_audit.md` com ponto exato de quebra das 4 funções existentes.
- Edge function `crawl-google-news-rss` substitui parte do crawl-ma-sources. Para cada mandato vivo, query: `"<razao_social>" OR "<codename público>" site:valor.globo.com OR site:braziljournal.com OR site:neofeed.com.br`.
- Cron hourly por batch de 50 mandatos.
- Fallback: crawl direto via fetch + cheerio dos sitemaps de Brazil Journal, NeoFeed, Pipeline (gratuitos, públicos).

### Semana 8 — Pipeline reforçado
- Reescrever cadeia com wrapper Fase 0:
  ```text
  crawl-google-news-rss (hourly)
     ↓ news_raw
  extract-news-event (5min batch, gemini-2.5-flash-lite)
     ↓ company_news estruturado
  classify-news-impact (NOVO, gemini-2.5-flash) — positivo/negativo/neutro + magnitude
     ↓ company_signals
  news-to-crm-alert (trigger INSERT)
     ↓ mari_alerts
  ```
- Smoke test: ≥1 notícia/dia ingerida para ≥30% dos mandatos vivos.

### Semanas 9-10 — UI /news
- Feed cronológico filtrado por carteira do advisor.
- Card por notícia: empresa, snippet, classificação, impacto sugerido no score, link original.
- Ações inline: "Aplicar impacto" / "Descartar" / "Notificar buyer X".
- Integração com timeline em `/empresa/:cnpj`.

### Semanas 11-12 — Loop de feedback
- Advisor marca útil/ruído → alimenta re-treino mensal do classifier.
- Métrica em `mari_ops.model_metrics`: precisão das classificações.

---

## Dependências e riscos

```text
Fase 0 (infra) ─────────────┐
                             ├──> tudo depende
Fase 2.0 (CRM ownership) ───┘    de wrapper + dashboard

Fase 1.B (active learning) ──> Fase 1.E (Logistic) — bloqueada por labels
Fase 2.2 (Action Drawer) ───> alimenta labels da Fase 1.B (sinergia)
Fase 3 (RSS gratuito) ──────> risco de qualidade baixa; gate na semana 10
                              decide se migramos para Firecrawl pago
```

**Risco #1:** RSS gratuito pode entregar <30% de cobertura. Mitigação: gate na semana 10 com decisão go/no-go para Firecrawl (~US$ 50/mês).

**Risco #2:** Active learning pode não gerar 150 labels em 6 semanas. Mitigação: backfill heurístico dos 317 mandatos existentes deve render 50-100 labels já na semana 5; advisor precisa tocar 1 botão para os outros 50-100.

**Risco #3:** Fase 0 vira projeto-de-plataforma. Mitigação: escopo híbrido escolhido + deadline rígido semana 3.

---

## Próximos passos ao aprovar

Começo pela **Semana 1 em paralelo**:
1. Fase 0 — schema `mari_ops` + wrapper observability + aplicar nas 10 críticas.
2. Fase 2.0 — schema `co_advisor_ids` + view `eb_my_companies_v2` + tela `/equity-brain/crm/admin/atribuicoes` para você distribuir os 230 mandatos órfãos em 1 sessão.

Posso começar?