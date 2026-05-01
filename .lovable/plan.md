
# Diagnóstico: por que 30 KPIs estão zerados

Rodei o banco. **O erro NÃO é seu — é dos dados importados.** Você tem 317 mandatos, mas eles vieram da planilha sem 8 campos críticos que os dashboards leem. Resumo:

| Campo no banco | Quantos preenchidos | O que ele alimenta |
|---|---|---|
| `deal_type` | 317 sellside · **0 buyside** | KPI Buyside, Tipos de operação |
| `outcome` | 317 "em_andamento" · **0 won/lost/canceled** | Concluídas, Canceladas, Match status, NBO concluídos |
| `valor_operacao` | **0** | Total das Operações, Ticket Médio, 3 maiores, NBO Valor Total/Médio |
| `faturamento_vispe` | **0** | Faturamento Vispe, Comissão Vispe potencial, NBO Comissões |
| `valor_pedido` | 107 de 317 | Equity sob gestão, Mandatos vigentes |
| `status` | 317 "vigente" · **0 "ativo"** | Vigentes, Vendemos, "Mandatos vigentes por estado" |
| `responsavel_id` | 87 de 317 | NBO por executivo (qtd e volume) |
| `data_inicio` / `data_fechamento` | poucos | Tempo médio Match e NBO |
| `deal_phase` | 1 nbo · 0 match | Match (todos KPIs), NBO (todos KPIs) |

A view está OK — ela só mostra o que o banco tem. Os KPIs zeram porque os campos chegaram vazios na importação.

---

# Solução em 2 frentes

## Frente 1 — Backfill automático (resolve ~70% dos KPIs imediatamente)

Migration que **infere valores** a partir do que já existe, sem você cadastrar nada:

1. **`status`**: traduzir `vigente` → `ativo` quando `outcome='em_andamento'` e sem `data_fechamento`. Marcar `concluido` quando `outcome='won'` e `cancelado` quando `outcome='lost'`. → Destrava: Vigentes, Vendemos, Mandatos vigentes por estado, status do Match.

2. **`deal_phase`**: copiar de `pipeline_stage` quando vazio (`match`→match, `nbo`→nbo, `closing`→closing). → Destrava: todos os KPIs de Match e NBO.

3. **`valor_operacao`**: quando vazio, usar `valor_pedido` como proxy (107 mandatos passam a ter valor). → Destrava: Total das Operações, Ticket Médio, 3 maiores, NBO Valor Total/Médio.

4. **`faturamento_vispe`**: calcular `valor_operacao × commission_pct/100` quando vazio (default 5% se sem `commission_pct`). → Destrava: Faturamento Vispe, Comissão potencial, NBO Comissões.

5. **`outcome`** específico: quando `data_fechamento` preenchida, marcar `won`. → Destrava: Concluídas, NBO Concluídos, Match Concluídos.

6. **`deal_type` Buyside**: identificar mandatos com `deal_kind='buyer_mandate'` e setar `deal_type='buyside'`. → Destrava: KPI Buyside, Tipos de operação.

Após esse backfill, o que fica zerado é só o que **ninguém preencheu nem na planilha**: Canceladas (precisa marcar manualmente quem foi cancelado), Tempo médio (precisa data_inicio + data_fechamento) e NBO por executivo (faltam responsáveis nos 230 sem `responsavel_id`).

## Frente 2 — Tela de "Cadastro Rápido em Massa"

Criar `/equity-brain/crm/quick-fill` — uma tabela editável estilo Excel com TODOS os mandatos e só as 8 colunas que faltam, para você preencher em lote os 30% restantes:

| Codename | Empresa | deal_type | outcome | valor_operacao | faturamento_vispe | responsavel | data_inicio | data_fechamento |
|---|---|---|---|---|---|---|---|---|

- Filtros por status/outcome para focar nos pendentes.
- Edição inline com salvamento automático.
- Indicador "X de 317 com dados completos".
- Botão "exportar pendentes" em CSV para preencher no Excel e reimportar via `/equity-brain/crm/imports`.

## Frente 3 — Onde editar UM mandato individual (já existe, só te aponto)

**`/equity-brain/crm/mandate/:id/edit`** (rota `MandateFormPage.tsx`) — formulário completo com TODOS os campos. Você acabou de abrir um (`d5de4012…`). Os campos que destravam KPIs estão lá:
- "Tipo de operação" → `deal_type`
- "Fase" → `deal_phase`
- "Status" / "Resultado" → `status` + `outcome`
- "Valor da operação" → `valor_operacao`
- "Faturamento Vispe" → `faturamento_vispe`
- "Responsável" → `responsavel_id`
- "Data início" / "Data fechamento"

---

# Detalhes técnicos

**Migrations:**
- `backfill_mandates_kpi_fields.sql` — 6 UPDATEs idempotentes na ordem acima, com `WHERE` defensivos (só preenche se NULL).

**Novos arquivos:**
- `src/pages/equity-brain/QuickFillPage.tsx` — tabela editável com TanStack Table + inline editing.
- Rota em `src/App.tsx` sob `/equity-brain/crm/quick-fill` (RequireRole admin|advisor).
- Link no `EBSidebar.tsx` em "DASHBOARDS M&A" → "Preencher dados rápido".

**Sem mudanças** em: view `eb_v_mandates_full`, RPCs `get_dashboard_*`, dashboards já criados.

---

# O que você ganha
- **Imediatamente após o backfill**: 21 dos 30 KPIs zerados ganham números.
- **Após usar o Quick Fill** (≈15min para 317 mandatos): os 9 restantes (Canceladas, Tempo médio, NBO por executivo) também populam.
- **Daqui pra frente**: importações novas via `/equity-brain/crm/imports` já vão preencher todos os campos se a planilha tiver as colunas certas (modelo já gera).

Aprova rodar?
