# Fase F1.1 — Make-it-work (apenas fixes, zero feature nova)

Objetivo: tornar visível e funcional o que já foi construído nas fases E2/F1 mas está inerte (views incompletas, dados não calculados, componentes órfãos, sem cron).

---

## 1. Database — Migration

**a) Recriar `public.eb_buyers_enriched`** incluindo as 6 colunas novas de buyer:
`tese_text`, `criterios_exclusao`, `notas_estrategicas`, `linkedin_url`, `email_contato_principal`, `telefone_contato` + manter colunas existentes. `security_invoker=on`.

**b) Recriar `public.eb_companies_enriched`** (ou view equivalente usada no Mapa) expondo `latitude`, `longitude`, `geocoded_at`, `geocoded_source`, respeitando `is_company_visible_in_crm()`.

**c) Garantir `equity_brain.eb_v_mandate_pins`** com grants para `authenticated` e exposição via view pública `public.eb_v_mandate_pins`.

**d) Cron (`pg_cron` + `pg_net`)** — inserido via insert tool (contém URL/anon key, não migration):
- `geocode-companies-batch`: semanal (domingo 03h)
- `calculate-vendabilidade-batch`: a cada 4h
- `calculate-sav-score`: dispara junto com vendabilidade

---

## 2. Backfill imediato (insert tool)

Disparar 1x manualmente via `net.http_post`:
- geocodificar as 394 companies
- calcular SV/SAV de todos mandatos ativos
Para popular o mapa e os gauges já no primeiro acesso.

---

## 3. UI — Integrações que faltam

**a) `MapaPage.tsx`**
- Adicionar toggle “Heatmap | Mandatos” no topo do mapa.
- Quando “Mandatos”: renderizar `<MandateMap />` consumindo `eb_v_mandate_pins`.
- Legenda por fase (cores já existentes).

**b) `BuyerDetailPage.tsx`**
- Confirmar que `useBuyerCrm` lê de `eb_buyers_enriched` (com fallback resiliente para `equity_brain.buyers` se a view falhar).
- Garantir tabs “Tese” e “Track” renderizando `BuyerThesisBlock` e `BuyerTrackRecordBlock`.
- Botão `EnrichBuyerButton` visível no header da página + modal `EnrichReviewModal` aplicando updates via `useUpdateBuyer`.

**c) `DiagnosticoVispe.tsx`**
- Adicionar botão “Recalcular Vendabilidade” (admin/advisor) → invoca `calculate-vendabilidade-batch` para o mandato atual.
- Mostrar `Gauge` SV + `SAVBadge` lendo do registro atualizado.

**d) Loading/empty states** — todos os componentes acima devem renderizar skeleton + mensagem clara “Calculando…” / “Sem dados ainda” em vez de retornar `null`.

---

## 4. Hook hardening

`useBuyerCrm.ts` e `useMandatePins.ts`:
- try/catch em torno do select da view; se erro `42703` (column missing) ou `42P01` (relation missing), loggar e cair em query alternativa em `equity_brain.*`.
- Toast só em modo dev.

---

## 5. QA checklist (acceptance)

- [ ] `/equity-brain/mapa` mostra pelo menos 50 pins de mandatos no toggle “Mandatos”.
- [ ] `/equity-brain/buyer/:id` exibe campos editáveis e botão de IA; salvar grava em DB e cria `crm_activity`.
- [ ] `/equity-brain/mandate/:id` mostra Gauge SV preenchido e Badge SAV; botão recalcular funciona.
- [ ] Console sem erros de view inexistente.
- [ ] `select count(*) where latitude is not null` > 300 após backfill.

---

## Arquivos previstos

**Migration:** `supabase/migrations/<ts>_phase_f11_fixes.sql`
**Insert (cron + backfill):** via insert tool (não migration)
**Editados:** `src/pages/equity-brain/MapaPage.tsx`, `src/pages/equity-brain/BuyerDetailPage.tsx`, `src/components/equity-brain/DiagnosticoVispe.tsx`, `src/hooks/useBuyerCrm.ts`
**Novos (se faltarem):** `src/hooks/useMandatePins.ts`

Sem novos endpoints; sem novas tabelas; sem novas dependências.
