---
name: Pipeline stages SLA & history
description: Kanban com etapas configuráveis (eb_pipeline_stages), SLA por etapa, badge de tempo/congelada e histórico automático em eb_pipeline_transitions via trigger em equity_brain.mandates.
type: feature
---

- Tabela `public.eb_pipeline_stages` (key, label, color, position, sla_days, is_terminal, archived_at) — admin gerencia via `PipelineStagesEditor`.
- Tabela `public.eb_pipeline_transitions` populada por trigger `eb_log_pipeline_transition` em `equity_brain.mandates` (BEFORE UPDATE) sempre que `pipeline_stage` ou `outcome` mudam; também atualiza `stage_changed_at`.
- Hook `usePipelineStages` substitui `PIPELINE_STAGES` hardcoded; `dealFormatters` continua como fallback de labels.
- Badge `StageTimeBadge` mostra dias na etapa; vermelho+❄️ quando `days >= sla_days` (estado "frozen"). Botão "reanimar" reseta `stage_changed_at`.
- Página `/equity-brain/crm/pipeline/historico` agrega tempos médios por etapa, total por mandato, lista últimas transições.
- Aba `MandateTransitionsTab` disponível para integrar em MandateDetailPage quando houver tabs.
- **Bug crítico corrigido**: Kanban antes pedia coluna inexistente `data_assinatura_contrato` (real: `data_assinatura`), retornando 400 e deixando todas as colunas vazias.
