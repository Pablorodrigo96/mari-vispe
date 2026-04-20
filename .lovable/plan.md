

## Plano: Sistema de Reserva de Leads + VDR para Contadores Parceiros

Implementar 4 mecânicas integradas no fluxo do contador parceiro: **Reserva 45 dias**, **Regra da Atitude (exclusividade)**, **Rede de Segurança (taxa de descoberta)** e **Cofre Digital (VDR)** com selo de prontidão.

---

### 1. Banco de dados (migração)

**Nova tabela `partner_lead_reservations`** — reserva temporária do lead pelo contador.
- `id`, `partner_user_id`, `listing_id`, `reserved_at`, `expires_at` (default `now() + 45 days`)
- `status`: `reserved` (default), `exclusive` (após ação qualificadora), `expired`, `closed_by_matrix`
- `qualifying_action` (text, nullable): tipo da ação que destravou exclusividade (`valuation`, `meeting_requested`, `vdr_doc_uploaded`)
- `qualified_at` (timestamp, nullable)
- `commission_type` (text): `full` (20%) quando exclusivo, `discovery_fee` (menor) quando matriz fechar
- RLS: contador vê só as suas; admin vê tudo; insert via trigger ou função.

**Nova tabela `vdr_documents`** — Cofre Digital por listing.
- `id`, `listing_id`, `uploaded_by`, `doc_category` (balanco, dre, contrato, fluxo_caixa, impostos, outros), `doc_name`, `file_url`
- `status`: `pending`, `validated`, `rejected`
- `validated_by`, `validated_at`, `rejection_reason`
- RLS: dono do listing + parceiro reservante + admin.

**Coluna em `listings`**: `vdr_readiness` (int 0-100) — calculada por trigger conforme docs validados.

**Trigger `auto_create_reservation_on_listing`**: quando um listing é criado por um `is_partner_accountant=true`, cria automaticamente uma `partner_lead_reservation` com 45 dias.

**Trigger `qualify_reservation_on_action`**: quando o parceiro gerar valuation OU subir doc VDR validado OU registrar reunião → atualiza status para `exclusive`.

**Função `expire_old_reservations()`** + cron diário: marca como `expired` reservas vencidas sem qualificação.

**Função `calculate_vdr_readiness(listing_id)`**: % de categorias obrigatórias (balanço, DRE, contrato, fluxo, impostos = 5) com pelo menos 1 doc `validated`.

---

### 2. Edge function `piperun-check-lead`

Verifica via API do PipeRun se um CNPJ/empresa já está sendo trabalhado pelo comercial da matriz antes de permitir reserva. Retorna `available` ou `taken_by_matrix`.
- Requer secret `PIPERUN_API_KEY` (pedir ao usuário).
- Stub inicial retorna sempre `available` se a integração ainda não estiver pronta.

---

### 3. Frontend — Páginas e componentes

**`src/pages/PartnerDashboard.tsx`** (nova rota `/parceiro`) — visão consolidada do contador:
- Cards: leads reservados, exclusivos, expirando em 7 dias, expirados
- Tabela de leads com countdown visual de dias restantes (verde > 15d, âmbar 7-15d, vermelho < 7d)
- CTA "Qualificar agora" abre opções: gerar valuation, agendar reunião, subir doc VDR

**`src/components/partner/ReservationCountdown.tsx`** — badge animado com dias restantes e barra de progresso.

**`src/components/partner/VDRUploader.tsx`** — Cofre Digital por listing:
- 5 categorias obrigatórias (balanço, DRE, contrato, fluxo, impostos) + opcionais
- Cada categoria mostra status: vazio / enviado / validado / rejeitado
- Barra "Prontidão para Venda" (0-100%) com cores progressivas
- Quando atinge 100%, banner "Pronto para a vitrine" notifica admin

**Atualização em `src/components/sell/wizard/NewListingWizard.tsx`**: quando o usuário é parceiro, mostra aviso "Este lead será reservado por 45 dias para você" antes do submit.

**Atualização em `MyListings.tsx`**: badge de status de reserva ("Reservado 38d", "Exclusivo", "Expirado") e link para o VDR.

**Atualização em `AdminPartnerships.tsx`**: nova aba/seção "Reservas Ativas" com kanban (Reservado / Exclusivo / Expirado / Fechado) + métrica "Taxa de Conversão Reserva→Exclusivo".

---

### 4. Notificações automáticas

- **D-7 antes de expirar**: alerta no sino "Sua reserva de [empresa] expira em 7 dias. Qualifique agora!"
- **Ação qualificadora detectada**: "Parabéns! [empresa] agora é exclusiva sua. Comissão cheia (20%) garantida."
- **VDR 100%**: notifica admin "[empresa] está pronta para a vitrine"
- **Matriz fechou lead expirado de parceiro**: notifica parceiro com taxa de descoberta

---

### Resumo de entregas

| Arquivo | Ação |
|---|---|
| migração SQL | `partner_lead_reservations`, `vdr_documents`, coluna `vdr_readiness`, triggers, cron |
| `supabase/functions/piperun-check-lead/index.ts` | Verifica disponibilidade do lead (stub inicial) |
| `src/pages/PartnerDashboard.tsx` | Dashboard do contador com leads reservados |
| `src/components/partner/ReservationCountdown.tsx` | Componente visual do cronômetro |
| `src/components/partner/VDRUploader.tsx` | Cofre Digital com 5 categorias + barra de prontidão |
| `src/pages/MyListings.tsx` | Badge de reserva + link para VDR |
| `src/components/sell/wizard/NewListingWizard.tsx` | Aviso de reserva 45d para parceiros |
| `src/pages/admin/AdminPartnerships.tsx` | Seção Kanban de reservas + métricas de conversão |
| `src/App.tsx` | Adicionar rota `/parceiro` |
| `src/components/layout/Header.tsx` | Link "Painel Parceiro" para `is_partner_accountant` |

**Pergunta chave antes de iniciar**: a integração com PipeRun já tem chave de API disponível, ou implemento o stub (sempre retorna disponível) e plugo a integração depois?

