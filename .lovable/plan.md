

## Plano: Fases 4, 5 e 6

Sobre a **Fase 3 (Gap de Equity)**: Sim, vai usar a funcionalidade de valuation existente (`calculateValuation` + `ValuationReportDialog`). Após o cálculo por múltiplos, o sistema adicionará uma seção no PDF comparando "Valor Atual" vs "Valor Vispe" (simulando +X% na margem EBITDA). Será implementada em seguida.

---

### Fase 4 — Matching Real-Time (Seller ↔ Buyer)

**Objetivo**: Quando um seller cadastrar um listing, o sistema varre a tabela `buyer_profiles` e notifica o seller sobre compradores compatíveis.

#### 4.1 Edge Function: `matching-engine` (já existe — ajustar)
- Após insert de listing, buscar `buyer_profiles` ativos com:
  - Categoria do listing dentro de `categories[]` do buyer
  - Mesma `state` (ou nacional)
  - `max_budget >= asking_price` (se disponível)
- Calcular score de compatibilidade (0-100)
- Criar notificação para o seller: "Existem N compradores ativos buscando empresas como a sua"
- Gatilho: trigger SQL `AFTER INSERT ON listings` que chama a edge function via `pg_net`

#### 4.2 Trigger SQL
```sql
-- Trigger que dispara matching após novo listing
CREATE TRIGGER on_new_listing_match
AFTER INSERT ON listings
FOR EACH ROW
EXECUTE FUNCTION notify_matching_buyers();
```
- A function `notify_matching_buyers()` faz um count de buyers compatíveis e insere uma notificação diretamente

#### 4.3 Monetização (Upgrade Master)
- Na notificação, o seller vê "X compradores interessados" mas os nomes/detalhes ficam ocultos
- Botão "Ver compradores" redireciona para `/valuation` com CTA de upgrade Master
- Sellers Master podem ver os detalhes dos buyers compatíveis

#### 4.4 UI
- Nova página `/matching-compradores/:listingId` com lista de buyers compatíveis (anonimizados para free, revelados para Master)
- Link na notificação aponta para essa página

---

### Fase 5 — Geofencing de Notificações

**Objetivo**: Franchisees só recebem notificações da sua região. Admins recebem digest agrupado.

#### 5.1 Migração SQL
- Tabela `franchisee_regions`:

| Coluna | Tipo |
|---|---|
| id | uuid PK |
| user_id | uuid (franchisee) |
| states | text[] |
| cities | text[] |
| categories | text[] |
| created_at | timestamptz |

- RLS: franchisee pode ver/editar as próprias regiões, admin vê todas

#### 5.2 Ajuste nos triggers de notificação
- `create_interest_notification()`: ao notificar franchisees, verificar se o listing está na região do franchisee (comparar `listings.state` com `franchisee_regions.states`)
- Só notificar franchisees que cobrem aquela região/categoria

#### 5.3 Admin Daily Digest
- Nova coluna `notification_preference` em `profiles`: 'realtime' | 'daily_digest'
- Para admins com 'daily_digest', as notificações são criadas normalmente mas marcadas com flag `is_digest = true`
- Edge function `send-daily-digest` (cron diário) agrupa notificações não lidas e envia email resumo

#### 5.4 UI: Config de Região (Franqueado)
- Nova seção em `/meu-perfil` para franchisees: "Minha Região de Atuação"
- Multi-select de estados + categorias de interesse

---

### Fase 6 — Painel Head de Parcerias

**Objetivo**: Dashboard para o Head de Parcerias monitorar a performance dos contadores parceiros.

#### 6.1 Nova rota `/admin/parcerias`
- Acessível por admins (ou role específica futura)
- Adicionada ao `AdminSidebar`

#### 6.2 KPIs do Dashboard

| KPI | Fonte de Dados |
|---|---|
| Nº de parceiros novos | `profiles WHERE is_partner_accountant = true` (por período) |
| Parceiros engajados | Parceiros com listings criados nos últimos 30 dias |
| Leads cadastrados por parceiro | `listings GROUP BY user_id` (onde user é partner) |
| Reuniões geradas vs realizadas | Nova tabela `partner_activities` |
| Receita por parceiro vs Estimativa | `valuation_purchases` + `subscriptions` vinculados |
| Leads dentro do ICP Vispe | Listings com equity_score >= 60 |
| Escritórios inativos | Partners sem listings nos últimos 60 dias |
| Ranking top performers | Ordenação por leads cadastrados + equity score médio |
| Pipeline por parceiro | Listings por status (pending, active, sold) |

#### 6.3 Migração SQL
- Tabela `partner_activities`:

| Coluna | Tipo |
|---|---|
| id | uuid PK |
| partner_user_id | uuid |
| activity_type | text (evento, reuniao_agendada, reuniao_realizada, followup) |
| notes | text |
| scheduled_at | timestamptz |
| completed_at | timestamptz |
| created_by | uuid |
| created_at | timestamptz |

- RLS: admin pode CRUD, partner pode ver as próprias

#### 6.4 UI do Painel
- **Cards de resumo**: Parceiros ativos, Leads totais, Equity médio, Parceiros inativos
- **Tabela de parceiros**: Nome, Leads cadastrados, Equity Score médio, Última atividade, Status (ativo/inativo)
- **Ranking**: Top 10 parceiros por performance
- **Filtros**: Período, status do parceiro
- **Ações**: Registrar reunião, agendar follow-up, marcar como inativo

---

### Seção Técnica — Resumo de Arquivos

| Fase | Arquivo | Ação |
|---|---|---|
| 4 | Migração SQL | Trigger `on_new_listing_match` + function `notify_matching_buyers()` |
| 4 | `src/pages/MatchingBuyers.tsx` | Nova página de buyers compatíveis (anonimizado/revelado) |
| 4 | `src/App.tsx` | Rota `/matching-compradores/:listingId` |
| 5 | Migração SQL | Tabela `franchisee_regions` + coluna `notification_preference` em profiles |
| 5 | `src/pages/MyProfile.tsx` | Seção "Região de Atuação" para franchisees |
| 5 | Triggers existentes | Filtrar notificações por região do franchisee |
| 6 | Migração SQL | Tabela `partner_activities` |
| 6 | `src/pages/admin/AdminPartnerships.tsx` | Novo dashboard Head de Parcerias |
| 6 | `src/components/admin/AdminSidebar.tsx` | Adicionar link "Parcerias" |

