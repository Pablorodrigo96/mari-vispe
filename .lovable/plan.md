## Objetivo

Criar uma camada universal de **Blind Teaser** para todas as empresas que entram na plataforma (parceiros, valuation, captação, listings manuais, importação em massa, expansão RFB). Cada empresa ganha um **codinome** automático e dados sensíveis ficam ocultos para parceiros/franqueados/buyers — só **admins e advisors Vispe** veem a identidade real. Para "destravar", parceiros acionam um advisor.

---

## Comportamento esperado

- Toda `equity_brain.companies` e todo `listings` ganha automaticamente um `codename` (ex.: `MARI-TECH-0142`, `MARI-FOOD-0087`).
- Em qualquer tela onde um parceiro/buyer/franchisee veja oportunidades/matches, aparece **somente** o teaser cego: codinome, setor, UF, faixa de receita, faixa de ticket, score, sinais. Nunca CNPJ, razão social, município exato, sócios, telefone, email, endereço.
- Admin/Advisor Vispe vê tudo (toggle "Modo Cego" para QA opcional).
- Botão **"Solicitar abertura via Advisor"** em cada teaser abre fluxo que cria um `disclosure_request` e notifica o advisor responsável (ou pool de advisors).
- Advisor aprova → libera identidade só para aquele user/listing/janela de tempo (registro auditado).

---

## Mudanças no banco

### Schema

1. `equity_brain.companies` + `public.listings`: adicionar
   - `codename text unique` (gerado automaticamente)
   - `codename_prefix text` (ex.: `TECH`, `FOOD`, derivado de `setor_ma` / `category`)
2. Função `equity_brain.generate_codename(setor text) returns text` — pega prefixo do setor e sequência (ex.: `MARI-TECH-0001`).
3. Trigger `BEFORE INSERT` em `companies` e `listings` que preenche `codename` se vier nulo. Backfill para registros existentes.
4. Nova tabela `equity_brain.disclosure_requests`:
   - `id, requester_id, target_kind ('company'|'listing'), target_cnpj, target_listing_id, status ('pending'|'approved'|'rejected'|'expired'), reason, advisor_id, decided_at, expires_at (default now()+14d), created_at`
   - RLS: requester vê os seus; advisor/admin vê todos; insert aberto a authenticated; update só advisor/admin.
5. Nova tabela `equity_brain.disclosure_grants`:
   - `id, request_id, granted_to_user_id, target_kind, target_cnpj, target_listing_id, granted_by, granted_at, expires_at, revoked_at`
6. View pública/parceira **`equity_brain.companies_blind`** `WITH (security_invoker=on)`:
   - Expõe: `codename, setor_ma, subsetor_ma, uf, porte, faixa_faturamento (bucket), faixa_capital_social (bucket), qtd_socios, qtd_funcionarios_bucket, ma_score, sucessao_score, has_signals, refreshed_at`.
   - **Esconde**: `cnpj, razao_social, nome_fantasia, municipio, bairro, cep, endereco_*, lat/lng exatos, sócios PF/PJ, raw_data, faturamento_estimado bruto`.
7. View `public.listings_blind` análoga para listings (esconde título real, endereço, fotos identificáveis, vídeo).
8. RPC `eb_can_view_identity(p_user uuid, p_cnpj text default null, p_listing uuid default null) returns boolean` — true se admin/advisor, dono, ou existe `disclosure_grant` ativo.
9. RPC `eb_request_disclosure(p_target_kind, p_target_cnpj, p_target_listing_id, p_reason)` cria request + `deal_event` `disclosure_requested` + notificação para advisors.
10. RPC `eb_approve_disclosure(p_request_id, p_expires_in_days)` cria grant, marca request, dispara `deal_event` `disclosure_granted` e notifica requester.

### Bucketing (helpers SQL)

- `faixa_faturamento`: `<2M / 2-10M / 10-50M / 50-200M / 200M+`.
- `qtd_funcionarios_bucket`: `<10 / 10-50 / 50-200 / 200-1k / 1k+`.

---

## Backend / Edge Functions

- Atualizar **todas** as origens que criam companies/listings para garantir codename:
  - `sync-listings-to-equity-brain`, `sync-companies-from-cnpj`, `expand-companies-from-rfb`, `eb-import`, wizard `NewListingWizard.tsx` (já gera ticker — passa a usar a nova função para alinhar formato).
  - O trigger cobre o caso geral; as funções só precisam não sobrescrever.
- Nova edge function `eb-disclosure` (POST `request` / `approve` / `reject` / `revoke`) — wrapper sobre as RPCs com logging em `equity_brain.access_logs`.
- `match-buyer` / `match-batch`: passam a retornar somente campos cegos quando `requester` não é admin/advisor (já há service role, basta acrescentar máscara no payload entregue ao client).

---

## Frontend

### Componentes novos

