# Diagnóstico

### 1) Modificações vindas do GitHub (Claude Code) ✅ refletidas
Os commits do PR #1 (`claude/improve-anthropic-integration`) já estão no repo e em contexto. Identifiquei:
- `feat(1,2)`: troca de modelos (opus 4-1→4-7, sonnet 4-5→4-6) + `AbortController` + prompt caching
- `feat(3)`: toast de detecção de gaps
- `feat(5)`: `Promise.allSettled` + retry com backoff exponencial por seção
- `feat(6)`: pass de self-critique opcional (`use_self_critique`)
- `docs`: guia da integração Anthropic
- Frontend: suporte ao toggle de self-critique

Tudo já está aplicado no projeto (merge `8ab04fa0` + commits subsequentes "Changes" do meu próprio loop anterior).

### 2) Erro 404 em NBO / NDA / SPA / Term Sheet — causa raiz encontrada
Logs da edge `mari-generate-document` mostram **POST 404 consistente** em todas as tentativas. Ao inspecionar:

- A função busca o contexto em `public.deals` (linha 78–83 de `index.ts`).
- **A tabela `deals` NÃO existe** no banco. Só existem `deal_pairs`, `deal_documents`, `deal_timeline`, etc.
- O `LegalDocsMenu` no Kanban passa `dealId={m.id}` onde `m.id` é o **id do mandate (eb_companies)**, não de `deals`.
- Resultado: `deal_not_found` (404) para qualquer template (NBO, NDA, SPA, TS).
- O mesmo bug afeta `DealPairDetailPage`, que passa `pair.sell_mandate_id` como `dealId` → mesma 404.

Ou seja: o botão "Docs" nunca funcionou em nenhum dos 4 templates — não é específico do NBO.

---

# Plano de correção

Vou ajustar a edge function para aceitar `mandate_id` (id de `eb_companies` / mandato), que é o que o Kanban e o Par realmente possuem, e atualizar os dois call-sites do `LegalDocsMenu` para enviar esse campo.

### 1. Edge function `mari-generate-document`
- Adicionar `mandate_id?: string` no `ReqBody`.
- Aceitar a requisição quando vier `deal_id` **OU** `deal_pair_id` **OU** `mandate_id` (hoje só os 2 primeiros).
- Quando `mandate_id` for enviado:
  - Buscar `eb_companies` por `id = mandate_id` → usar `codename` como `contextCodename`.
  - Persistir em `deal_documents` referenciando o mandate (campo equivalente já usado pelo fluxo do Par).
- Manter `deal_id` por compatibilidade (caso a tabela exista futuramente).

### 2. Frontend — `LegalDocsMenu`
- Trocar a prop `dealId` por uma união `{ mandateId?: string; dealPairId?: string }` (sem quebrar nada — usar `mandateId` como principal).
- Repassar `mandate_id` (ou `deal_pair_id`) ao `LegalDocumentGenerator` → corpo da requisição.

### 3. Call-sites
- `PipelineKanbanPage.tsx` (linha 508): `<LegalDocsMenu mandateId={m.id} … />`
- `DealPairDetailPage.tsx`: `<LegalDocsMenu dealPairId={pair.id} … />` (em vez de `sell_mandate_id`).
- `UnifiedDealPage.tsx`: avaliar se `LegalDocumentGenerator` direto continua usando `dealId` real (ver se há fonte válida) — se não, migrar para `mandateId`.

### 4. Validação
- Após o deploy, abrir Kanban → "Docs" → "Gerar NDA" → conferir resposta 200 e linha em `deal_documents`.
- Repetir para NBO, Term Sheet e SPA.
- Verificar logs da edge para garantir que não há mais 404.

### Fora do escopo
- Não vou criar a tabela `deals` (não é necessária — o domínio atual é mandate + pair).
- Não vou mexer no fluxo de assinatura (`clicksign-mock`) nem nos templates em si.
- Não vou tocar nas melhorias do Anthropic recém-mergeadas.

### Arquivos a alterar
- `supabase/functions/mari-generate-document/index.ts`
- `src/components/legal/LegalDocsMenu.tsx`
- `src/components/legal/LegalDocumentGenerator.tsx` (aceitar `mandateId`/`dealPairId`)
- `src/pages/equity-brain/PipelineKanbanPage.tsx`
- `src/pages/equity-brain/DealPairDetailPage.tsx`
- Possivelmente `src/pages/equity-brain/UnifiedDealPage.tsx`
- Atualizar `mem/features/legal-docs-entry-points.md`

Posso prosseguir?
