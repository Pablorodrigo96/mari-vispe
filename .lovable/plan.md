## Objetivo

Replicar a experiência da tela de detalhe da captação (`/minhas-captacoes/:id`) para os anúncios do vendedor, criando um "cockpit do anúncio" com pipeline, resumo, score, compradores interessados, próximos passos, checklist de documentos e WhatsApp. Documentos enviados em um lado (anúncio ou captação) aparecem automaticamente no outro.

## Telas e mudanças

### 1. Nova rota: `/meus-anuncios/:id` (`ListingCockpit.tsx`)

Layout idêntico ao `CapitalRequestDetail.tsx`, em 3 colunas:

**Coluna principal (2/3):**
- Header: voltar · título do anúncio (codename + título) · badge de status (`pending` / `active` / `paused` / `sold`) · botão "Editar anúncio" → `/editar-anuncio/:id`
- Barra "Progresso geral" (combina docs enviados + status do anúncio + completude do cadastro)
- Card **Pipeline** (`ListingTimeline`) com 5 etapas: Cadastrado → Em Análise → Publicado → Compradores Interessados → Negociação/Vendido
- Card **Documentos** (componente compartilhado, ver §3)
- Card **Fale com um Analista** com botão WhatsApp (mesmo padrão visual do print)
- Botão **Baixar Relatório PDF** (`window.print()` com header de impressão idêntico)

**Coluna lateral (1/3):**
- Card **Resumo**: nome, codename, categoria, faturamento anual, ticket pedido, data de criação
- Card **Equity Score** (reutiliza `CapitalScoreCard` com `equity_score` da listing — fallback "calcule via Valuation")
- Card **Compradores Interessados (N)**: lista compradores que demonstraram interesse via `partner_opportunity_interests` + matches do `MatchingBuyers` com barra de score (mesmo visual de "Provedores")
- Card **Próximos Passos** dinâmico por status:
  - `pending`: "Envie documentos para acelerar publicação", "Complete dados financeiros para gerar Equity Score", "Após análise, publicaremos para nossa rede de compradores"
  - `active`: "Seu anúncio está visível no marketplace", "Compradores qualificados receberão alertas", "Acompanhe interessados aqui"
  - etc.

### 2. Entrada na lista `MyListings.tsx`

Card de cada anúncio fica clicável → `/meus-anuncios/:id`. Adicionar item "Cockpit" no `DropdownMenu` (acima de "Visualizar"). "Visualizar" continua indo para `/anuncio/:id` (visão pública).

### 3. Componente compartilhado `EntityDocChecklist`

Refatorar `CapitalDocChecklist.tsx` em um `EntityDocChecklist` genérico que aceita `scope: 'capital' | 'listing'` + `entityId`. Mesma UI (obrigatórios + opcionais + barra + dica em verde). Mesma lista de tipos de documento (`contrato_social`, `balancete`, `dre`, `comprovante_faturamento`, `irpj`, `certidao_negativa`, `extratos_bancarios`, `relatorio_vendas`).

`CapitalDocChecklist` vira um wrapper fino em torno de `EntityDocChecklist scope="capital"` para não quebrar callers.

### 4. Sync automático de documentos (Anúncio ↔ Captação)

Critério: documentos pertencem ao **usuário** (não à captação ou anúncio individualmente). Ao enviar em qualquer lado:

1. Arquivo sobe para o bucket `financial-docs` em `${user_id}/shared/${doc_type}_${ts}_${name}` (caminho compartilhado, não mais aninhado por `requestId`/`listingId`).
2. Edge Function nova `sync-user-doc` (chamada após upload) faz INSERT do mesmo registro em:
   - `capital_documents` para **todas** as `capital_requests` ativas do usuário (`status != 'closed'`)
   - `listing_financial_docs` para **todos** os `listings` do usuário com `status in ('pending','active')`
3. Deduplicação: antes de inserir, verifica se já existe row com mesmo `(entity_id, doc_type, file_url)`.
4. Trigger de score (`update_lead_score_on_doc`) continua funcionando normalmente em cada lado.

Resultado prático: sobe Contrato Social no cockpit do anúncio → aparece automaticamente em todas as captações do usuário com status "Enviado", e vice-versa.

### 5. Migração SQL

- Adicionar coluna `doc_type text` em `listing_financial_docs` (default `'outro'`) para alinhar com `capital_documents`.
- Adicionar coluna `source_doc_id uuid` em ambas as tabelas (rastreia qual upload original gerou o espelho — útil para deletar em cascata no futuro).
- Index em `(user_id, doc_type)` em ambas para a lookup do sync.
- Função `has_user_doc(_user_id uuid, _doc_type text)` retornando boolean (usada pelo cockpit do anúncio para mostrar status sem precisar varrer tabelas).

### 6. Detalhes técnicos

- `ListingTimeline.tsx`: novo componente espelhado em `CapitalTimeline` (5 ícones com check progressivo).
- WhatsApp button reusa `getWhatsAppLink(5551992338258)` (memória existente).
- Print CSS replicado (header de impressão "Relatório do Anúncio — mari").
- Tooltip (i) padronizado em cards seguindo `mem://style/info-hints-pattern`.
- `RequireRole` não muda — qualquer dono do listing acessa.

## Arquivos

**Novos:**
- `src/pages/ListingCockpit.tsx`
- `src/components/listing/ListingTimeline.tsx`
- `src/components/shared/EntityDocChecklist.tsx`
- `supabase/functions/sync-user-doc/index.ts`
- `supabase/migrations/<ts>_listing_doc_sync.sql`

**Editados:**
- `src/App.tsx` (rota `/meus-anuncios/:id`)
- `src/pages/MyListings.tsx` (card clicável + item no menu)
- `src/components/capital/CapitalDocChecklist.tsx` (vira wrapper, chama edge function de sync após insert)
- `mem://index.md` + nova memória `mem://features/listing-cockpit-and-doc-sync`

Sem alterar `/anuncio/:id` (visão pública) nem o fluxo de captação atual.
