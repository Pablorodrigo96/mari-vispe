

## Plano: CRM Centralizado — Gestao de Todos os Cadastros

Criar uma nova pagina `/admin/crm` que consolida em abas todos os tipos de cadastros da plataforma, permitindo busca, filtro e acoes rapidas em um unico lugar.

---

### Estrutura da pagina (Tabs)

1. **Usuarios** — Todos os perfis (profiles + user_roles). Filtro por role, busca por nome/telefone. Acoes: adicionar/remover role, toggle contador parceiro. (Logica ja existe em AdminUsers, sera reutilizada)

2. **Compradores** — Tabela `buyer_profiles`. Colunas: nome, empresa, categorias, budget min/max, estado, cidade, WhatsApp, status, data. Acoes: ver detalhes, desativar.

3. **Investidores / Interesses** — Tabela `interest_logs`. Colunas: nome, email, WhatsApp, empresa, ticker do ativo, data. Permite ver quem demonstrou interesse em quais ativos.

4. **Leads de Capital** — Tabela `capital_requests`. Colunas: empresa, tipo de capital, valor solicitado, lead score, status, data. Link para detalhe existente.

5. **Parceiros / Contadores** — Perfis com `is_partner_accountant=true` OU role `advisor`. Colunas: nome, telefone, qtd de reservas, reservas ativas, VDR readiness medio. Acoes: toggle contador parceiro.

6. **Franqueados** — Usuarios com role `franchisee` + solicitacoes pendentes. Acoes: aprovar/rejeitar. (Logica ja existe em AdminUsers)

---

### Arquivos

| Arquivo | Acao |
|---|---|
| `src/pages/admin/AdminCRM.tsx` | Nova pagina com 6 abas (Tabs) consolidando todos os cadastros |
| `src/components/admin/AdminSidebar.tsx` | Adicionar item "CRM" no menu com icone `Contact` |
| `src/App.tsx` | Adicionar rota `/admin/crm` |

### Detalhes tecnicos

- Cada aba faz query independente ao Supabase (profiles, buyer_profiles, interest_logs, capital_requests, partner_lead_reservations, franchisee_requests)
- Busca textual unificada por nome/email/telefone em cada aba
- Exportar CSV por aba (botao "Exportar")
- Paginacao client-side (50 por pagina) usando os componentes Pagination existentes
- Reutiliza Badge, Table, Card, Tabs, Select, Input ja existentes
- Protegido por AdminRoute (somente admins)
- Nenhuma migracao necessaria — usa tabelas e RLS existentes

