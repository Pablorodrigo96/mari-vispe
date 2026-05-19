---
name: Identity Access Audit (implicit disclosure)
description: Auto-log de visualizações de identidade real em access_logs (modo implicit/explicit) com RPC eb_log_identity_access e tela /equity-brain/crm/admin/auditoria.
type: feature
---

Toda visualização de identidade real por advisor/admin é auto-logada como `disclosure_mode='implicit'` em `equity_brain.access_logs` (sem fricção, sem aprovação).

**Schema:** access_logs ganhou `disclosure_mode`, `context`, `cnpj`.
**RPC:** `public.eb_log_identity_access(p_entity_type, p_entity_id, p_cnpj, p_context, p_disclosure_mode)` — SECURITY DEFINER, throttle 1h server-side.
**View:** `public.eb_access_logs_v` (security_invoker) faz join com profiles + companies para listar advisor_name/codename/razão.
**Hook:** `useLogIdentityAccess` + `useAutoLogIdentityAccess` (throttle client 5min/key).
**Pontos instrumentados:** IdentityRevealCard (mount + expand), BlindTeaserButton (open), DocumentsPanel (mount com cnpj).
**Painel:** `/equity-brain/crm/admin/auditoria` mostra KPIs (implicit vs explicit), filtros, export CSV.

Disclosure explícito (NDA aprovado) continua usando `/equity-brain/disclosures` + `eb_decide_disclosure`.
