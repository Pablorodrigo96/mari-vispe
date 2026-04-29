
# Identidade aberta para advisor/admin + documentos unificados + Blind Teaser no Equity Brain

Três entregas integradas, todas para advisor/admin (e fluxo legado preservado para parceiros/buyers):

1. **Visualizar identidade real** da empresa direto no 360 do EB (sem precisar abrir cadastro original).
2. **Aba Documentos & Pipeline unificada**: agrega `equity_brain.crm_documents` + `public.vdr_documents` + `public.listing_financial_docs` da empresa associada (via CNPJ ↔ listing).
3. **Botão "Ver Blind Teaser"** no 360 do EB (mandate e buyer) que abre `/teaser/:ticker` da listing vinculada, com **log de acesso LGPD** registrado a cada visualização.

Não muda o sistema de codinome existente. Apenas dá poder de "ver tudo" para quem é advisor/admin e centraliza os documentos.

---

## 1. Identity Reveal Card (advisor/admin)

Novo componente `IdentityRevealCard.tsx` no header do `MandateDetailPage` e `BuyerDetailPage`:

- Usa `useIdentityVisibility({ cnpj })` (já existe).
- Se `eb_can_view_identity = true` → mostra card expansível "Identidade real" com:
  - Razão social, nome fantasia, CNPJ formatado, contatos (telefone/email), endereço completo, sócios (se já carregados em `eb_companies.raw_data`).
  - Badge "Visível para advisor/admin" + ícone de cadeado aberto.
- Se `false` → não renderiza nada (mantém o fluxo de disclosure já existente).
- Cada expansão dispara `useAccessLog("identity-view", entityId)` para auditoria LGPD.

Substitui o uso direto de `mandate.razao_social` no header por uma exibição que respeita visibilidade (já é o padrão hoje, mas o card formaliza e loga o acesso).

---

## 2. Aba "Documentos & Pipeline" — fontes unificadas

Refatorar `DocumentsPanel.tsx` para receber, além de `entityType`/`entityId`, um `companyContext?: { cnpj?: string; listingId?: string }` e buscar **3 fontes em paralelo**:

| Fonte | Tabela | Quando aparece |
|---|---|---|
| CRM | `equity_brain.crm_documents` | sempre (lógica atual) |
| Marketplace VDR | `public.vdr_documents` (filtro `listing_id`) | quando o CNPJ tem listing vinculada |
| Cadastro/Contador | `public.listing_financial_docs` (filtro `listing_id`) | quando o CNPJ tem listing vinculada |

UI:
- Filtro por origem (chips: "Todos", "CRM", "VDR", "Cadastro").
- Cada item mostra badge da origem + categoria + data + uploader.
- Documentos do marketplace ficam read-only no painel (download/preview), com link "abrir no marketplace" para gestão.
- Empty state granular: "Nenhum documento — esta empresa não tem listing no marketplace ainda" quando aplicável.

Resolução de listing: nova função em `useCrm.ts` → `useCompanyListing(cnpj)` que retorna `listings` por `cnpj`. Cacheada (RLS já permite admin SELECT em listings).

Pipeline financeiro: já existe (`FinancialPipelinePanel`). Mantém igual; só ganha um aviso quando há `listing_financial_docs.equity_score` recente vindo do marketplace, indicando que os números devem cruzar.

---

## 3. Botão "Ver Blind Teaser" no 360 + log LGPD

Novo componente `BlindTeaserButton.tsx`:

- Recebe `cnpj` ou `listingId`.
- Resolve a `listing` correspondente (mesma `useCompanyListing`).
- Se a listing tem `ticker`, renderiza:
  - Botão **"Ver Blind Teaser"** (ícone Eye, cor Volt) no header das páginas `MandateDetailPage` e `BuyerDetailPage` (ao lado de "Editar mandato").
  - Submenu com 3 ações: **Abrir teaser**, **Copiar link público**, **Compartilhar via WhatsApp** (reutiliza `getWhatsAppLink` e padrões já documentados em `teaser-distribution-tools`).
- Se a listing não existe ou não tem ticker, mostra estado desabilitado com tooltip explicativo.
- Cada ação registra um log via novo hook `useTeaserAccessLog()`:
  - Insere em `equity_brain.access_logs` com `action = 'teaser_view' | 'teaser_share_copy' | 'teaser_share_whatsapp'` e metadata `{ listing_id, ticker, channel }`.
  - Quando o teaser for de fato aberto pelo usuário interno (mesma aba), também grava 1 row em `public.teaser_views` (já existe, RLS permite anyone insert) com `viewer_id = auth.uid()`.

LGPD compliance:
- O `access_logs` (security definer, schema `equity_brain`) já é a trilha auditável.
- `useAccessLog` é estendido para aceitar uma 3ª categoria `"identity-view"` (apenas para o reveal do card de identidade).
- Nenhum dado pessoal novo é exposto ao log; só `user_id`, `entity_type`, `entity_id`, `action`, timestamp.

---

## 4. Pequenas integrações de UX

- Aba **"Documentos"** do `BuyerDetailPage` ganha o mesmo painel unificado, **mas sem fontes de marketplace** (buyer não tem listing). Mantém só `crm_documents`.
- `MandateDetailPage` aba "Documentos & Pipeline": passa `companyContext={ cnpj: mandate.company_cnpj }` para o `DocumentsPanel`.
- `IdentityRevealCard` aparece logo abaixo do header em ambas as páginas (mandate e buyer — quando o buyer tiver `cnpj`).

---

## Detalhes técnicos

- **Sem novas tabelas, sem novas migrations**. Apenas leituras adicionais e logs nas tabelas já existentes (`access_logs`, `teaser_views`).
- **RLS já cobre** o cenário: admin tem `has_role(auth.uid(), 'admin')` e pode SELECT em `listings`, `vdr_documents`, `listing_financial_docs`.
- **Performance**: as 3 queries de documentos rodam em paralelo via `useQueries` do TanStack Query. Cache de 60s por entidade.
- **Memória**: atualizar `mem://features/blind-teaser-universal.md` adicionando seção "Identity reveal & document unification".

---

## Entregáveis

- 3 componentes novos: `IdentityRevealCard.tsx`, `BlindTeaserButton.tsx`, `useCompanyListing.ts`
- 1 hook novo: `useTeaserAccessLog.ts`
- `DocumentsPanel.tsx` refatorado para multi-source com filtros
- `useAccessLog.ts` estendido (action genérica)
- `MandateDetailPage` e `BuyerDetailPage` atualizadas para usar os novos componentes
- Memória atualizada
