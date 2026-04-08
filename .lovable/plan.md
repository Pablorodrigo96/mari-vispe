

## Plano Fase 1: Contador Parceiro + Upload DRE + Equity Score via IA

Este é o primeiro módulo do roadmap. Os demais (Home Broker de Leads, Gap de Equity, Matching Real-Time, Geofencing de Notificações, Painel Head de Parcerias) serão implementados em fases subsequentes.

---

### Contexto
Hoje o `advisor` é genérico. Precisamos criar um sub-perfil "Contador Parceiro" que funciona como Hub de Originação: ele pode fazer upload privado de Balancete/DRE ao cadastrar um listing, e a IA lê o documento automaticamente para gerar um "Equity Score".

---

### 1. Migração SQL

**a) Flag `is_partner_accountant` na tabela `profiles`**
- Adicionar coluna `is_partner_accountant BOOLEAN DEFAULT false` em `profiles`
- Admin ativa essa flag no painel de usuários

**b) Tabela `listing_financial_docs`**
Armazena os documentos financeiros privados vinculados a listings:

| Coluna | Tipo | Descrição |
|---|---|---|
| id | uuid PK | |
| listing_id | uuid NOT NULL | Referência ao listing |
| user_id | uuid NOT NULL | Quem fez upload |
| file_url | text NOT NULL | URL no storage |
| file_name | text | Nome original |
| file_type | text | pdf, xlsx, csv |
| equity_score | jsonb | Resultado da análise IA |
| ai_extracted_data | jsonb | Dados financeiros extraídos (faturamento, EBITDA, lucro líquido, etc) |
| status | text DEFAULT 'pending' | pending, processing, completed, error |
| created_at | timestamptz DEFAULT now() | |

RLS:
- Owner do listing pode SELECT
- Quem fez upload (user_id = auth.uid()) pode INSERT e SELECT
- Admin pode SELECT all

**c) Storage bucket `financial-docs`**
- Bucket **privado** (is_public = false)
- RLS: upload por authenticated, download pelo owner do listing ou admin

**d) Coluna `equity_score` na tabela `listings`**
- `equity_score NUMERIC` — score consolidado (0-100) para exibição no mapa/marketplace

---

### 2. Edge Function: `analyze-financial-doc`

Recebe o `listing_id` e `file_url`, baixa o arquivo do storage, envia o conteúdo para a Lovable AI (Gemini) com um prompt de extração estruturada:

**Prompt da IA**: "Analise este documento financeiro (Balancete/DRE). Extraia: Receita Bruta Anual, Custos, Lucro Bruto, EBITDA, Lucro Líquido, Margem EBITDA %, Margem Líquida %. Calcule um Equity Score de 0-100 baseado em: margem EBITDA (peso 40%), crescimento de receita (peso 30%), consistência de resultados (peso 30%)."

- Usa tool calling para structured output
- Atualiza `listing_financial_docs.equity_score` e `ai_extracted_data`
- Atualiza `listings.equity_score` com o score consolidado
- Atualiza `listing_financial_docs.status` para 'completed'

---

### 3. Upload no Wizard de Cadastro (NewListingWizard)

**Condição**: Só aparece se o usuário logado tem role `advisor` E `profiles.is_partner_accountant = true`

**Novo step ou seção no Step 1**: "Documentos Financeiros (privado)"
- File input aceitando `.pdf`, `.xlsx`, `.csv`
- Máximo 10MB
- Upload vai para bucket `financial-docs`
- Após salvar o listing, chama a edge function `analyze-financial-doc`
- Badge "IA analisando..." enquanto processa
- Quando completo, exibe o Equity Score no card do listing

---

### 4. Painel Admin: Toggle Contador Parceiro

No `AdminUsers.tsx`, adicionar no dropdown de ações do usuário:
- "Ativar Contador Parceiro" / "Desativar Contador Parceiro"
- Só aparece se o usuário tem role `advisor`
- Faz update em `profiles.is_partner_accountant`

---

### 5. Exibição do Equity Score

- **Meus Anúncios**: Badge com score (ex: "Equity Score: 78/100") nos cards que possuem
- **Mapa**: Tooltip do marcador exibe o score quando disponível
- **BlindTeaser**: Seção "Auditado por IA" com o score e dados extraídos (sem mostrar o documento)

---

### Seção Técnica

| Arquivo | Ação |
|---|---|
| Migração SQL | `is_partner_accountant` em profiles + tabela `listing_financial_docs` + bucket `financial-docs` + `equity_score` em listings |
| `supabase/functions/analyze-financial-doc/index.ts` | Edge function que usa Lovable AI para extrair dados e gerar score |
| `src/hooks/usePartnerAccountant.ts` | Hook que verifica se o user logado é advisor + partner |
| `src/components/sell/wizard/FinancialDocUpload.tsx` | Componente de upload de DRE/Balancete |
| `src/components/sell/wizard/NewListingWizard.tsx` | Adicionar step/seção de upload condicional |
| `src/pages/admin/AdminUsers.tsx` | Toggle "Contador Parceiro" no dropdown |
| `src/pages/MyListings.tsx` | Badge Equity Score nos cards |
| `src/components/map/BusinessMap.tsx` | Equity Score no tooltip do marcador |
| `src/components/teaser/TeaserFinancials.tsx` | Seção "Auditado por IA" |

