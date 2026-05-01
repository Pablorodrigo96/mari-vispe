---
name: CRM Audit Phases 2-6
description: Pipeline operacional automático, auditoria CRM, Minhas Empresas, import sem CNPJ e MarketPulse no Executivo.
type: feature
---

- **Fase 2 — Pipeline operacional**: função `equity_brain.auto_promote_pipeline_stage()` aplica regras (outcome terminal→closed, data_assinatura→closing, comprador vinculado→nbo, mandato real com valor+contato→nbo). Destravou 229/317 mandatos presos em "match". `PipelineKanbanPage` agora usa `eb_mandates_enriched` (mostra `display_name`/codename), badges de `deal_kind` coloridos, filtros (Mandatos reais / Sem mandato / Marketplace / Buyers / Todos) com contadores e badge `⚠ enrich` para `needs_enrichment`.
- **Fase 3 — Auditoria CRM**: view `public.eb_crm_audit_v2` com 6 checks (sem responsável, sem valor, sem contato, CNPJ placeholder, presos em match >30d, marketplace pendente). Página `/equity-brain/crm/admin/auditoria-operacional` (`CrmAuditPage`) com cards por severidade + botão "Rebuild CRM" que chama `equity_brain.rebuild_crm_state()` (admin-only: reclassifica + reaplica regras + corrige `stage_changed_at` faltantes). Página `/equity-brain/crm/minhas-empresas` (`MyCompaniesPage`) lista deals do `responsavel_id = auth.uid()` com KPIs (total, valor, closing, NBO).
- **Fase 4 — Import robusto**: `eb-import` (mandates) agora aceita linhas SEM CNPJ — gera placeholder estável (`99999` + hash do nome/contato) e marca `needs_enrichment=true` tanto na company quanto no mandate, emitindo warning no relatório.
- **Fase 5/6 — UI final**: `EBSidebar` ganhou "Minhas Empresas", "Notícias M&A" e "Auditoria CRM". `CrmHubPage` ganhou atalhos para Minhas Empresas / Notícias / Auditoria CRM. `ExecutiveDashboardContent` agora abre com `MarketPulseWidget`. Rota `/equity-brain/news` registrada.
