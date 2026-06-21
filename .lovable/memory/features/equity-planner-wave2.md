---
name: Equity Planner Wave 2 — Docs & Loop
description: Onda 2 do Equity Planner: upload de docs com extração IA + loop de re-medição.
type: feature
---
Bucket privado `equity-planner-docs` (RLS por user_id/folder name). Tabela `equity_company_documents` (RLS owner-only) guarda metadados + `extracted_json` + `extraction_summary`.

Edge function `equity-planner-extract` (Claude Sonnet 4.6 com bloco `document` para PDF; fallback Gemini 2.5-pro): cria bucket lazily se faltar, baixa via service role, devolve JSON com financeiro/governança/contratos/sinais/lacunas. Resumo é injetado em `equity-planner-compute` como "VERDADE DOCUMENTAL" antes do prompt.

UI: `EquityDocsUpload` reusável, embutido na wizard (steps 4/5) e na aba "Docs" do Assessment. "Re-medir" no topo do Assessment já chama compute → snapshot em `equity_progress_log`.
