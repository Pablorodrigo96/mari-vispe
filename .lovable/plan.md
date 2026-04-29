## Objetivo

Tornar o CRM-Hub equivalente ao Monday: cada cliente (mandato) precisa concentrar **todos os campos operacionais** (Vendedor, Comprador, Fase, Drive, Status, Datas, Valores, % Vispe, Executivo, MATCH, Contrato, Estado, Região), expostos do mesmo jeito na **Lista** e no **Kanban**, e o **Dashboard Executivo** precisa cobrir os 16 indicadores listados.

---

## Parte 1 — Schema (migration `eb_mandates`)

Adicionar colunas faltantes em `equity_brain.mandates`:

| Campo Monday              | Coluna nova/existente                                              |
| ------------------------- | ------------------------------------------------------------------ |
| Vendedor                  | `company_cnpj` (já existe — é o vendedor do sellside)              |
| Comprador                 | **novo** `comprador_cnpj varchar(14)` + `comprador_nome text`      |
| MATCH (par compra/venda)  | **novo** `match_buyer_id uuid` (FK lógica → eb_buyers)             |
| Fase                      | `pipeline_stage` (existe)                                          |
| Drive                     | **novo** `drive_url text`                                          |
| Contrato                  | **novo** `contract_url text`                                       |
| Status do projeto         | `outcome` (existe)                                                 |
| Data de conclusão         | `data_fechamento` (existe)                                         |
| Data de fechamento do contrato | **novo** `data_assinatura_contrato date`                      |
| Valor da Operação         | `valor_operacao` (existe)                                          |
| R$ Vispe                  | `faturamento_vispe` (existe)                                       |
| % Vispe                   | `commission_pct` (existe)                                          |
| Executivo Responsável     | `responsavel_id` (existe — FK profiles)                            |
| Estado                    | `uf` (existe)                                                      |
| Região                    | `regiao` (existe)                                                  |

Atualizar a RPC `eb_upsert_mandate` para aceitar os 4 novos campos.

---

## Parte 2 — Edição rápida unificada (Lista + Kanban)

Refatorar `QuickEditPopover.tsx` para conter **todos os campos** acima, organizados em 4 seções:

```
[ Identificação ]   Vendedor (CNPJ readonly) · Comprador CNPJ + Nome · Executivo (select profiles)
[ Localização   ]   UF (select) · Região (auto pelo UF, editável)
[ Pipeline      ]   Deal type · Fase · Status (outcome) · Data início · Data conclusão · Data assinatura contrato
[ Financeiro    ]   Valor operação · % Vispe · R$ Vispe (preview) · Ticket alvo
[ Documentos    ]   Drive URL · Contrato URL (com botão "Abrir")
```

O mesmo popover é aberto:
- da **Lista** (`MandatesTable.tsx`) — adicionar botão lápis por linha + colunas novas (Comprador, Fase, Valor, % Vispe, Drive, Contrato, Executivo)
- do **Kanban** (`PipelineKanbanPage.tsx`) — já abre, só ganha os campos novos

---

## Parte 3 — Lista estilo Monday (mesma visão do Kanban)

Reescrever `MandatesTable.tsx` para tabela densa agrupada por **Fase** (collapsible), colunas:

```
Vendedor | Comprador | Fase | Status | Valor Op | R$ Vispe | % Vispe | Executivo | UF | Região | Drive | Contrato | Data conclusão | Ações
```

Os mesmos 500 mandatos que aparecem no Kanban aparecem aqui — fonte única (`eb_mandates` com mesmos filtros). Drive/Contrato renderizam como ícone-link clicável; cada célula editável → abre QuickEditPopover focado no campo.

---

## Parte 4 — Dashboard Executivo (auditoria dos 16 indicadores)

Inventário atual em `ExecutiveDashboardContent.tsx`:

| #  | Indicador                              | Status atual                            |
| -- | -------------------------------------- | --------------------------------------- |
| 1  | Total de Operações                     | OK (KpiTile)                            |
| 2  | Buy Side / Sell Side                   | OK (2 KpiTiles)                         |
| 3  | Em andamento                           | OK                                      |
| 4  | Concluídas                             | OK                                      |
| 5  | Canceladas                             | OK                                      |
| 6  | Total das operações (R$)               | OK                                      |
| 7  | Faturamento Vispe                      | OK ("Faturamento mari")                 |
| 8  | Ticket médio                           | OK                                      |
| 9  | Evolução anual de novas operações      | OK (YearlyEvolutionChart)               |
| 10 | Operações por tipo                     | OK (DonutChart byTipo)                  |
| 11 | Fase do Sell Side                      | OK (sellside_phases donut)              |
| 12 | Operações por região                   | OK                                      |
| 13 | Valor negociado por ano                | OK (YearlyMoneyChart)                   |
| 14 | Comissão anual da Vispe                | OK (YearlyMoneyChart)                   |
| 15 | Top 3 maiores operações                | OK                                      |
| 16 | Projetos por responsável               | OK (stacked bar)                        |

**Conclusão**: já temos todos. Ajustes finos:
- Renomear "Faturamento mari" → **"Faturamento Vispe"** (alinhar nomenclatura).
- Garantir que todos os charts mostrem **EmptyState** elegante quando os dados estão vazios (já feito em alguns).
- Reordenar para seguir a numeração 1→16 (atualmente a ordem é diferente).

---

## Arquivos a alterar

**Migrations**
- `supabase/migrations/<ts>_mandates_monday_fields.sql` — colunas novas + atualização da RPC `eb_upsert_mandate`.

**Componentes**
- `src/components/equity-brain/crm/QuickEditPopover.tsx` — expandir para todos os campos
- `src/components/equity-brain/crm/MandatesTable.tsx` — colunas Monday-style + edição inline
- `src/pages/equity-brain/PipelineKanbanPage.tsx` — passar novos valores ao popover; mostrar Drive/Contrato icon nos cards
- `src/components/equity-brain/crm/exec/ExecutiveDashboardContent.tsx` — renomear label e reordenar
- `src/hooks/useCrm.ts` — incluir colunas novas no SELECT de `useMandates`/`useMandate`

---

## Resultado para o usuário

- Cada cliente fica com ficha completa estilo Monday, com Drive e Contrato a 1 clique.
- Lista e Kanban mostram exatamente os mesmos cards / linhas, sincronizados.
- Dashboard Executivo cobre os 16 indicadores na ordem solicitada.