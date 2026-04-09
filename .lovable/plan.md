

## Plano: Fase 2 — Schema e Migrations do Motor de Captação

### Resumo
Expandir o schema do banco para suportar o motor completo de captação: enriquecer `capital_requests`, criar 5 novas tabelas (`capital_providers`, `capital_matches`, `capital_documents`, `capital_timeline`, `capital_messages`) com RLS em todas.

---

### Migração SQL

#### 1. Adicionar colunas a `capital_requests`

| Coluna | Tipo | Default |
|---|---|---|
| `company_age_months` | int | null |
| `lead_score` | int | null |
| `success_fee_pct` | numeric | 3 |
| `estimated_rate_min` | numeric | null |
| `estimated_rate_max` | numeric | null |
| `estimated_approval` | int | null |
| `matched_providers_count` | int | 0 |
| `assigned_admin_id` | uuid | null |
| `sla_deadline` | timestamptz | null |
| `source` | text | null |
| `utm_source` | text | null |
| `utm_medium` | text | null |
| `utm_campaign` | text | null |

Nota: `sector` e `approval_score` já existem. `company_age` (text) já existe — `company_age_months` é um campo numérico adicional.

#### 2. Nova tabela `capital_providers`

Provedores de capital (bancos, fundos, fintechs). Somente admins gerenciam; providers autenticados veem seus próprios dados.

| Coluna | Tipo |
|---|---|
| id | uuid PK |
| name | text NOT NULL |
| type | text NOT NULL (bank/fund/family_office/angel/fintech) |
| ticket_min | numeric |
| ticket_max | numeric |
| sectors | text[] default '{}' |
| regions | text[] default '{}' |
| instruments | text[] default '{}' |
| contact_email | text |
| webhook_url | text |
| active | bool default true |
| created_at | timestamptz default now() |

RLS: admin vê/gerencia tudo; anon/authenticated podem ver providers ativos (para matching público).

#### 3. Nova tabela `capital_matches`

Cruzamento request ↔ provider.

| Coluna | Tipo |
|---|---|
| id | uuid PK |
| request_id | uuid FK → capital_requests |
| provider_id | uuid FK → capital_providers |
| match_score | int |
| status | text default 'suggested' |
| notified_at | timestamptz |
| responded_at | timestamptz |
| created_at | timestamptz default now() |

RLS: dono do request vê seus matches; admin vê tudo.

#### 4. Nova tabela `capital_documents`

Documentos anexados a uma solicitação.

| Coluna | Tipo |
|---|---|
| id | uuid PK |
| request_id | uuid FK → capital_requests |
| doc_type | text NOT NULL |
| file_url | text NOT NULL |
| status | text default 'pending' |
| uploaded_by | uuid |
| uploaded_at | timestamptz default now() |

RLS: dono do request vê/insere; admin vê/atualiza tudo.

#### 5. Nova tabela `capital_timeline`

Eventos auditáveis para timeline visual.

| Coluna | Tipo |
|---|---|
| id | uuid PK |
| request_id | uuid FK → capital_requests |
| event_type | text NOT NULL |
| description | text |
| actor_id | uuid |
| created_at | timestamptz default now() |

RLS: dono do request vê; admin vê/insere tudo.

#### 6. Nova tabela `capital_messages`

Chat entre lead e analista.

| Coluna | Tipo |
|---|---|
| id | uuid PK |
| request_id | uuid FK → capital_requests |
| sender_id | uuid NOT NULL |
| message | text NOT NULL |
| read_at | timestamptz |
| created_at | timestamptz default now() |

RLS: participantes do request (owner + assigned_admin) veem/inserem; admin vê tudo.

---

### RLS resumo

| Tabela | Usuário (owner) | Admin | Provider |
|---|---|---|---|
| capital_requests | SELECT/INSERT próprios | ALL | — |
| capital_providers | SELECT ativos | ALL | — |
| capital_matches | SELECT próprios (via request) | ALL | SELECT próprios (via provider) |
| capital_documents | SELECT/INSERT próprios | SELECT/UPDATE all | — |
| capital_timeline | SELECT próprios | SELECT/INSERT all | — |
| capital_messages | SELECT/INSERT próprios | SELECT/INSERT all | — |

### Realtime

Habilitar realtime em `capital_messages` e `capital_timeline` para atualizações em tempo real no dashboard.

---

### Seção Técnica

| Artefato | Ação |
|---|---|
| Migração SQL (1 arquivo) | ALTER TABLE capital_requests + CREATE TABLE × 5 + RLS policies + realtime |
| `src/integrations/supabase/types.ts` | Atualizado automaticamente após migração |

Nenhum arquivo de código React será alterado nesta fase — apenas schema. O código será adaptado nas fases seguintes.

