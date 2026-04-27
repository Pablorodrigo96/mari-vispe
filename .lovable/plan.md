# Plano: Seed Realista da Unidade de Parcerias

## Diagnóstico atual (já confirmado no banco)
- ✅ 2 contadores parceiros ativos: **Pablo Constantino** e **Vitor dos Santos Rosa** (`is_partner_accountant = true`)
- ✅ 84 listings ativos (a maioria do Vitor — bom volume para testar carteira grande)
- ❌ 0 reservas em `partner_lead_reservations`
- ❌ 0 documentos em `vdr_documents`
- ❌ 0 atividades em `partner_activities`
- ❌ 0 interesses no pool compartilhado

**Causa**: as 84 listings foram criadas antes do trigger `auto_create_partner_reservation` existir (ou antes de Pablo/Vitor terem a flag de parceiro), então não geraram reservas automaticamente.

---

## O que será populado (via migration de seed)

### 1. Reservas de leads (≈ 30 registros em `partner_lead_reservations`)
Para cada listing existente do Vitor e do Pablo, criar reserva nos 4 status do funil para popular o Kanban do Sérgio:

| Status | Quantidade | Lógica |
|---|---|---|
| `reserved` (em andamento) | 12 | `expires_at` entre +5 e +40 dias (mistura urgentes e folgados) |
| `reserved` urgente (≤7 dias) | 4 | `expires_at` entre +1 e +6 dias → testa filtro "expirando em 7 dias" |
| `exclusive` (qualificadas) | 8 | `qualified_at` recente, `qualifying_action = 'vdr_doc_uploaded'` ou `'valuation_generated'`, `commission_type = 'full'` |
| `expired` (perdidas) | 4 | `expires_at` no passado, `commission_type = 'discovery_fee'` |
| `closed_by_matrix` | 2 | Marcadas como fechadas pela PME.B3 |

### 2. Equity scores e métricas financeiras nas listings (UPDATE)
Atualizar `equity_score`, `annual_profit`, `vdr_readiness` para as listings que entrarão nas reservas — assim o Painel do Parceiro mostra Score badges coloridos e a métrica "Potencial M&A" deixa de ser zero.

- Scores variados: 35, 48, 55, 62, 71, 78, 85, 91 (testa todas as faixas de cor)
- `vdr_readiness`: 0%, 20%, 40%, 60%, 80%, 100% (cobre o badge VDR)

### 3. Documentos VDR (≈ 25 registros em `vdr_documents`)
Para as 8 listings `exclusive` + 6 `reserved`, popular as 5 categorias obrigatórias (`balanco`, `dre`, `contrato`, `fluxo_caixa`, `impostos`):

- 10 docs `validated` (testa cálculo automático do `vdr_readiness`)
- 8 docs `pending` (popula a aba "Cofre Digital" do Sérgio com fila de aprovação)
- 4 docs `rejected` com `rejection_reason` ("Documento ilegível", "Faltam páginas 3-5", "Versão desatualizada", "Assinatura ausente")
- 3 docs adicionais para um listing chegar a 100% (dispara notificação "VDR Pronto")

### 4. Atividades do parceiro (≈ 15 registros em `partner_activities`)
Histórico para o drill-down do Sérgio (painel lateral por parceiro):

- 5 reuniões (`activity_type = 'meeting'`) — algumas concluídas, outras agendadas
- 4 ligações (`activity_type = 'call'`)
- 4 follow-ups (`activity_type = 'follow_up'`)
- 2 tarefas (`activity_type = 'task'`)

Distribuídas entre Pablo e Vitor com `notes` realistas ("Parceiro pediu material institucional", "Combinado treinamento dia 30", etc.).

### 5. Interesses no Pool Compartilhado (≈ 5 registros em `partner_opportunity_interests`)
Para validar o fluxo "Tenho comprador":
- 2 interesses `expressed` (aguardando resposta)
- 1 `accepted` (originador aceitou — match 50/50)
- 1 `rejected`
- 1 `closed` (deal fechado)

Cruzando Pablo ↔ Vitor (um como originador, outro como interessado).

### 6. Notificações de teste (≈ 10 registros em `notifications`)
Algumas notificações realistas para Pablo, Vitor e os admins (Rafael/Pablo) — mistura de tipos: "Lead reservado", "Sua reserva expira em 7 dias", "VDR Pronto", "Outro parceiro tem comprador para seu lead".

---

## Ferramenta usada
- 1 migration SQL (insert tool) com todos os INSERTs e UPDATEs encadeados em transação.
- IDs determinísticos via `gen_random_uuid()` capturados em CTEs para manter relacionamentos consistentes (reserva → docs → atividades).

## Como validar depois do seed
1. **Como Vitor / Pablo** (login parceiro) → `/parceiro`:
   - Ver banner de bulk upload + lista de leads com countdown, scores coloridos e potencial M&A
   - Aba "Pool da Rede" mostrando oportunidades anonimizadas
   - `/potencial-carteira` com receita agregada, comissão potencial e top 5

2. **Como Admin** (Rafael ou Pablo) → `/admin/parcerias`:
   - **Aba Visão Geral**: KPIs preenchidos + ranking Pablo vs Vitor + drill-down com atividades
   - **Aba Reservas**: Kanban com 4 colunas populadas, filtro "expirando em 7 dias" mostra os 4 urgentes
   - **Aba Cofre Digital**: 8 docs `pending` para validar, 4 rejeitados, 10 validados

3. **Smoke tests funcionais**:
   - Validar 1 doc `pending` → conferir se `vdr_readiness` recalcula
   - Forçar exclusividade em 1 reserva `reserved`
   - Marcar 1 reserva como `closed_by_matrix`
   - Registrar nova atividade no drill-down do Vitor

## Arquivos
- **Criar**: `supabase/migrations/{timestamp}_seed_partnerships_realistic.sql`

## Não-objetivos
- Não cria novos usuários (usa Pablo e Vitor que já existem)
- Não popula edge functions / cron (apenas dados estáticos)
- Não modifica componentes React — apenas dados para validar UI já existente
- Migration de seed é idempotente onde possível (usa `ON CONFLICT DO NOTHING` em chaves naturais)
