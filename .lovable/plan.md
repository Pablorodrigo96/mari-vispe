# Fase F1 — Mapa do Pipeline + BuyerDetailPage editável

## Diagnóstico (já feito)

- `equity_brain.companies`: 394 total · 249 qualified · **0 com lat/long** (precisa geocodar tudo).
- 529 mandates · 503 buyers.
- Leaflet 1.9 e leaflet.markercluster já instalados (vanilla, padrão do projeto). **Não vou instalar `react-leaflet`** — bate na regra Core "interactive maps via vanilla Leaflet".
- Mapa atual `BrasilMap.tsx` (usado em `MapaPage`) usa choropleth/cluster por UF/município via views agregadas (`eb_v_opportunities_by_uf/_by_municipio`), **não consome lat/long de companies**. Por isso "não funciona" pra ver mandato individual — é outro modelo.
- `BuyerDetailPage` já tem 5 tabs (Visão geral, Matches, Notícias, WhatsApp, Documentos), mas **sem edição inline** dos campos (preferências/tese/contato).

## F.1 — Mapa do Pipeline funcionando

Estratégia: **manter `BrasilMap` (choropleth nacional) e adicionar uma view nova "mandatos"** dentro do MapaPage com markers individuais por mandato, agrupados via cluster.

### Migration `..._companies_geocoding.sql`
- `ALTER TABLE equity_brain.companies ADD COLUMN IF NOT EXISTS latitude double precision, longitude double precision, geocoded_at timestamptz, geocoded_source text`.
- Index `idx_companies_geo (latitude, longitude) WHERE latitude IS NOT NULL`.
- View `equity_brain.eb_v_mandate_pins`: `id, titulo, fase, latitude, longitude, razao_social, cnpj, municipio, uf, faturamento_estimado` (join `mandates` ↔ `companies` por `company_cnpj`).

### Edge function `geocode-companies-batch`
- Cascata: `cep` via `brasilapi.com.br/api/cep/v2/{cep}` → `municipio + uf` via Nominatim (User-Agent `Vispe-MARI/1.0`, sleep 1.1s entre chamadas Nominatim).
- Body `{ limit?: 100 }`, processa companies com `qualification_status='qualified' AND latitude IS NULL`.
- Atualiza colunas + loga em `mari_ops.health_check`.
- Auth: admin OR service_role.

### Cron `0 2 * * 1` (segundas 2h via `pg_cron` + `pg_net`).

### Componente novo `src/components/equity-brain/MandateMap.tsx`
- Hook vanilla Leaflet (mesmo padrão do `BrasilMap`): `useRef` + `useEffect`, tile CARTO dark, `L.markerClusterGroup`.
- `divIcon` colorido por `fase` (match=blue, cold=zinc, nbo=amber, spa=violet, closed=emerald, cancelado=red).
- Popup: razão social + fase + faturamento + município/UF + link `Abrir mandato →` para `/equity-brain/crm/mandate/{id}`.
- Props: `mandates: { id, fase, latitude, longitude, ... }[]` + `onGeocodeRequest?` opcional.
- Alert no topo se há mandates sem coords (com botão "Geocodificar pendentes" só pra admin).
- Legenda de cores por fase abaixo do mapa.

### Integração em `MapaPage.tsx`
- Adicionar **toggle no topo** "Heat nacional ⇄ Mandatos" (segmented control). Default "Heat nacional" (preserva tela atual).
- Quando "Mandatos": query `eb_v_mandate_pins` + renderiza `<MandateMap />` ocupando o slot do `<BrasilMap />`. Sidebar de filtros é simplificada (só fase + UF).
- Botão "Geocodificar agora" usa `useUserRoles().isAdmin`, invoca a edge function via `supabase.functions.invoke('geocode-companies-batch', { body:{ limit: 200 } })`, toast com resultado, refetch.

### Critérios F.1
- Migration aplicada; índice geo criado; view existe.
- Edge `geocode-companies-batch` deployada e cron agendado.
- Após primeira execução manual via botão admin, ≥80% das 249 qualified com coords.
- Toggle "Mandatos" no MapaPage renderiza markers clusterizados, popup clicável navega.
- Sem regressão na view "Heat nacional".

---

## F.2 — BuyerDetailPage editável

Não vou refazer a página do zero — ela já tem header + 5 tabs (`overview/matches/news/whatsapp/documents`). Vou **estender a tab "Visão geral"** com edição inline e adicionar 2 sub-blocos novos (Tese & Setor, Track Record), além do botão "Enriquecer via IA". Documentos já estão na tab existente — mantenho.

### Migration `..._buyer_detail_fields.sql`
```sql
ALTER TABLE equity_brain.buyers
  ADD COLUMN IF NOT EXISTS tese_text text,
  ADD COLUMN IF NOT EXISTS criterios_exclusao text,
  ADD COLUMN IF NOT EXISTS notas_estrategicas text,
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS linkedin_url text,
  ADD COLUMN IF NOT EXISTS email_contato_principal text,
  ADD COLUMN IF NOT EXISTS telefone_contato text;
```
(Documentos já vivem em `equity_brain.documents` consumido pelo `DocumentsPanel` — não preciso de tabela `buyer_documents` separada nem bucket novo.)

