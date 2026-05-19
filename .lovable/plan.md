
# Plano — Alinhamento Press Release (C3 + C4)

## Status dos 6 pontos

| Ponto | Decisão |
|---|---|
| C1 — Mapa Anatel | ✅ Resolvido (já temos base Anatel no Supabase via `anatel-query`) |
| C2 — ISP mandates | ✅ Sem ação (já cumprido) |
| C3 — Perfil bidirecional | 🔨 Construir componente Tri-Postura |
| C4 — Darkpool/NDA | 🔨 Auto-log de acessos como "disclosure implícito" |
| C5 — Matching consolidador | ✅ Ok |
| C6 — Multi-vertical 2026 | ⏸ Adiado — quando chegar, listo o que precisa ser construído fora |

---

## C3 — Componente Tri-Postura (UI)

**Onde aparece:** página de detalhe da empresa no Equity Brain (`/equity-brain/deal/:id` e perfis de company quando abertos via CRM/360).

**O que é:** um card de 3 abas no topo do perfil que mostra a mesma empresa em 3 papéis simultâneos:

```text
┌───────────────────────────────────────────────────┐
│  [Como Vendedor] [Como Comprador] [Como Parceiro] │
├───────────────────────────────────────────────────┤
│  Top 5 contrapartes compatíveis nessa direção     │
│  • Codinome · score · 1 linha do "porquê"         │
│  • Botão "ver match completo"                     │
└───────────────────────────────────────────────────┘
```

- **Vendedor**: top 5 compradores que dariam match (já é o fluxo atual)
- **Comprador**: top 5 alvos que essa empresa absorveria (inverte direção do engine)
- **Parceiro**: top 5 sinergias não-M&A (joint-venture, cliente, fornecedor estratégico)

**Reuso:** `match-company-v2` já suporta direção via parâmetro — só precisa expor as 3 chamadas em paralelo no hook.

### Detalhes técnicos
- Novo componente `src/components/equity-brain/TriPosturaCard.tsx`
- Novo hook `src/hooks/useTriPostura.ts` que dispara 3 queries paralelas ao edge function `match-company-v2` com `direction: "sell" | "buy" | "partner"`
- Edge function `match-company-v2`: confirmar que aceita `direction="buy"` e `direction="partner"`; se não, adicionar branches (sem mudar a lógica de score, só inverter quem é alvo)
- Plugar no header de `src/pages/equity-brain/DealPage.tsx` (ou equivalente) acima do MatchWhyCard atual
- Codinome respeitado em todos os 3 lados (já é padrão)
- Loading skeleton + empty state ("Esta empresa ainda não tem matches nessa direção")

---

## C4 — Auto-log de acessos a identidade (sem fricção)

**Problema:** o release promete "darkpool com NDA auditável". Hoje o codinome funciona, mas `access_logs` tem só 51 entradas e `disclosure_requests` está zerado — não há trilha auditável de quem viu o quê.

**Solução escolhida:** auto-logar todo acesso a identidade real por admin/advisor como "disclosure implícito" — sem precisar request/approval. Mantém UX, gera auditoria.

### Detalhes técnicos

**1. Trigger automático em `equity_brain.access_logs`**
- Hook React `useIdentityVisibility` já existe e gates o reveal. Quando ele retorna `canView=true` e o usuário **efetivamente vê** identidade (ex: monta `IdentityRevealCard`, abre detalhe da company não-cega), disparar insert em `access_logs` via RPC `eb_log_identity_access(p_target_kind, p_target_cnpj, p_target_listing_id, p_context)`.
- Throttle no client: 1 log por (user, target, contexto) a cada 1h para não inflar.

**2. Nova RPC `eb_log_identity_access`** (SECURITY DEFINER)
- Insere em `equity_brain.access_logs` com `accessed_by=auth.uid()`, `disclosure_mode='implicit'`, `context` (ex: `"crm_360"`, `"deal_page"`, `"docs_panel"`).
- Não bloqueia nada — só registra.

**3. Coluna `disclosure_mode`** em `access_logs`
- `'implicit'` (auto-log de advisor interno) vs `'explicit'` (vem de `disclosure_grants` aprovados — parceiros externos no futuro).
- Default `'implicit'`.

**4. Pontos do código que disparam log**
- `IdentityRevealCard` (no mount, se identidade está visível)
- `DocumentsPanel` (ao abrir docs com dados de CNPJ/razão)
- `DealPage` (ao montar com `canViewIdentity=true`)
- `BlindTeaserButton` (ao revelar)
- `CRM 360` (mandate/buyer detail)

**5. Painel de auditoria simples**
- Reaproveitar `/equity-brain/disclosures` adicionando uma 5ª aba **"Acessos (log)"** que lista os últimos N entries de `access_logs` filtráveis por usuário/empresa/período. Read-only.
- Mostra: quem · quando · qual empresa (codinome + identidade) · contexto · modo (implicit/explicit).

**6. Memory update**
- Atualizar `mem://features/eb-identity-and-docs-unification` para refletir que todo reveal já loga automaticamente.

### O que NÃO muda
- Codinome continua default em listagens
- `disclosure_requests` continua existindo para o caso futuro de parceiros externos
- RLS de `eb_companies*_blind` permanece igual

---

## Ordem sugerida de execução

1. **C4 backend primeiro** (migration: coluna `disclosure_mode` + RPC `eb_log_identity_access`) — 1 migration
2. **C4 client hooks** — instrumentar os 5 pontos de reveal
3. **C4 painel "Acessos"** — aba nova em `/equity-brain/disclosures`
4. **C3 backend** — ajustar `match-company-v2` para aceitar `direction=buy|partner` se ainda não aceitar
5. **C3 hook + componente** — `useTriPostura` + `TriPosturaCard`
6. **C3 integração** — plugar no DealPage / perfil de company

**Estimativa:** 1 sessão para C4 completo + 1 sessão para C3 completo.

---

## Fora de escopo (C6 — quando chegar a hora)

Quando começarmos a aterrissar saúde / varejo / indústria como verticais 2026, vou te dizer exatamente o que precisa ser construído externamente (com Claude) e trazido pra inputar:
- Seed de 8-10 buyers reais por vertical (CSV)
- Lista de 3+ teses verticais por setor
- 5+ signals específicos por setor
- 3+ deals históricos da Vispe pra backtest

Por ora: nada a construir fora.
