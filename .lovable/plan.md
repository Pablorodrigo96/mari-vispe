
# Cockpit do Head de Parcerias + Gestão de Acessos

Adicionar uma nova aba **"Cockpit Head"** (default) em `/admin/parcerias` com KPIs/rotinas de monitoramento, **mais** ações de gestão do ciclo de vida do parceiro: criar, aprovar, suspender, desqualificar e reativar — tudo em um só lugar.

A página já existe em `src/pages/admin/AdminPartnerships.tsx` e já lê `profiles`, `listings`, `partner_lead_reservations`, `vdr_documents`, `partner_activities`. Vamos reaproveitar `fetchData` e estendê-lo.

---

## 1. Aba "Cockpit Head" (monitoramento)

```text
┌─ KPIs (8 cards, grid 4 cols) ────────────────────────────────────┐
│ Novos parceiros (30d) │ Engajados/Total │ Inativos (>60d) │ ICP%│
│ Leads no mês          │ Eventos no mês  │ Reuniões R/A    │ Receita vs Estimativa │
└──────────────────────────────────────────────────────────────────┘

┌─ Rotinas do Dia ────────────────────────┬─ Top performers ───────────┐
│ ▸ Follow-ups pendentes (X)              │ Score = leads × ICP × conv │
│ ▸ Reuniões agendadas hoje/semana (X)    │ Top 10 + sparkline         │
│ ▸ Pipeline a bater por parceiro         │                            │
│ ▸ Parceiros sem interação 30/60/90d     │                            │
│ ▸ Sugestão de corte (>90d inativos)     │                            │
└─────────────────────────────────────────┴────────────────────────────┘

┌─ Parceiros em risco / a cortar ─────────────────────────────────────┐
│ Nome │ Última indicação │ Última atividade │ Leads 90d │ Ações       │
└──────────────────────────────────────────────────────────────────────┘

┌─ Reuniões: agendadas vs realizadas (90d) ───────────────────────────┐
│ Parceiro │ Agendadas │ Realizadas │ Taxa │ Próxima reunião          │
└──────────────────────────────────────────────────────────────────────┘
```

### KPI → fonte
| KPI | Cálculo |
|---|---|
| Novos parceiros (30d) | `profiles.is_partner_accountant=true AND created_at >= now()-30d` |
| Engajados/Total | já existe (`is_active` = última listing < 60d) |
| Leads cadastrados / parceiro | `listings` agrupado por `user_id` |
| Eventos realizados | `partner_activities` tipo `evento` com `completed_at` (30d) |
| Reuniões agendadas vs realizadas | counts `reuniao_agendada` vs `reuniao_realizada` |
| Receita / parceiro vs estimativa | `Σ asking_price × success_fee` vs meta constante (R$ 50k/mês/parceiro ativo) |
| Leads dentro do ICP Vispe | `listings.equity_score >= 60` por parceiro |
| Sem interagir | sem `partner_activities` E sem nova `listing` em 30/60/90d |

### Rotinas → ação na UI
| Rotina | Implementação |
|---|---|
| Follow-up parceiros ativos | Lista parceiros sem `followup` em 14d → botão abre Dialog de atividade existente |
| Bater Pipeline / parceiro | Card por parceiro: meta vs realizado (barra) |
| Revisar eventos agendados | `scheduled_at >= today AND completed_at IS NULL` → "Marcar realizada"/"Reagendar" |
| Ranking top performers | Score `leads_mes×1 + icp×2 + exclusivos×5` |
| Corte parceiros inativos | Inativos >90d → botão "Desqualificar" (ver §2) |

---

## 2. Aba "Gestão de Parceiros" (ciclo de vida)

Nova aba com tabela única de **todos os parceiros** + ações administrativas.

```text
┌─ Header ──────────────────────────────────────────────────────────┐
│ [+ Criar parceiro]   [Aprovar pendentes (3)]   filtros / busca    │
└───────────────────────────────────────────────────────────────────┘

┌─ Tabela ──────────────────────────────────────────────────────────┐
│ Nome │ Email │ Empresa │ Status │ Origem │ Leads │ Última ação │ ⋮ │
└───────────────────────────────────────────────────────────────────┘
```

