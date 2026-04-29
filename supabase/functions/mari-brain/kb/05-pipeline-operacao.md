# Pipeline e operação do CRM

## Etapas (configuráveis)
Tabela `eb_pipeline_stages`:
- `key` (slug), `label`, `position`, `color`, `sla_days`, `is_terminal`.
- Admin edita via `PipelineStagesEditor` no Kanban.

Etapas padrão sugeridas (M&A):
1. **lead** (SLA 3d) — match qualificado, ainda não contatado.
2. **contato** (SLA 5d) — primeiro outreach feito.
3. **nda** (SLA 7d) — NDA assinado, teaser revelado.
4. **iim** (SLA 14d) — Information Memorandum enviado.
5. **ioi** (SLA 14d) — Indication of Interest recebida.
6. **due_diligence** (SLA 30d) — DD em andamento.
7. **loi** (SLA 21d) — Letter of Intent.
8. **spa** (SLA 30d) — Sale Purchase Agreement.
9. **closing** (SLA 7d) — fechamento e signing.
10. **closed_won** (terminal) / **closed_lost** (terminal).

## Transições
Cada movimentação grava em `eb_pipeline_transitions`:
- `from_stage`, `to_stage`, `moved_at`, `time_in_previous_stage_seconds`, `note`.
- Histórico em `/equity-brain/crm/pipeline/historico` mostra duração média por etapa.

## Alertas de oportunidade congelada
- Card vermelho com `StageTimeBadge` quando tempo > sla_days.
- Mari Brain pode listar deals congelados via `get_user_pipeline_snapshot`.

## Atividades (timeline)
Tabela `equity_brain.crm_activities`:
- `kind` (call, email, whatsapp, meeting, note)
- `body`, `created_at`, `entity_type`, `entity_id`.
- Toda interação deve ser logada — alimenta o adaptive loop.

## Disclosure
- Default cego. Advisor solicita identidade via `IdentityRevealCard` em 360.
- Botão `BlindTeaserButton` envia teaser anônimo por WhatsApp.
- Acesso registrado em `access_logs` (LGPD).

## Importação em massa
- `/equity-brain/crm/imports` → upload .xlsx/.csv → edge function `eb-import` popula companies/mandates/buyers/contacts/activities + auto-recálculo de scores.
