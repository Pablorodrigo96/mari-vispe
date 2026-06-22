---
name: Equity Planner Wave 8 — Ponte EB
description: Promote assessment → mandato no EB CRM via RPC idempotente
type: feature
---

## Onda 8 — Ponte Equity Planner ↔ EB

**Objetivo:** botão "Promover a mandato" no `/equity-planner/:id` cria registro em `equity_brain.mandates` herdando empresa + valuation, idempotente.

### Schema
- `equity_assessments` ganhou `promoted_mandate_id`, `promoted_at`, `promoted_by`.

### RPC `public.promote_assessment_to_mandate(_assessment_id uuid)`
SECURITY DEFINER. Fluxo:
1. Autoriza: dono OU admin/advisor.
2. Exige `status='computed'`.
3. Se já promovido → retorna `{mandate_id, already_promoted:true}`.
4. Normaliza CNPJ (14 dígitos).
5. UPSERT em `equity_brain.companies` (source `equity_planner`).
6. Reaproveita mandato vigente existente ou cria novo com `valor_pedido = valuation.valor_atual`, `source='equity_planner'`.
7. Loga `crm_activities` (kind=note, direction=system) com payload do assessment.
8. Atualiza `equity_assessments.promoted_mandate_id`.

### UI
- Badge "Mandato ativo no EB" no header quando promovido (clicável).
- Botão alterna: "Promover a mandato" (volt) ↔ "Abrir mandato" (emerald) após promoção.
- Erros mapeados: `cnpj_invalido`, `not_authorized`, `not_computed`.
- Abre `/equity-brain/crm/mandate/:id` em nova aba após sucesso.
