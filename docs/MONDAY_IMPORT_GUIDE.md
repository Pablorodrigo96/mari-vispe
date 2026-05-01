# Guia de Importação do Monday.com → MARI

> Pipeline oficial de migração e re-sincronização dos boards M&A do Vispe (Sellside e Buyside) para a MARI.
> Acesso restrito a `admin`.

---

## 1. Como exportar do Monday

1. Abra o board (**M&A Sellside** ou **M&A Buyside**) no Monday.com.
2. Garanta que **todas as colunas relevantes estão visíveis** (executivo, status, valor, faturamento, padrinho, cross-sell, datas).
3. Clique no menu superior `…` → **More actions** → **Export board to Excel**.
4. Marque **"Export visible columns"** e escolha **"All items"** (não filtre por grupo).
5. Salve como `M_A_Sellside.xlsx` ou `M_A_Buyside.xlsx`.

> ⚠️ Não renomeie cabeçalhos no Excel — o parser usa heurística por nome de coluna. Se a coluna sumir, o registro fica em "ignorados".

---

## 2. Como fazer upload na MARI

1. Acesse `/admin/monday-import` (Sidebar → **🔄 Migração Monday → Importar Monday**).
2. Arraste o `.xlsx` no drop-zone (ou clique para selecionar).
3. O sistema **detecta automaticamente** se é Sellside ou Buyside pelo conjunto de colunas.
4. Confira o **Preview**:
   - Total de linhas válidas vs. ignoradas
   - Lista de **advisors não mapeados** (sem correspondência em `profiles`)
   - Lista de **empresas que serão criadas como stub** (sem CNPJ ou novas)
5. Clique em **Importar agora** para commitar.
6. O processamento roda em background; volte ao Dashboard de Paridade em ~30s.

---

## 3. Como interpretar o Dashboard de Paridade

`/admin/monday-parity` compara KPIs Monday (referência travada) vs. MARI (live).

| Delta | Cor | Ação |
|------|-----|------|
| < 1% | 🟢 verde | OK, paridade total |
| 1–5% | 🟡 amarelo | Investigar (provavelmente advisor pendente ou linha ignorada) |
| > 5% | 🔴 vermelho | Bloqueante — abrir ticket, **não** declarar fase concluída |

KPIs auditados:
- Total Sellside (esperado: 220 ± 2%)
- Total Buyside (esperado: 24 ± 1)
- Soma `valor_operacao` Sellside (R$ 129.436.656 ± 1%)
- Soma `faturamento_vispe` Sellside (R$ 4.512.084 ± 1%)
- Top 3 executivos: Rafael=71, Lucas=34, Marieli=27

---

## 4. Como resolver advisors pendentes

1. Acesse `/admin/advisors-mapping`.
2. Para cada nome em `equity_brain.advisors_pending_mapping` (não resolvido):
   - Selecione um usuário existente em `profiles` (busca por nome/e-mail).
   - Clique em **Vincular**.
3. A função `eb_resolve_advisor_mapping` faz o `UPDATE` retroativo em `mandates.responsavel_id`.
4. Volte ao Dashboard de Paridade — KPIs por executivo recalculam imediatamente.

> Se um nome do Monday não existir em `profiles`, **convide o advisor primeiro** em `/admin/users`, depois mapeie.

---

## 5. Como re-importar (incremental / idempotência)

- O parser usa `monday_item_id` como **chave única** em `equity_brain.mandates`.
- Re-upload do mesmo arquivo:
  - Linhas existentes recebem `UPDATE` (apenas campos **não-NULL** do XLSX).
  - **Edições manuais na MARI são preservadas** (campos vazios no XLSX não sobrescrevem).
- Linhas removidas do Monday **não são deletadas** automaticamente — exclua manualmente se necessário.

---

## 6. Troubleshooting

| Sintoma | Causa provável | Solução |
|---------|----------------|---------|
| "Empresa duplicada" no preview | CNPJ inválido ou ausente no Monday | Editar no Monday, re-exportar |
| Advisor desaparece do dashboard | Não mapeado em `advisors_pending_mapping` | `/admin/advisors-mapping` |
| Valor R$ 1.234,56 vira NaN | Cell formatada como texto no Excel | Forçar formato número no Monday |
| Preview vazio (0 linhas) | Cabeçalhos renomeados ou aba errada | Re-exportar com colunas padrão |
| Timeout no commit | > 500 linhas por upload | Quebrar em 2 arquivos |
| Health check em vermelho após import | `refresh_dashboard_views` não rodou | `/equity-brain/admin/health` → trigger manual |

---

**Última atualização:** Fase 4 da migração Monday → MARI (Maio/2026).
