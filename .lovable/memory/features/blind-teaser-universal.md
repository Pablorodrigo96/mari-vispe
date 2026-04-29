---
name: blind-teaser-universal
description: Universal blind teaser layer — codename auto-generated for every company/listing, blind views hide identity from partners/buyers, advisors approve disclosure requests to reveal real data.
type: feature
---

## Codenames
- `equity_brain.companies` and `public.listings` have `codename` (`MARI-<PREFIX>-####`) and `codename_prefix`.
- BEFORE INSERT triggers `equity_brain.set_company_codename` and `public.set_listing_codename` auto-fill via `equity_brain.next_codename(prefix)` based on `setor_ma`/`category`. Backfill ran on existing rows.

## Disclosure flow
- `equity_brain.disclosure_requests` (status pending/approved/rejected/expired/revoked, expires_at default +14d, target_kind company|listing).
- `equity_brain.disclosure_grants` registers active permissions (granted_to + target + expires_at).
- RPCs:
  - `public.eb_can_view_identity(p_cnpj, p_listing)` — true for admin/advisor, listing owner, or active grant.
  - `public.eb_request_disclosure(target_kind, cnpj, listing_id, reason)` — creates request, notifies advisors+admins, dedupes pending.
  - `public.eb_decide_disclosure(request_id, 'approved'|'rejected', expires_in_days, notes)` — advisor/admin decision; on approve creates grant + notifies requester.

## Blind views
- `equity_brain.companies_blind` and `public.listings_blind` (`security_invoker=on`) expose only codename + setor + UF + buckets (`bucket_revenue`, `bucket_employees`) + scores; CNPJ/razão/municipio/imagens/contatos só aparecem quando `eb_can_view_identity` retorna true.

## Frontend
- `src/lib/blindTeaser.ts` — bucket helpers + DISCLOSURE_REASONS list.
- `src/hooks/useIdentityVisibility.ts` — wraps the RPC.
- `src/components/equity-brain/BlindBadge.tsx` — locked/unlocked chip.
- `src/components/equity-brain/RequestDisclosureDialog.tsx` — partner-facing request modal.
- `src/pages/equity-brain/DisclosuresPage.tsx` — advisor inbox at `/equity-brain/crm/aberturas` (linked from CrmHubPage).
- `DealCard` shows BlindBadge + codename and masks razão/CNPJ/municipio when `identified=false`, exibindo o botão "Solicitar abertura via Advisor".

## Observações
- View security warnings reportados pelo linter são pré-existentes (106 issues globais); novas views usam `security_invoker=on` corretamente.
- Próximo passo opcional: NDA digital antes do grant + watermark em VDR; aplicar mesma lógica blind em MapaPage/ExportsPage para parceiros.
