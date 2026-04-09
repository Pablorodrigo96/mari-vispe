

## Plano: Fases 5 e 6 — Painel Admin Capital + Nutrição e Integrações

---

### Fase 5 — Painel Admin `/admin/capital`

#### 5a. Sidebar e Rota

- **`AdminSidebar.tsx`**: Adicionar item "Captações" com ícone `Banknote` apontando para `/admin/capital`
- **`App.tsx`**: Adicionar rota `/admin/capital` e `/admin/capital/providers`

#### 5b. Dashboard de Métricas (topo da página)

Cards no topo com:
- Total de leads (count capital_requests)
- Leads com SLA estourado (where sla_deadline < now() AND status NOT IN ('closed'))
- Ticket médio (avg requested_amount)
- Receita projetada (sum requested_amount * success_fee_pct / 100 WHERE status = 'closed')
- Conversão por etapa (funil: pending → in_review → matched → proposal → closed, com percentuais)
- Tempo médio de fechamento (avg days entre created_at e updated_at WHERE status = 'closed')

#### 5c. Visão Kanban

5 colunas: Pendente | Em Análise | Matched | Proposta Enviada | Fechado.

Cards com: nome empresa, valor, score badge, SLA (vermelho se estourado), advisor atribuído.

**Drag-and-drop**: Usar a lib `@hello-pangea/dnd` (fork do react-beautiful-dnd, compatível com React 18). Ao soltar o card numa coluna diferente, faz UPDATE em `capital_requests.status` e insere evento em `capital_timeline`.

#### 5d. Filtros

Barra de filtros acima do Kanban:
- Score (slider min-max)
- Valor (select com faixas)
- Tipo (dívida/equity)
- SLA Estourado (toggle)
- Advisor (select com admins atribuídos)
- Busca textual (empresa)

#### 5e. Detalhe do Lead (modal ou drawer)

Ao clicar num card do Kanban, abre Dialog/Sheet com:
- Todos os dados da solicitação
- Timeline de eventos
- Documentos enviados
- Chat (mesmo componente CapitalChat)
- Botão **"Atribuir a mim"** → atualiza `assigned_admin_id`
- Botão **"Enviar Proposta"** → abre textarea com template pré-preenchido, insere em `capital_timeline` e muda status para `proposal_sent`
- Botão **"Escalar"** → insere notificação para todos admins + evento na timeline

#### 5f. Gestão de Providers (`/admin/capital/providers`)

CRUD completo de `capital_providers`:
- Tabela com colunas: nome, tipo, ticket min/max, setores, instrumentos, status ativo
- Botão "Novo Provider" → Dialog com formulário
- Editar/Desativar inline
- Filtros por tipo e setor

#### 5g. Export CSV/Excel

Botão "Exportar" no topo do Kanban que gera CSV com todos os leads filtrados (usando Blob + download link client-side).

---

### Fase 6 — Nutrição e Integrações

#### 6a. Migração SQL

Nova tabela `integrations_config`:
- `id` uuid PK
- `key` text UNIQUE NOT NULL (ex: 'webhook_low_score')
- `value` text NOT NULL (URL do webhook)
- `active` bool default true
- `created_at` timestamptz default now()

RLS: somente admin.

#### 6b. Trigger de Webhook para Score Baixo

Nova trigger function `fire_low_score_webhook()` AFTER INSERT em `capital_requests`:
- Se `lead_score < 40`, busca URL em `integrations_config` WHERE key = 'webhook_low_score' AND active = true
- Usa `pg_net` (extensão do Supabase) para fazer HTTP POST com os dados do lead para a URL configurada
- Isso permite integrar com n8n/Make para sequência de email marketing

Alternativa: edge function `fire-webhook` invocada via trigger `pg_net`, para evitar dependência de extensão. Decisão: usar edge function para maior flexibilidade.

#### 6c. Gestão de Webhooks no Admin

Seção dentro de `/admin/capital` ou tab separada para gerenciar `integrations_config`:
- Lista de webhooks configurados
- Botão para adicionar/editar URL
- Toggle ativo/inativo

#### 6d. Página Pública `/capital/case/:slug`

Componente com layout SEO-friendly:
- Hero com foto, nome da empresa (anonimizado), valor captado, prazo
- Depoimento do empreendedor
- Métricas de resultado
- CTA para simulador

Por enquanto, dados mockados (3-5 cases) armazenados localmente. Futuro: migrar para tabela `capital_cases`.

#### 6e. Páginas Programáticas `/capital/setor/:slug` e `/capital/cidade/:slug`

Páginas dinâmicas com:
- Conteúdo gerado por setor/cidade (título, descrição, stats do setor)
- Dados mockados por setor (tech, telecom, saude, etc.) e por cidade (São Paulo, Rio, BH, etc.)
- Formulário de captação embedado no final (reusa CapitalSimulator)
- Meta tags dinâmicas para SEO

---

### Seção Técnica

| Artefato | Ação |
|---|---|
| `package.json` | Adicionar `@hello-pangea/dnd` para drag-drop |
| Migração SQL | Tabela `integrations_config` + RLS |
| `src/pages/admin/AdminCapital.tsx` | **Novo**: Kanban + métricas + filtros + detalhe modal |
| `src/pages/admin/AdminCapitalProviders.tsx` | **Novo**: CRUD de capital_providers |
| `src/components/admin/AdminSidebar.tsx` | Adicionar link "Captações" |
| `src/App.tsx` | Rotas: `/admin/capital`, `/admin/capital/providers`, `/capital/case/:slug`, `/capital/setor/:slug`, `/capital/cidade/:slug` |
| `supabase/functions/fire-webhook/index.ts` | **Novo**: Edge function para disparar webhook |
| `src/pages/CapitalCase.tsx` | **Novo**: Página de case de sucesso |
| `src/pages/CapitalBySegment.tsx` | **Novo**: Página programática por setor |
| `src/pages/CapitalByCity.tsx` | **Novo**: Página programática por cidade |

