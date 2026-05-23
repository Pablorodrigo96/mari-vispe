---
name: Legal docs entry points
description: NDA/NBO/Term Sheet/SPA acessíveis via LegalDocsMenu no card do Kanban e na página do Par, além do UnifiedDealPage.
type: feature
---

`LegalDocumentGenerator` (NDA/NBO/Term Sheet/SPA) está plugado em 3 pontos:
- `/equity-brain/deal/:id` (UnifiedDealPage) — entrada original.
- `/equity-brain/pipeline` (Kanban) — botão "Docs" no rodapé de cada `DealCard` via `LegalDocsMenu`.
- `/equity-brain/par/:id` (DealPairDetailPage) — botão "Documentos legais" no header (usa `pair.sell_mandate_id` como dealId). O botão antigo "Gerar NBO" virou link secundário "NBO Wizard" para o fluxo guiado em `/equity-brain/par/:id/nbo` (intacto).

`LegalDocumentGenerator` agora aceita props opcionais: `initialCategory`, `open`/`onOpenChange` (controlado), `triggerless` (esconde trigger interno). Componente `LegalDocsMenu` (src/components/legal/LegalDocsMenu.tsx) encapsula dropdown + dialog controlado e tem gate `isAdmin || isAdvisor`.
