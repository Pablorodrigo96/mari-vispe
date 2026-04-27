
# Fase 8 — Dashboard Equity Brain (UI Premium)

Cockpit interno em `/equity-brain/*` para admin/advisor — separado do marketplace público. Visual dark, denso, focado em decisão M&A.

## 1. Setup de rotas + guard

- **`src/components/auth/RequireRole.tsx`**: Reutiliza `useAuth` + `useUserRoles`. Se loading → spinner; sem user → `/auth`; sem role match → `/`. Aceita `roles={['admin','advisor']}`.
- **`src/components/equity-brain/EquityBrainLayout.tsx`**: Layout com sidebar fixa (logo Vispe + links: Dashboard, Oportunidades, Buyers, Teses, Calls, Mapa), header com user menu + busca global por CNPJ. Wrapper `<div className="dark bg-zinc-950 min-h-screen text-zinc-100">` para forçar dark localmente. Usa `<Outlet />` do react-router.
- **`src/App.tsx`**: Adiciona rotas aninhadas:
  ```tsx
  <Route path="/equity-brain" element={<RequireRole roles={['admin','advisor']}><EquityBrainLayout /></RequireRole>}>
    <Route index element={<DashboardPage />} />
    <Route path="oportunidades" element={<OportunidadesPage />} />
    <Route path="buyers" element={<BuyersPage />} />
    <Route path="teses" element={<TesesPage />} />
    <Route path="calls" element={<CallsPage />} />
    <Route path="empresa/:cnpj" element={<DealDetailPage />} />
  </Route>
  ```
- **Tema**: `bg-zinc-950` base, `bg-zinc-900` cards, `border-zinc-800`, `text-zinc-100`. Accent `emerald-500` (positivo), `amber-500` (alerta), `rose-500` (erro).

## 2. `DashboardPage.tsx`

4 seções com React Query (refetch 60s):

1. **KPIs (4 cards `<EBStatCard>`)**: 
   - Empresas no banco (`companies` where `situacao_cadastral='Ativa'`)
   - Score M&A médio (`avg(ma_score)` de `companies_scored`)
   - Oportunidades quentes (`opportunities_ready` tier='premium')
   - Calls últimos 7 dias (`call_feedback`)
2. **Funil horizontal**: 5 estágios (Universo → Filtradas → Ranqueadas → Premium → Em conversa) com barras proporcionais.
3. **Top 50**: tabela densa de `opportunities_public` tier='premium' order by `score_ma desc`. Colunas: Razão Social | UF | Setor | Score M&A | Vispe Fit | Buyers Match | Tese Top | Ações ([Ver Deal] abre drawer / [Iniciar Call] abre form).
4. **Atividade recente**: últimos 20 `events` com `processed_status='success'`, formato `[ícone] descrição humana · tempo relativo`.

## 3. `OportunidadesPage.tsx`

Layout 3 colunas: filtros (280px) | tabela | drawer condicional (480px).

- **Filtros sidebar** (debounce 300ms): UF multi, Setor multi, Score M&A min slider, Faixa faturamento, Toggle "com sinais", Toggle "com buyer matches", Tese top single-select, Tier checkboxes.
- **Tabela TanStack Table**: Checkbox, Razão Social (click → drawer), CNPJ (mascarado se não-admin), UF+município, Setor (badge), Score M&A (cor por faixa), Vispe Fit, Sinais (top 3 badges + "+N"), Buyers (count + miniavatares), Tese top, Última atualização.
- **Paginação real**: 50/página, dropdown 25/50/100/200, count total no footer.
- **Ações em massa** (quando há seleção): "Adicionar à campanha" (placeholder Fase 11), "Marcar para outreach", "Exportar CSV".
- **Drawer**: renderiza `<DealCard cnpj={selected} mode="drawer" />` + botão "Ver página completa" → `/equity-brain/empresa/:cnpj`.

## 4. `DealCard.tsx` (componente central)

Props: `{ cnpj, mode?: 'drawer' | 'page' }`. Usa `useQueries` (paralelo) para 6 fontes:

1. `companies_enriched` → header
2. `companies_scored` → scores + breakdowns
3. `company_signals` order by `weight desc`
4. `matches_enriched` order by `match_score desc` limit 10
5. `opportunities_public` → `ai_thesis_summary`, `ai_pitch`
6. `call_feedback` order by `call_at desc` limit 5