### Componente `EditableField.tsx` (novo, `src/components/equity-brain/`)
- Modos: `text | number | email | url | textarea | select | multiselect`.
- Padrão: label + valor; ícone lápis aparece on-hover; clicou → input + Salvar/Cancelar (`Enter` salva, `Esc` cancela).
- `onSave(value)` async; toast erro/sucesso.
- Tema dark (`bg-zinc-900/40 border-zinc-800`).

### Hook `useUpdateBuyer(buyerId)`
- Mutation: update em `equity_brain.buyers` + insert em `crm_activities` (kind=`field_update`, payload com `field/old/new`) — projeto não tem `audit_logs` mas tem `crm_activities` com timeline; reaproveitar.
- Invalida `useBuyerCrm`.

### Sub-componentes novos sob `src/components/equity-brain/buyer/`
- `BuyerIdentityBlock.tsx` — grid 2 col com EditableField pra: nome, razao_social, cnpj, website, linkedin_url, email_contato_principal, telefone_contato, pe_sponsor_name.
- `BuyerOperationBlock.tsx` — tipo (select), status (select), vertical_principal, ticket_min/max, ufs_interesse (multiselect), setores_interesse (multiselect), subsetores_interesse.
- `BuyerThesisBlock.tsx` — tese_text, criterios_exclusao, notas_estrategicas, sinergias_chave (tag list).
- `BuyerTrackRecordBlock.tsx` — métricas editáveis (deals_realizados, deals_last_12m, avg_multiple_paid_recent, recent_capital_raise_brl) + tabela `benchmark_transactions ILIKE comprador_nome` (com fallback "tabela vazia" se sem dados).
- `EnrichBuyerButton.tsx` — botão Sparkles → invoca edge `enrich-buyer-via-ai` → abre `EnrichReviewModal` com checkboxes por campo + lista de fontes citadas; "Aplicar selecionados" faz update; "Salvar tudo como nota" insere em `crm_activities`.

### Mudanças em `BuyerDetailPage.tsx`
- No header: adicionar botão "Enriquecer via IA" ao lado dos existentes (WhatsApp/BlindTeaser).
- Tab "overview": antes da Timeline, inserir os blocos `BuyerIdentityBlock` + `BuyerOperationBlock` em `<details open>` colapsáveis; manter `ConversationSummary`/`Timeline`/`PreferencesEditor`/`TasksWidget` como estão.
- Adicionar **2 tabs novas**: `Tese` (BuyerThesisBlock) e `Track` (BuyerTrackRecordBlock). Ordem final: Visão geral · Tese · Track · Matches · Notícias · WhatsApp · Documentos.

### Edge function `enrich-buyer-via-ai`
- Auth: advisor OR admin.
- Body: `{ buyer_id }`.
- **Usa Lovable AI Gateway com `google/gemini-2.5-flash`** (não Perplexity — projeto não tem `PERPLEXITY_API_KEY` configurada; AI Gateway é a regra do projeto). Para web search, usar prompt instruindo Gemini a sugerir "fontes prováveis" com URLs candidatas (não citações reais). **Nota:** se Pablo quiser web search verdadeiro com citações, requer `PERPLEXITY_API_KEY` — vou perguntar via toast/comentário, mas a versão default fica em Gemini.
- Retorna `{ suggested: { tese_atualizada, deals_recentes[], ultima_captacao, equipe_chave[], setores_foco[], regioes_foco[] }, citations: [] }`.
- Loga em `mari_ops.health_check`.

### Critérios F.2
- Migration aplicada (7 colunas novas em buyers).
- `EditableField` funciona em ≥15 campos do BuyerDetailPage.
- Cada save grava entrada em `crm_activities` (kind=`field_update`).
- Botão "Enriquecer via IA" abre modal com sugestões + lista de fontes; aplicar atualiza só campos marcados.
- Tabs novas (Tese, Track) renderizam sem quebrar as existentes.
- Skeleton em cada tab durante loading.

---

## Arquivos

**Novos**
- `supabase/migrations/<ts>_companies_geocoding.sql` (colunas + index + view `eb_v_mandate_pins`).
- `supabase/migrations/<ts>_buyer_detail_fields.sql` (7 colunas).
- `supabase/functions/geocode-companies-batch/index.ts`.
- `supabase/functions/enrich-buyer-via-ai/index.ts`.
- `src/components/equity-brain/MandateMap.tsx`.
- `src/components/equity-brain/EditableField.tsx`.
- `src/components/equity-brain/buyer/BuyerIdentityBlock.tsx`.
- `src/components/equity-brain/buyer/BuyerOperationBlock.tsx`.
- `src/components/equity-brain/buyer/BuyerThesisBlock.tsx`.
- `src/components/equity-brain/buyer/BuyerTrackRecordBlock.tsx`.
- `src/components/equity-brain/buyer/EnrichBuyerButton.tsx`.
- `src/components/equity-brain/buyer/EnrichReviewModal.tsx`.
- `src/hooks/useUpdateBuyer.ts`.

**Editados**
- `src/pages/equity-brain/MapaPage.tsx` — toggle Heat ⇄ Mandatos.
- `src/pages/equity-brain/BuyerDetailPage.tsx` — header + tabs Tese/Track + blocos editáveis em overview.

**Inserts pós-migration (não migration)**
- Cron `pg_cron` `0 2 * * 1` chamando `geocode-companies-batch` via `pg_net`.

## Fora de escopo
F.2 do documento original (Drawer Hoje + Mandate NBA) — Pablo pediu para parar após F1 e aprovar.

Posso prosseguir?
