---
name: Mari Prefill Bridge
description: Conecta /mari (calculadora pública) ao /vender (Sell Wizard) via sessionStorage com TTL 30min, sem schema novo.
type: feature
---
- `src/lib/mariPrefill.ts`: `setMariPrefill`, `getMariPrefill`, `clearMariPrefill` em sessionStorage `mari_prefill_v1` (TTL 30min); `cnaeToCategory()` mapeia setor RFB → 12 categorias do Sell Wizard.
- `MariResult` chama `setMariPrefill` e navega: logado → `/vender`, anônimo → `/auth?tab=signup&role=seller&redirect=/vender&cnpj=…`.
- `Auth.tsx` após signup: se `mari_prefill_v1` existe e role=seller, força destino `/vender` (sobrepõe `ROLE_HOME.seller`).
- `NewListingWizard` hidrata `cnpj`, `title` (razão social), `state`, `city`, `category` do prefill no mount; banner Volt no topo "Continuando do cálculo da Mari · [Limpar]". `clearMariPrefill()` ao publicar anúncio com sucesso.
- Zero migrations, zero edge functions novas. Não mexe em /valuation, Equity Brain ou Cockpit.