**Status do parceiro** (derivado em UI, persistido em `profiles`):
- `pending` — pediu acesso (já existe `franchisee_requests`; criar fluxo equivalente para parceiro)
- `active` — `is_partner_accountant=true`
- `suspended` — flag nova `partner_status='suspended'`
- `disqualified` — flag nova `partner_status='disqualified'` (mantém histórico, não pode logar como parceiro)

### Ações no menu ⋮ por linha

| Ação | Efeito |
|---|---|
| **Criar parceiro** | Modal: nome, email, telefone, empresa → Edge Function `create-partner` cria user em `auth.users` (admin API), marca `is_partner_accountant=true`, dispara magic link de boas-vindas |
| **Aprovar acesso** | Set `is_partner_accountant=true` + insere role `advisor` em `user_roles` |
| **Suspender** | `partner_status='suspended'` (UI bloqueia, login mantido) |
| **Reativar** | `partner_status='active'` |
| **Desqualificar** | `partner_status='disqualified'`, remove role `advisor`, registra `partner_activities` tipo `corte` com motivo |
| **Editar dados** | Atualiza `profiles` (nome, telefone, empresa) |
| **Registrar atividade** | Reusa Dialog existente |
| **Ver drill-down** | Sheet existente (reservas, VDR, atividades) |

---

## 3. Mudanças técnicas

### Banco (migration)
1. `ALTER TABLE public.profiles ADD COLUMN partner_status text DEFAULT 'active' CHECK (partner_status IN ('pending','active','suspended','disqualified'));`
2. `ALTER TABLE public.profiles ADD COLUMN partner_disqualified_reason text;`
3. `ALTER TABLE public.profiles ADD COLUMN partner_disqualified_at timestamptz;`
4. Permitir nova `activity_type='corte'` (texto livre, não há CHECK).

### Edge Function nova: `create-partner`
- Valida JWT do chamador e checa role `admin` via `has_role`.
- Body: `{ email, full_name, phone?, company_name? }` (Zod).
- Usa `supabase.auth.admin.createUser({ email, email_confirm: true })`.
- `INSERT INTO profiles (user_id, full_name, phone, company_name, is_partner_accountant=true, partner_status='active')`.
- `INSERT INTO user_roles (user_id, role='advisor')`.
- Dispara `supabase.auth.admin.generateLink({ type:'magiclink', email })` e retorna o link (admin envia manualmente ou integramos email depois).

### Frontend
- **`src/pages/admin/AdminPartnerships.tsx`**: adicionar 2 abas novas — `cockpit` (default) e `manage`. Estender `fetchData` com `interest_logs` por parceiro e cálculos derivados (leads_30d, eventos_30d, reuniões_R/A, dias_sem_interacao).
- **Novos componentes em `src/components/admin/partnerships/`**:
  - `CockpitKPIs.tsx`, `RotinasPanel.tsx`, `TopPerformersList.tsx`, `PartnersAtRiskTable.tsx`, `MeetingsScoreboard.tsx`
  - `PartnerManagementTable.tsx` — tabela + dropdown de ações
  - `CreatePartnerDialog.tsx` — formulário de criação (chama `create-partner`)
  - `DisqualifyPartnerDialog.tsx` — confirma + captura motivo
- **`src/lib/partnershipsTargets.ts`**: constantes (`MONTHLY_REVENUE_TARGET_PER_PARTNER=50000`, `SUCCESS_FEE_PCT=0.03`, `INACTIVE_DAYS=60`, `CUT_DAYS=90`).

### Permissões
- Todas as ações já são protegidas pela RLS atual (`has_role(auth.uid(),'admin')` na update de `profiles` e `user_roles`).
- A criação de usuário **só** acontece via Edge Function (service role) — admin frontend nunca tem `service_role`.

---

## Fora de escopo
- Tabela `partnership_targets` (metas customizáveis por parceiro/mês) — usaremos constante.
- Email transacional de boas-vindas com template — por enquanto retornamos magic link no toast para o admin compartilhar.
- Webhook automático de aviso de inatividade (>30d).