Blocos visuais:
- **Header**: razão social (h1), CNPJ/UF/Município/Setor, badges status+tier, botões `[📞 Ligar] [✉ Email] [📌 Salvar]`.
- **Scores**: 3 dials SVG horizontais (M&A, Vispe Fit, Sucessão) com track + fill.
- **Tese principal**: bloco com `ai_thesis_summary` + label tese + confiança.
- **Sinais ativos**: chips coloridos por weight (rose >0.7, amber >0.4, yellow). Limita 5 + "+N outros".
- **Buyers recomendados**: top 5 cards expansíveis com cobertura por dimensão.
- **Histórico contato**: lista compacta de `call_feedback`.
- **AI Pitch**: prose + botão "Copiar" + botão "Regenerar" (chama `claude-generate-pitch`).

**Modal Quick Call** (botão Ligar): outcome (8 radios), interest_level (1-5 stars), timing_estimado, dor_principal, raw_notes (textarea). Submit → `POST /functions/v1/feedback-from-call` → toast "Feedback registrado. Score recalculando…" → refetch 10s depois.

## 5. `BuyersPage.tsx`

- Tabela: Nome (click → drawer) | Tipo (badge) | AUM | # Teses ativas | # Empresas matchadas | Última atualização.
- Botão "+ Novo Buyer" → modal form (Nome, Tipo, Ticket min/max, Setores, UFs, Notas) → INSERT em `equity_brain.buyers`.
- **Drawer `<BuyerCard>`** com 3 abas (Tabs shadcn): Teses (CRUD inline em `buyer_theses`), Matches (lista de empresas via `matches_enriched`), Histórico (events do buyer).
- CRUD tese inline: dropdown `investment_theses`, multi-select CNAEs (`cnae_setor_map`), UFs, faixa faturamento, score min M&A. Save → upsert `buyer_theses` (trigger Fase 7 dispara recompute).

## 6. `TesesPage.tsx`

- Grid 2 colunas de cards de `investment_theses`: thesis_key (badge mono), display_name, description, ideal_signals (chips), match_weight, # buyers usando, # empresas com tese top.
- Botão `[Editar]` → modal form completo. `[+ Nova Tese]` → modal vazio.
- CTA `[Testar tese]` → preview top 20 empresas que matcham (query simulada client-side).

## 7. `CallsPage.tsx`

2 seções:
1. **Pipeline outreach**: tabela de empresas atribuídas (admin vê todas; advisor vê próprias) com Empresa, UF/Setor, Score M&A, Última call, Próxima ação, `[Iniciar call]`.
2. **Histórico**: tabela paginada de `v_bdr_history` — Data, Empresa, Outcome (badge), Interest (estrelas), Notas (preview com hover), `[Ver detalhe]`.
3. Botão `[+ Nova Call]` topo (mesmo modal do DealCard). Botão `[Importar transcrição]` aceita .txt → roda `claude-analyze-call` em batch.

## 8. `DealDetailPage.tsx`

Página standalone que renderiza `<DealCard cnpj={params.cnpj} mode="page" />` em layout largo.

## Dependências e cuidados

- Adicionar `@tanstack/react-table` (paginação/seleção). React Query já existe. Sem virtualização (paginação real cobre).
- Mascarar CNPJ para usuários não-admin: helper `maskCnpj(cnpj, isAdmin)`.
- Realtime opcional: por ora apenas refetch interval 60s no Dashboard.
- Não tocar em rotas existentes (`/admin/*`, marketplace) — Equity Brain é namespace separado.

## Arquivos a criar
- `src/components/auth/RequireRole.tsx`
- `src/components/equity-brain/EquityBrainLayout.tsx`
- `src/components/equity-brain/EBSidebar.tsx`
- `src/components/equity-brain/EBStatCard.tsx`
- `src/components/equity-brain/EBFunnel.tsx`
- `src/components/equity-brain/DealCard.tsx`
- `src/components/equity-brain/QuickCallModal.tsx`
- `src/components/equity-brain/BuyerCard.tsx`
- `src/components/equity-brain/ScoreDial.tsx`
- `src/components/equity-brain/SignalChip.tsx`
- `src/lib/equityBrain.ts` (helpers: maskCnpj, formatters, color scales)
- `src/pages/equity-brain/DashboardPage.tsx`
- `src/pages/equity-brain/OportunidadesPage.tsx`
- `src/pages/equity-brain/BuyersPage.tsx`
- `src/pages/equity-brain/TesesPage.tsx`
- `src/pages/equity-brain/CallsPage.tsx`
- `src/pages/equity-brain/DealDetailPage.tsx`

## Arquivos a editar
- `src/App.tsx` — adicionar rotas e imports.

Após aprovação, sigo direto para implementação.
