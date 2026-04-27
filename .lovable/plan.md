
## Diagnóstico dos 3 problemas

**1. Sidebar some ao navegar (sem botão voltar):**
Hoje só essas rotas ficam dentro do `<AppShell />`: `/painel`, `/meus-anuncios`, `/editar-anuncio/:id`, `/meu-perfil`, `/meus-valuations`, `/cadastrar-comprador`, `/minhas-captacoes`, `/matching/resultados`, `/potencial-carteira`, `/parceiro`. Mas o sidebar tem links para `/marketplace`, `/mapa`, `/vender`, `/valuation`, `/valuation/multiplos`, `/valuation/dcf`, `/valuation/certificador`, `/capital`, `/matching` — todas **fora** do AppShell. Resultado: o usuário clica num item do menu, cai num layout público (Header + Footer) sem sidebar e sem voltar.

**2. Equity Brain sem oportunidades:**
Banco hoje: `companies = 84`, `company_signals = 0`, `company_scores = 0`, `opportunities_ready = 0`. O `sync-listings-to-equity-brain` faz o upsert das companies corretamente, mas os 3 edge functions encadeados (`compute-signals` → `calculate-scores` → `refresh-opportunities`) não estão produzindo linhas para empresas vindas de listings (provavelmente porque dependem de joins com tabelas externas que ainda não existem). As listings do marketplace têm receita/lucro/setor reais — dá pra gerar signals + scores diretamente disso.

**3. Filtros do mapa pesados:**
Hoje é uma sidebar lateral de 288px com accordions, checkboxes verticais para 27 estados, lista comprida de cidades, slider de preço, etc. Padrão OLX/Mercado Livre é: barra horizontal no topo com chips clicáveis ("Setor", "Localização", "Preço", "Tipo"), modal/popover para escolher múltiplos, chips removíveis logo abaixo mostrando filtros ativos, mapa em tela cheia.

---

## Plano em 3 frentes

### Frente 1 — Navegação persistente do logado

**1.1. Levar todas as rotas-tool para dentro do `<AppShell />`** em `src/App.tsx`, criando um `<AuthRoute>` wrapper que:
- Se logado → renderiza `<AppShell><Outlet/></AppShell>` (sidebar + topbar fixos)
- Se visitante → renderiza a página crua com `<Header/>` público (mantendo o comportamento atual)

Rotas que vão virar "híbridas": `/marketplace`, `/mapa`, `/vender`, `/sell`, `/valuation`, `/valuation/multiplos`, `/valuation/dcf`, `/valuation/certificador`, `/capital`, `/matching`, `/anuncio/:id`, `/teaser/:ticker`.

**1.2. Cada página interna esconde seu próprio `<Header/>` quando estiver dentro do AppShell.** Crio um hook `useInAppShell()` que expõe um boolean (lê de um `AppShellContext`). As páginas hoje renderizam `<Header />` no topo — vão passar a fazer `{!inAppShell && <Header />}`. Mesma coisa para `<Footer />` em páginas que renderizam.

**1.3. Topbar com breadcrumbs e botão "Voltar"** em `AppTopbar.tsx`:
- Adiciona um botão de voltar (`ArrowLeft`) à esquerda quando `history.length > 1`
- Breadcrumb dinâmico baseado na rota (ex: `Marketplace › Anúncio XYZ`)
- Mantém busca global, notificações e ViewAsSwitcher

**1.4. AppSidebar não some no mobile:** o problema atual é que ele está em `lg:block` (oculto < 1024px) e a versão mobile só aparece quando `mobileOpen=true`. Adiciono no `AppTopbar` o botão hambúrguer que dispara `onMenuClick` (já existe a prop) — só precisa garantir que o botão é visível e que o mobile drawer não fecha em cliques internos não intencionais.

**1.5. Sidebar collapse com tooltip:** quando colapsado para `w-16`, garantir que ao passar o mouse num item ele mostre o nome (já tem `title=`, mas posso trocar para `Tooltip` do shadcn para ficar mais estável).

---

### Frente 2 — Equity Brain: gerar signals + scores reais a partir das 84 listings

Como as edge functions atuais (`compute-signals`, `calculate-scores`) dependem de fontes externas (CNPJ enrichment, partners, etc.) que não estão populadas para os CNPJs sintéticos das listings, vou **criar uma migration SQL com uma função `equity_brain.bootstrap_from_listings()`** que faz tudo num só lugar:

**2.1. Para cada listing já espelhada em `equity_brain.companies`, gerar `company_signals`** com base nos dados reais que temos:
- `signal_revenue_tier` — peso 0–100 baseado em `annual_revenue` (tiers: <1M, 1–5M, 5–20M, >20M)
- `signal_profitability` — `annual_profit / annual_revenue` mapeado para 0–100
- `signal_age` — anos desde `foundation_year` (empresas 5–15 anos = peso máximo, candidatas a sucessão)
- `signal_explicit_sale_intent` — peso fixo `90` (anúncio é declaração explícita de venda)
- `signal_vdr_readiness` — usa o campo `vdr_readiness` já calculado em `public.listings`
- `signal_plan_master` — peso `+15` se `plan = 'master'` (sinal de seriedade)
- `signal_geo` — peso `+10` se a empresa está em SP/RJ/MG/PR/RS/SC (mercados líquidos)

