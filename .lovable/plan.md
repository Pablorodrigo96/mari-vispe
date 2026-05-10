## Bloco 1 — Sincronizar UI ↔ DB (Mandato · Buyer M&A · Empresa)

Bloco 2 (notas polimórficas) entregou. Agora fechamos os gaps entre campos que **já existem no banco** e o que **a UI exibe/edita** para as 3 entidades-foco.

---

### 1. Auditoria rápida (1h, antes do código)

Para cada entidade, comparar 3 lados:
- Colunas reais em `equity_brain.mandates` / `buyers` / `companies` + view enriched
- Campos lidos hoje em `MandateDetailPage`, `BuyerDetailPage`, `DealDetailPage`
- Campos editáveis hoje (forms/inline edits)

Output: tabela `campo | existe DB | mostrado | editável | ação` salva em `.lovable/plan.md`.

---

### 2. Mandato (`/equity-brain/mandato/:id`)

Campos suspeitos faltando na UI (confirmar na auditoria):
- `probability` (%)  → badge no header + editável inline
- `expected_close_at` → no header + edição
- `pipeline_stage` → já existe? validar sync com `eb_pipeline_stages`
- `valor_operacao` / `faturamento_vispe` → card "Financeiro do mandato"
- `regiao` → header
- `temperature_reason` → tooltip no badge de temperatura

Entrega: novo bloco `<MandateSummaryCard/>` no topo da tab "Visão" + edição via `<InlineEditField/>` (já existe no projeto, reusar).

---

### 3. Buyer M&A (`/equity-brain/buyer/:id`)

Campos suspeitos faltando:
- `archetype_id` → chip com link pro arquétipo
- `pause_signal` + razão → banner amarelo no topo se ativo
- `prioridade_global` → badge no header
- `cautela_flag` + `cautela_motivo` → banner vermelho no topo se ativo
- `vertical_principal` → chip
- `observacoes` → já migrado pra notas em Bloco 2; remover do form se ainda aparece

Entrega: `<BuyerAlertsBanner/>` (pause/cautela) + chips no header.

---

### 4. Empresa (`/equity-brain/empresa/:cnpj`)

Hoje só tem `DealDetailPage` com 2 tabs (Visão/Notas). Expor:
- `codename` (já tem?)
- `qualification_status` + `qualified_at` + `qualified_by` → badge + tooltip
- `linked_buyer_id` → link card "Comprador vinculado"
- `embedding_computed_at` → indicador "Indexada na IA" (verde/cinza)
- `raw_data` → resumo legível (faturamento, funcionários, CNAEs) num accordion "Dados brutos"

Entrega: `<CompanyHeaderEnriched/>` + accordion na tab Visão.

---

### 5. Hooks/queries

- Verificar se `useMandate`, `useBuyer`, `useDealByCnpj` já trazem esses campos. Se não, atualizar `select(...)` para puxar tudo.
- Mutations: adicionar updates inline via `supabase.from('eb_*').update(...)` respeitando RLS advisor/admin.

---

### 6. Memória

Atualizar `mem://features/entity-notes-kb.md` adicionando seção "campos sincronizados Bloco 1" e atualizar índice.

---

## Fora de escopo (próximas fases)

- Bloco 3 (`@mentions`, backlinks, grafo) — depende deste estar limpo
- Listing / Contato / Captação / Daily Notes / Advisor — fases posteriores
- Version history das notas, upload de imagens em notas

---

## Detalhe técnico

- Auditoria via `supabase--read_query` em `information_schema.columns` + leitura dos 3 arquivos de página
- Edições inline reusam `<InlineEditField/>` existente (sem novo design system)
- Banners (pause/cautela) usam `<Alert/>` shadcn com semantic tokens (`destructive`, `warning`)
- Todos os novos componentes em `src/components/equity-brain/{mandate,buyer,company}/`
- Sem mudanças de schema neste bloco — só leitura/edição do que já existe
