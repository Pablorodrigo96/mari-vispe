

## Plano: Captação de Capital com Criação de Conta + Página "Minhas Solicitações"

### Objetivo
Quando um lead preencher o formulário de captação de capital, o sistema deve:
1. Criar automaticamente uma conta de usuário (ou usar a existente se já logado)
2. Salvar a solicitação no banco de dados
3. Adicionar campo "Tipo de Captação" (Dívida ou Equity) ao formulário
4. Redirecionar para uma página "Minhas Solicitações" onde o lead acompanha status, visualizações e propostas

---

### Mudanças

#### 1. Migração SQL — Tabela `capital_requests`

| Coluna | Tipo | Descrição |
|---|---|---|
| id | uuid PK | |
| user_id | uuid | Usuário criado/existente |
| company_name | text | Nome da empresa |
| requested_amount | numeric | Valor solicitado |
| capital_type | text | 'divida' ou 'equity' |
| objective | text | giro, expansao, etc. |
| monthly_revenue | text | Faixa de faturamento |
| net_profit | text | Lucro líquido |
| status | text | 'pending', 'in_review', 'proposal_sent', 'closed' |
| views_count | int default 0 | Visualizações por analistas |
| created_at | timestamptz | |

RLS: usuário vê as próprias, admin vê todas, admin pode atualizar todas.

#### 2. `src/components/capital/CapitalLeadModal.tsx`
- Adicionar campo **"Tipo de Captação"** com 2 opções: "Dívida (Crédito/Financiamento)" e "Equity (Venda de Participação)"
- Adicionar campo **senha** para criação de conta
- No `onSubmit`:
  - Se usuário **não logado**: criar conta via `supabase.auth.signUp` com email + senha + nome
  - Se usuário **já logado**: usar user existente
  - Inserir registro na tabela `capital_requests`
- Na tela de sucesso: botão "Acompanhar Solicitação" → `/minhas-captacoes`

#### 3. Nova página `src/pages/MyCapitalRequests.tsx`
- Rota: `/minhas-captacoes` (protegida por auth)
- Lista as solicitações do usuário com:
  - Valor solicitado, tipo (Dívida/Equity), objetivo
  - Status com badge colorido (Pendente, Em Análise, Proposta Enviada, Fechado)
  - Contador de visualizações
  - Data de criação
- Cards responsivos com layout limpo

#### 4. `src/App.tsx`
- Adicionar rota `/minhas-captacoes` → `MyCapitalRequests`

#### 5. `src/components/layout/Header.tsx`
- Adicionar link "Minhas Captações" no menu do usuário logado (dropdown)

---

### Seção Técnica

| Arquivo | Ação |
|---|---|
| Migração SQL | Criar tabela `capital_requests` com RLS |
| `CapitalLeadModal.tsx` | Adicionar campo capital_type (dívida/equity) + senha + signup automático + insert na tabela |
| `MyCapitalRequests.tsx` | Nova página listando solicitações do usuário |
| `App.tsx` | Nova rota `/minhas-captacoes` |
| `Header.tsx` | Link no menu do usuário |

**Fluxo do lead:**
```text
Formulário Capital → Preenche dados + escolhe Dívida/Equity + cria senha
→ Conta criada automaticamente + solicitação salva
→ Tela sucesso com botão "Acompanhar"
→ /minhas-captacoes (lista com status e views)
```

