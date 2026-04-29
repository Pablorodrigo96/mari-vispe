# Promoção automática de leads qualificados ao Equity Brain (dual-role)

## Objetivo
Ao qualificar um lead, garantir que ele entre no pool ativo do Equity Brain com o(s) papel(éis) corretos: **target** (empresa à venda potencial) e/ou **buyer** (comprador potencial). Isso amplia o universo de matches futuros sem depender de cadastro manual.

## Modelo conceitual

Um contato qualificado pode ser:
- **Apenas target** — empresa operacional sem apetite declarado de comprar (default da maioria dos leads RFB).
- **Apenas buyer** — investidor/holding/family office sem operação alvo.
- **Dual-role** — grupo consolidador que tanto opera quanto adquire (ex: rede que cresce por M&A).

O advisor decide o papel no momento da qualificação.

## Mudanças no banco

### 1. Estender `qualify_lead` RPC
Adicionar parâmetros:
- `p_promote_to_buyer boolean default false`
- `p_promote_to_company boolean default false`
- `p_buyer_profile jsonb default null` — quando promove a buyer, recebe `{ thesis, sectors, regions, ticket_min, ticket_max, instruments }`
- `p_company_profile jsonb default null` — quando promove a company a partir de um buyer, recebe `{ cnpj, sector, revenue_brl, location }`

A função:
1. Atualiza `qualification_status = 'qualified'` na entidade de origem (igual hoje).
2. Se `p_promote_to_buyer = true` e a entidade origem é `company`: cria registro em `equity_brain.buyers` com `qualification_status = 'qualified'`, `source = 'promoted_from_company'`, `source_company_id = <id>`.
3. Se `p_promote_to_company = true` e a entidade origem é `buyer`: cria registro em `equity_brain.companies` com `qualification_status = 'qualified'`, `source = 'promoted_from_buyer'`, `source_buyer_id = <id>`.
4. Registra evento em `equity_brain.deal_events` (`event_type = 'lead_promoted'`) para o loop adaptativo Bayesiano aprender.

### 2. Colunas de rastreamento
Adicionar a `equity_brain.companies` e `equity_brain.buyers`:
- `promoted_from text` — `'rfb'`, `'company'`, `'buyer'`, `'manual'`
- `promoted_at timestamptz`
- `linked_entity_id uuid` — id da entidade-irmã (company ↔ buyer) quando dual-role

Permite navegar nos dois sentidos e evitar duplicidade (constraint: `unique (cnpj, role)` lógica via índice parcial).

### 3. Trigger de re-matching
Quando uma entidade vira `qualified` ou ganha papel novo, agendar (via `pg_notify` ou tabela `equity_brain.match_queue`) um recálculo de matches assíncrono — o worker existente (`match-buyer` / `match-company-v2`) consome a fila.

## Mudanças na UI

### `QualifyLeadButton.tsx` (extensão)
Hoje é um popover simples com escolha de fonte. Vira um diálogo curto em 2 passos:
1. **Fonte da qualificação** (já existe): WhatsApp, indicação de parceiro, contrato assinado, etc.
2. **Papel no Equity Brain** (novo): checkboxes
   - `[x] Manter como alvo de aquisição` (default ligado se origem = company)
   - `[ ] Adicionar também como comprador potencial` → expande mini-form com tese, setores, ticket
   - `[ ] Promover a empresa-alvo` (só aparece se origem = buyer e ele declarou operar)

### Badge de papel
Novo componente `RoleBadges.tsx` — mostra chips lado a lado: `Target`, `Buyer`, `Dual` em listagens do CRM Hub. Clique no chip leva à entidade-irmã.

### MatchesPanel
Já filtra qualificados — sem mudança visual, mas agora o pool inclui buyers/companies promovidos (ganho automático de cobertura).

## Edge Function

Nenhuma nova. A `qualify_lead` RPC concentra toda a lógica transacional. O `expand-companies-from-rfb` continua igual (importa apenas como `unqualified`, papel `company`).

## Observabilidade

- Métrica nova no painel admin: "Leads promovidos a buyer" / "Leads promovidos a company" no último período.
- `deal_events` registra cada promoção, alimentando o aprendizado adaptativo (Phase 4 do Equity Brain v2).

## Arquivos afetados

**Migration nova**
- Estende `qualify_lead`, adiciona colunas de promoção, cria índice de unicidade lógica e tabela `match_queue` (se ainda não existir).

**Frontend**
- `src/components/equity-brain/crm/QualifyLeadButton.tsx` — vira diálogo com 2 passos.
- `src/components/equity-brain/crm/RoleBadges.tsx` — novo.
- `src/pages/equity-brain/MandateDetailPage.tsx` e `BuyerDetailPage.tsx` — exibem badges e link para entidade-irmã quando promovido.
- `src/pages/admin/...` painel de métricas — adiciona contadores.

**Memória**
- Atualiza `mem://features/lead-qualification-rfb-expand` cobrindo o dual-role.

## Fora de escopo

- Promoção automática sem confirmação humana (mantemos sempre um clique do advisor — evita poluir o pool).
- Importação de buyers da RFB (decisão anterior: buyers nascem só de cadastro real ou promoção).
- Migração retroativa em massa de companies qualificadas para virar buyers — não faz sentido sem julgamento humano caso a caso.

## Perguntas antes de implementar

1. **Default do checkbox "Manter como alvo"** ao qualificar uma company: deixo marcado (ele já é target por origem) ou desmarco para o advisor confirmar conscientemente?
2. **Promoção a buyer exige mini-form (tese, setores, ticket)** — OK em deixar campos opcionais e o advisor preenche depois no `BuyerDetailPage`, ou prefere bloquear até preencher tese mínima?
3. **Re-matching assíncrono via fila** — OK ou prefere recálculo síncrono no momento da promoção (mais lento, mas resultado imediato visível)?