- `src/lib/blindTeaser.ts`: `getCodename(company|listing)`, `bucketRevenue(n)`, `bucketEmployees(n)`, helpers de máscara.
- `src/components/equity-brain/BlindBadge.tsx`: chip "🔒 Blind" com tooltip explicando.
- `src/components/equity-brain/RequestDisclosureDialog.tsx`: form com motivo (livre + checklist: "tenho buyer interessado", "due diligence", "co-broker") → chama `eb-disclosure` `request`.
- `src/components/equity-brain/DisclosureStatusPill.tsx`: pending/approved/rejected/expired.
- `src/pages/equity-brain/DisclosuresPage.tsx` (advisor/admin): inbox para aprovar/recusar requests com contexto da empresa.
- Hook `useIdentityVisibility(cnpj?, listingId?)` → consulta RPC `eb_can_view_identity`; controla render condicional.

### Telas a adaptar

- `OportunidadesPage`: para não-admins, lista a partir de `equity_brain.companies_blind` em vez de `eb_opportunities_ready` (ou cria `eb_opportunities_blind`). Mostra codename + bucket + score + botão "Solicitar abertura".
- `DealCard`: dois modos — `identified` (admin/advisor/grant) e `blind`. Mascara CNPJ, razão social, endereço, sócios, contatos, raw_data. Substitui por codename + buckets. Botão "Solicitar abertura via Advisor".
- `MatchesPanel`, `BuyerDetailPage` (lado company), `MapaPage` (markers sem nome real / coords arredondadas para o centróide do município), `ExportsPage` (exports não-admin saem cegos).
- `BlindTeaser.tsx` (página pública por ticker): já cega — apenas alinhar para usar `codename` quando vier de companies sem listing.
- `AppShell` / sidebar: nova rota **CRM → Aberturas (disclosures)** para advisors/admins.

### Notificações

- Insert em `notifications` para advisors quando há novo request; para requester quando aprovado/recusado/expirado.

---

## Auditoria & segurança

- Cada visualização identificada por não-dono é logada em `equity_brain.access_logs` (já existe).
- Grants têm expiração padrão 14 dias e podem ser revogados.
- RLS nas views base permanece restrita; tudo via `companies_blind` para parceiros.
- `deal_events`: novos tipos `disclosure_requested`, `disclosure_granted`, `disclosure_rejected`, `disclosure_revoked`, `identity_viewed`.

---

## Plano de rollout

1. Migration: colunas `codename`, função+trigger, backfill, tabelas `disclosure_requests` / `disclosure_grants`, views `*_blind`, RPCs.
2. Edge function `eb-disclosure` + ajustes em `match-*`.
3. Helpers + componentes (`BlindBadge`, `RequestDisclosureDialog`, `DisclosureStatusPill`, hook).
4. Refatorar `DealCard`, `OportunidadesPage`, `MatchesPanel`, `BuyerDetailPage`, `MapaPage`, `ExportsPage` para usar visão cega quando aplicável.
5. `DisclosuresPage` (inbox advisor) + rota + sidebar.
6. Atualizar `sync-*` / `eb-import` / wizard para confiar no trigger de codename.
7. Memory update (`mem://features/blind-teaser-universal`).

---

## Detalhes técnicos relevantes

```sql
-- Trigger essencial
CREATE OR REPLACE FUNCTION equity_brain.set_codename()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE prefix text; seq int;
BEGIN
  IF NEW.codename IS NOT NULL THEN RETURN NEW; END IF;
  prefix := COALESCE(upper(left(regexp_replace(NEW.setor_ma,'[^A-Za-z]','','g'),4)), 'GEN');
  SELECT COALESCE(MAX(substring(codename from '\d+$')::int),0)+1
    INTO seq FROM equity_brain.companies WHERE codename LIKE 'MARI-'||prefix||'-%';
  NEW.codename := format('MARI-%s-%s', prefix, lpad(seq::text,4,'0'));
  RETURN NEW;
END$$;
```

```sql
-- View cega (resumo)
CREATE VIEW equity_brain.companies_blind WITH (security_invoker=on) AS
SELECT codename, setor_ma, subsetor_ma, uf, porte,
  CASE WHEN faturamento_estimado < 2e6 THEN '<2M'
       WHEN faturamento_estimado < 10e6 THEN '2-10M'
       WHEN faturamento_estimado < 50e6 THEN '10-50M'
       WHEN faturamento_estimado < 200e6 THEN '50-200M'
       ELSE '200M+' END AS faixa_faturamento,
  qtd_socios, has_listing, qualification_status
FROM equity_brain.companies;
```

```ts
// Hook de visibilidade
const { data: canSeeIdentity } = useQuery({
  queryKey: ['eb','identity', cnpj, listingId],
  queryFn: async () => {
    const { data } = await supabase.rpc('eb_can_view_identity', {
      p_cnpj: cnpj ?? null, p_listing: listingId ?? null,
    });
    return data === true;
  },
});
```

---

## Fora do escopo (próxima iteração)

- NDA digital antes de aprovar grant.
- Watermark dinâmico em PDFs do VDR.
- Score de confiança do parceiro afetando aprovação automática.