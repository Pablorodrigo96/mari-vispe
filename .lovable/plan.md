## Biblioteca de Documentos Legais

Nova página central que agrupa **todos os documentos** (gerados por IA + uploads) com identificação clara do cliente/deal a que pertencem.

### Rota e navegação
- Nova rota: `/equity-brain/legal/biblioteca`
- Item na sidebar EB dentro do grupo "Jurídico" (mesmo agrupamento do `LegalDocsMenu`)
- Atalho também no header de `/equity-brain/par/:id` e em `LegalDocsMenu`

### Layout (estilo Bloomberg, dark, padrão EB)

```text
┌─────────────────────────────────────────────────────────┐
│ Busca │ Tipo ▾ │ Status ▾ │ Cliente ▾ │ Período ▾      │
├─────────────────────────────────────────────────────────┤
│ Cliente / Par                  │ Doc │ Status │ Data    │
│ ─────────────────────────────────────────────────────── │
│ ▸ MARI-TEC-0012 ↔ Buyer Acme   │ NDA │ Assin. │ 22/05  │
│   Mandato: SaaS B2B SP         │ NBO │ Hom.   │ 20/05  │
│ ▸ MARI-IND-0007                │ SPA │ Draft  │ 18/05  │
└─────────────────────────────────────────────────────────┘
```

- **Agrupamento padrão por cliente** (deal_pair ou mandate): cabeçalho mostra **codinome do vendedor** + **comprador** + advisor responsável. Não revela identidade real para quem não tem permissão (respeita `eb_can_view_identity`).
- Cada linha de doc mostra: tipo (NDA/NBO/TS/SPA/outros), versão, status (draft / pending_signature / homologation / signed / archived), IA usada (provider+model), score crítico, data, autor.
- Coluna "Cliente" sempre presente — resolvida via `deal_pair_id → sell_mandate → company_codename` (+ buyer label). Para uploads `crm_documents`, mostra a entidade vinculada (mandate/buyer).

### Filtros
- Texto livre (label, codinome, CNPJ se autorizado)
- Tipo (template_code / category)
- Status (incluindo "Aguardando homologação", "Aguardando assinatura")
- Cliente (autocomplete de pares/mandatos do usuário)
- Período (created_at)
- Origem: **IA gerados** | **Uploads CRM** | **VDR Marketplace** | **Cadastro**

### Ações por linha
- Abrir preview (usa `WordPreview` já existente para markdown)
- Baixar (signed URL `deal-documents` ou link do conteúdo)
- Copiar link público (assinatura/homologação) quando aplicável
- Ir para o deal/par (`/equity-brain/par/:id` ou `/equity-brain/deal/:id`)
- Arquivar (admin/legal/advisor responsável)

### Fontes de dados (read-only, sem mudança de schema)
Hook novo `useLegalLibrary()` que faz fan-out e unifica em um único array:
1. `deal_documents` (todos os contratos gerados — NDA, NBO, TS, SPA)
2. `crm_documents` (uploads de NDA/teaser/infopack do CRM)
3. `vdr_documents` + `listing_financial_docs` (quando o par tem listing vinculada)

Resolução de cliente:
- `deal_documents.deal_pair_id` → join com `deal_pairs` → `sell_mandate` (codinome) + `buyer_profile`/`buy_mandate`
- Fallback: `deal_documents.deal_id` → `deals`
- `crm_documents` → `entity_type/entity_id` (mandate ou buyer)

RLS atual já filtra corretamente (admin/advisor/legal/observer veem tudo, buyer só com acesso ativo + `visible_to_buyer`). Não precisa migration.

### Indicador de geração em background
Reusa o `GenerationTracker` global: docs em geração aparecem no topo da biblioteca com badge "Gerando…" (linha placeholder) e somem quando completam.

### Arquivos a criar/editar

**Criar**
- `src/pages/equity-brain/LegalLibraryPage.tsx` — página principal
- `src/hooks/useLegalLibrary.ts` — fan-out + unificação + filtros
- `src/components/legal/LibraryRow.tsx` — linha de tabela com ações
- `src/components/legal/LibraryFilters.tsx` — barra de filtros

**Editar**
- `src/App.tsx` — registrar rota
- `src/components/equity-brain/AppSidebar.tsx` (ou equivalente) — adicionar item "Biblioteca de documentos" no grupo Jurídico
- `src/components/legal/LegalDocsMenu.tsx` — link "Abrir biblioteca completa"

### Memória a atualizar
- `mem://features/legal-document-ai-pipeline` → acrescentar entrada sobre a biblioteca central e a regra "todo documento exibido precisa mostrar o cliente (codinome ou entidade vinculada)".

### Fora do escopo
- Não cria PDFs no Storage automaticamente (geração permanece markdown em `deal_documents.generated_body`; download segue via `window.print()` da página de assinatura)
- Sem mudanças em schema, RLS ou edge functions
- Sem mexer em `/legal/assinatura` ou `/legal/homologacao`
