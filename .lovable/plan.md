# Documentos legais (NDA · NBO · Term Sheet · SPA) acessíveis pelo Pipeline

## Diagnóstico

O gerador (`LegalDocumentGenerator`, que já cobre NDA / NBO / Term Sheet / SPA via IA + homologação + assinatura interna) hoje só está montado em `UnifiedDealPage` (`/equity-brain/deal/:id`). No `/equity-brain/pipeline` (Kanban) e em `/equity-brain/par/:id` o usuário só tem o `Gerar NBO` específico do par, sem entrada para os outros três.

## O que vai mudar (só UI)

### 1. Card do Kanban (`PipelineKanbanPage` → `DealCard`)
Adicionar um botão discreto **"Documentos"** (ícone `FileText`) no rodapé do card, ao lado dos ícones já existentes. Ele abre um `DropdownMenu` com 4 itens:
- Gerar NDA
- Gerar NBO
- Gerar Term Sheet
- Gerar SPA

Cada item abre o `LegalDocumentGenerator` (já é um `Dialog`) com:
- `dealId={card.deal_id}` (mandato do vendedor — é o que o gerador usa hoje)
- categoria inicial pré-selecionada (`nda` / `nbo` / `ts` / `spa`)

Para suportar pré-seleção, estender `LegalDocumentGenerator`:
- nova prop opcional `initialCategory?: "nda" | "nbo" | "ts" | "spa"`
- nova prop opcional `defaultOpen?: boolean` + `onOpenChange?: (o:boolean)=>void` para uso controlado
- nova prop opcional `triggerless?: boolean` para esconder o trigger interno quando o pai controla a abertura via menu

Gate: só renderizar o botão para `isAdmin || isAdvisor || isLegal` (usar `useUserRoles`).

### 2. Página do Par (`DealPairDetailPage`)
Substituir o botão único `Gerar NBO` do header por um bloco **"Documentos legais"** abaixo de `PairClosingEmailsCard`, com 4 botões lado a lado (NDA · NBO · Term Sheet · SPA) — mesma mecânica do Kanban.

- NBO continua tendo, em adição, o atalho para o wizard guiado existente (`/equity-brain/par/:id/nbo`), apresentado como link secundário "Usar wizard passo-a-passo" dentro do card NBO. Wizard atual fica intacto.
- `dealId` para o gerador = `pair.sell_mandate_id`.

Listagem dos documentos já criados continua vinda do `LegalDocumentGenerator` (ele já mostra histórico por categoria via `useLegalDocuments(dealId)`).

### 3. Sem mudanças de backend
- `doc_templates`, `clicksign-mock`, `mari-generate-document`, RLS, edge functions — tudo permanece.
- Nenhuma migration.

## Arquivos tocados
- `src/components/legal/LegalDocumentGenerator.tsx` — adicionar props `initialCategory`, `defaultOpen`, `onOpenChange`, `triggerless`.
- `src/pages/equity-brain/PipelineKanbanPage.tsx` — novo botão "Documentos" + dropdown no `DealCard` (gate por role).
- `src/pages/equity-brain/DealPairDetailPage.tsx` — remover botão isolado "Gerar NBO" do header, adicionar bloco "Documentos legais" com 4 ações + atalho para o NBO Wizard.

## Memória
Atualizar `mem/features/legal-document-ai-pipeline.md` indicando os novos pontos de entrada (Kanban card + Pair detail), além do `UnifiedDealPage`.

## Fora de escopo
- Mudar fluxo de assinatura, templates ou homologação.
- Mudar o NBO Wizard (`NboWizardPage`).
- Disparo automático de NDA do deal-room (segue só pelo trigger atual).
