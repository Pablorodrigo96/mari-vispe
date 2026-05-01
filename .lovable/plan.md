## Como funcionam hoje os dashboards (a verdade nua)

Todos os 4 dashboards (`Executivo`, `Mandato`, `Match`, `NBO`) leem de **uma única fonte**:

```
equity_brain.mandates  ──┐
                         ├──►  view  public.eb_v_mandates_full  ──►  4 dashboards
equity_brain.companies ──┘                                        (via materialized views + RPCs)
```

Não existe "tabela do dashboard". Cada gráfico é **uma agregação ao vivo de uma coluna de `equity_brain.mandates`**. Para um KPI/gráfico aparecer, basta o campo correspondente estar preenchido no mandato.

**Status atual dos seus 529 mandatos:**

| Campo que alimenta dashboards | Preenchidos | Vazios |
|---|---:|---:|
| `deal_type` (sellside/buyside) | 527 | 2 |
| `deal_phase` (match/nbo/concluido…) | 245 | 284 |
| `valor_operacao` | 137 | 392 |
| `faturamento_vispe` (comissão) | 156 | 373 |
| `responsavel_id` | 259 | 270 |
| `data_assinatura` | 228 | 301 |
| `uf` / `regiao` | 522 | 7 |

→ É por isso que vários gráficos parecem vazios: **os campos não foram preenchidos nos mandatos**.

---

## Lista: cada gráfico × campo que precisa ser preenchido

### Dashboard Executivo (`/dashboard/executivo`)
| Bloco | Coluna em `eb_mandates` | Onde preencher hoje |
|---|---|---|
| KPI Total Operações | qualquer linha | criar mandato |
| KPI Buyside / Sellside | `deal_type` | form do mandato |
| KPI Em Andamento / Concluídas / Canceladas | `outcome` + `deal_phase` | form do mandato |
| KPI Valor Total das Operações | `valor_operacao` | form do mandato |
| KPI Faturamento Vispe | `faturamento_vispe` | form do mandato |
| KPI Ticket Médio | `valor_operacao` (calc) | — |
| Donut Operações por Tipo | `deal_type` | form |
| Donut Fase Sellside | `deal_phase` | form |
| Donut por Região | `uf` (vira região auto) | form / company |
| Bar Top 15 Estados | `uf` | form / company |
| Linha Evolução Anual | `data_assinatura` + `deal_type` | form |
| Top 3 maiores | `valor_operacao` | form |

### Dashboard Mandato (`/dashboard/mandato`)
| Bloco | Coluna |
|---|---|
| Total / Vigentes / Vendidos | `status` (`vigente`, `concluido`) |
| Por executivo | `responsavel_id` |
| Por região / estado | `uf` |
| Por setor | `setor` (ou `companies.setor_ma`) |

### Dashboard Match (`/dashboard/match`)
| Bloco | Coluna |
|---|---|
| Aparecer aqui | `deal_phase = 'match'` |
| Status do match | `outcome` |
| Tempo médio | `data_assinatura` → `stage_changed_at` |
| Por região / estado | `uf` |

### Dashboard NBO (`/dashboard/nbo`)
| Bloco | Coluna |
|---|---|
| Aparecer aqui | `deal_phase = 'nbo'` |
| Valor total / médio / ticket | `valor_operacao` |
| Comissões total | `faturamento_vispe` |
| Por executivo | `responsavel_id` |

---

## O problema (e o que você quer, estilo Monday)

Hoje o "preenchimento" desses campos está **espalhado**:
- `/equity-brain/crm/mandate/new` — só pega ~10 campos básicos.
- `/equity-brain/crm/mandate/:id` (Mandate 360) — edição parcial.
- Imports CSV em `/equity-brain/imports`.
- Quick Fill só edita 5 colunas.

Não existe **uma única "planilha-mãe"** onde você abre o mandato e enxerga **todos os ~30 campos que alimentam os dashboards**.

---

## Plano (3 entregas — mantém Monday-like)

### 1. Tabela mestre tipo Monday → `/equity-brain/mandatos/tabela`
Página única, grid editável (uma linha por mandato, todas as colunas que alimentam dashboards), com edição inline igual Monday. Filtros por `deal_type`, `deal_phase`, `responsavel_id`, `uf`. Botão "Novo mandato" no topo. Export CSV.

Colunas (na ordem): Codename · Razão Social · CNPJ · `deal_type` · `deal_kind` · `deal_phase` · `outcome` · `status` · `valor_pedido` · `valor_operacao` · `faturamento_vispe` · `comissao_pct` · `data_inicio` · `data_assinatura` · `data_fechamento` · `responsavel_id` (dropdown advisors) · `bdr_id` · `closer_id` · `uf` · `setor` · `comprador_nome` · `contato_nome` · `contato_telefone`.

Save direto em `equity_brain.mandates` via RPC `public.update_mandate_field(id, field, value)` que já valida permissão admin/advisor.

### 2. Form completo de mandato (substitui o atual `/mandate/new`)
Mesmos campos da tabela, agrupados em 4 abas: **Identificação · Comercial · Financeiro · Pessoas**. Cada campo tem um (i) explicando "este campo aparece no Dashboard X, gráfico Y" — igual ao padrão `ebTooltips.ts` já usado no projeto.

### 3. Painel "Saúde dos dashboards" → `/equity-brain/admin/dashboard-coverage`
Mostra a tabela de "preenchidos × vazios" acima, com link "ver mandatos sem `valor_operacao`" → abre a Tabela Mestre já filtrada. Assim você sabe **exatamente o que preencher para destravar cada gráfico**.

---

## Arquivos a criar/editar

**Novos:**
- `src/pages/equity-brain/MandatosTablePage.tsx` (grid editável, ~tanstack-table)
- `src/pages/equity-brain/DashboardCoveragePage.tsx`
- `src/components/equity-brain/MandateFullForm.tsx` (4 abas)
- migration: RPC `update_mandate_field` + GRANT admin/advisor

**Editados:**
- `src/App.tsx` (3 rotas novas)
- `src/components/layout/AppSidebar.tsx` (item "Mandatos · Tabela" + "Cobertura dashboards" no grupo Dashboards)
- `src/lib/ebTooltips.ts` (textos "este campo alimenta tal gráfico")
- `src/pages/equity-brain/MandateFormPage.tsx` (passa a usar `MandateFullForm`)

---

## Resultado para você

1. Abre **Mandatos · Tabela** → vê todos os 529 deals como uma planilha Monday, edita inline, qualquer mudança aparece nos dashboards no próximo refresh (≤ 60s).
2. Abre **Cobertura Dashboards** → vê quantos mandatos estão faltando `valor_operacao`, `faturamento_vispe`, `responsavel_id` etc, e clica para corrigir em lote.
3. Cada campo do form mostra "(i) este campo aparece no Donut X do Dashboard Executivo" — fim da dúvida sobre origem.

Sem mexer nas materialized views nem nos dashboards: a estrutura de leitura já está certa, só faltava a **camada de input unificada**.