**2.2. Calcular `company_scores`** com fórmula:
- `vispe_score` = média ponderada dos signals de qualidade (rev_tier, profitability, vdr_readiness)
- `sucessao_score` = peso da idade da empresa + ausência de sucessor declarado
- `ma_score` = `0.5 * vispe_score + 0.2 * sucessao_score + 0.2 * explicit_sale_intent + 0.1 * geo`
- `buyer_fit_score` = simples count de `buyer_profiles` ativos compatíveis (categoria + estado + budget) → essa parte usa join com `public.buyer_profiles`

**2.3. Atualizar `opportunities_ready`** (provavelmente é uma view ou tabela materializada — confirmo na implementação) para incluir essas 84 empresas.

**2.4. Trigger automática:** estender o trigger existente em `public.listings` para chamar `bootstrap_from_listings()` para o listing recém-inserido/atualizado (não só o upsert da company, mas todo o ciclo signals+scores).

**2.5. Botão "Sincronizar marketplace"** no `DashboardPage` continua existindo, mas agora chama uma nova edge function `bootstrap-equity-brain-from-listings` que executa o SQL acima em batch. Não dependemos mais de fontes externas pra ter dado quente no cockpit.

**2.6. Validação:** após rodar uma vez, espera-se ver no dashboard `Empresas no banco: 84`, `Premium (≥80): N>0`, `opportunities_ready: 84`, e a tabela "Top 50 oportunidades" populada com as listings reais.

---

### Frente 3 — Filtros do Mapa estilo OLX/Mercado Livre

Reescrever `src/pages/MapView.tsx` + criar `src/components/map/MapTopFilterBar.tsx`:

**3.1. Topo (sticky, ~56px de altura):** barra horizontal com chips clicáveis:
- 🏷️ **Setor** — abre `Popover` com checkbox grid de 12 categorias e contador (ex: "Setor (3)")
- 📍 **Localização** — abre `Popover` com 2 abas: Estado e Cidade (cidades filtradas pelo estado escolhido)
- 💰 **Preço** — abre `Popover` com slider duplo + dois inputs ("De / Até")
- 👥 **Tipo** — toggle group inline ("Empresas", "Compradores", "Ambos") sem popover

**3.2. Linha de chips ativos** logo abaixo: `<Badge>` removível para cada filtro selecionado (ex: `Tecnologia ×` `SP ×` `Até R$ 2M ×`), mais um botão "Limpar tudo" no canto direito.

**3.3. Ordenação:** dropdown à direita ("Mais recentes / Maior preço / Menor preço / Maior receita").

**3.4. Mapa ocupa 100% abaixo da barra.** Sem sidebar lateral. No mobile, a barra de filtros vira scroll horizontal e cada chip continua abrindo `Popover` (no mobile, `Drawer` shadcn de baixo pra cima).

**3.5. Manter funcionalidade existente:** `BusinessMap` continua igual, recebendo `filteredListings`/`filteredBuyers`. Só muda como o filtro é montado. O botão "Cadastrar Comprador" permanece no canto superior direito do mapa.

**3.6. Remover** o `MapFilterSidebar.tsx` antigo só depois de validar a nova UI (mantém arquivo, mas deixa de ser importado — assim nada quebra).

---

## Arquivos que serão criados/modificados

**Frente 1 — navegação:**
- `src/contexts/AppShellContext.tsx` (novo) — expõe `inAppShell` para páginas
- `src/components/layout/AppShell.tsx` — provê o context
- `src/components/layout/AppTopbar.tsx` — adiciona botão voltar + breadcrumbs
- `src/components/layout/AppSidebar.tsx` — Tooltip nos itens colapsados
- `src/App.tsx` — leva rotas híbridas pra dentro do shell quando logado
- `src/pages/Marketplace.tsx`, `MapView.tsx`, `Sell.tsx`, `Vender.tsx`, `Valuation.tsx`, `ValuationMultiplos.tsx`, `ValuationDCF.tsx`, `ValuationCertifier.tsx`, `Capital.tsx`, `Matching.tsx`, `ListingDetail.tsx`, `BlindTeaser.tsx` — esconder `<Header/>`/`<Footer/>` quando `inAppShell`

**Frente 2 — Equity Brain:**
- `supabase/migrations/<timestamp>_equity_brain_bootstrap.sql` — função `equity_brain.bootstrap_from_listings()` + trigger estendida
- `supabase/functions/bootstrap-equity-brain-from-listings/index.ts` (novo) — wrapper que chama o SQL em batch
- `src/pages/equity-brain/DashboardPage.tsx` — botão "Sincronizar marketplace" passa a chamar a nova função

**Frente 3 — filtros mapa:**
- `src/components/map/MapTopFilterBar.tsx` (novo) — barra horizontal estilo OLX
- `src/pages/MapView.tsx` — usa o novo componente, remove sidebar lateral
- `src/components/map/MapFilterSidebar.tsx` — mantido como fallback (não importado)

---

## Garantias

- Nenhuma funcionalidade existente é removida — apenas remontada visualmente
- Visitantes (deslogados) continuam vendo o site público com `Header/Footer` exatamente como hoje
- RLS preservado — admin continua sendo admin via banco, ViewAs é só UI
- Rota `/equity-brain/*` segue protegida por `RequireRole`
