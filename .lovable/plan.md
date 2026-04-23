

## Plano: Fluxo Completo do Head de Parcerias (Sérgio)

Expandir a pagina `/admin/parcerias` com 3 abas para que o Sergio tenha visao 360 de todos os contadores parceiros, suas reservas de leads, documentos VDR e atividades — tudo em um unico lugar.

---

### Estrutura da pagina (Tabs)

**Aba 1 — Visao Geral (existente, melhorada)**
- KPIs atuais + novos: total de reservas ativas, taxa de conversao reserva-exclusivo, VDR readiness medio global
- Ranking de parceiros (tabela existente) com colunas adicionais: reservas ativas, reservas exclusivas, VDR readiness medio

**Aba 2 — Reservas de Leads (nova)**
- Kanban visual com 4 colunas: Reservado / Exclusivo / Expirado / Fechado pela Matriz
- Cada card mostra: nome da empresa, contador responsavel, dias restantes (countdown), tipo de comissao, VDR readiness
- Filtros: por contador, por status, por prazo (expirando em 7 dias)
- Acoes: marcar como "fechado pela matriz", forcar exclusividade manual

**Aba 3 — Cofre Digital (VDR) (nova)**
- Lista de todos os documentos VDR enviados (tabela `vdr_documents`)
- Colunas: empresa, categoria do doc, status (pendente/validado/rejeitado), enviado por, data
- Acoes: validar documento, rejeitar com motivo — atualiza automaticamente o `vdr_readiness` do listing via trigger existente
- Filtro por status e por listing

**Aba 4 — Detalhes do Parceiro (drill-down)**
- Ao clicar em um parceiro na aba 1, abre um painel lateral (Sheet) ou modal com:
  - Dados do perfil (nome, empresa, telefone)
  - Todas as reservas daquele parceiro com status e countdown
  - Todos os docs VDR enviados por ele
  - Historico de atividades registradas
  - Botao para registrar nova atividade (logica existente)

---

### Arquivos a modificar

| Arquivo | Acao |
|---|---|
| `src/pages/admin/AdminPartnerships.tsx` | Refatorar com Tabs (Visao Geral / Reservas / VDR / Atividades). Adicionar queries para `partner_lead_reservations` e `vdr_documents`. Adicionar drill-down por parceiro via Sheet. Acoes de validar/rejeitar VDR. |

### Detalhes tecnicos

- Query `partner_lead_reservations` com join em `listings` (titulo, categoria) e `profiles` (nome do parceiro)
- Query `vdr_documents` com join em `listings` e `profiles`
- Validacao/rejeicao de VDR: update no `vdr_documents` (status, validated_by, rejection_reason) — o trigger `update_listing_vdr_readiness` ja recalcula automaticamente
- Kanban usa grid CSS com 4 colunas (nao precisa drag-and-drop, apenas visual)
- Reutiliza componentes existentes: Tabs, Table, Badge, Sheet, Card, Select, Input
- Nenhuma migracao necessaria — todas as tabelas e RLS ja existem
- Admin ja tem permissao ALL em `partner_lead_reservations` e `vdr_documents`

