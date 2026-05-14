# Plano — Parceiro/Indicador: experiência enxuta e escopada

Hoje o parceiro contábil (`is_partner_accountant=true` + role `advisor`) herda **todos** os privilégios de advisor interno Vispe: vê base inteira, mercado ISP fixo, pipeline global, dashboards executivos. Vamos separar em duas personas distintas:

- **Advisor interno Vispe** (`advisor` sem `is_partner_accountant`): mantém tudo como hoje.
- **Parceiro externo / indicador** (`advisor` + `is_partner_accountant=true`): visão restrita, focada em indicar empresa → fazer valuation → ver compradores anônimos → ganhar comissão.

## 1. Sidebar drasticamente reduzida para o parceiro

Em `src/components/layout/AppSidebar.tsx`, quando `eff.isPartnerAccountant && !eff.isAdmin`, mostrar **apenas**:

```text
PARCERIA
  └ Painel do parceiro      (/parceiro)   ← home
  └ Cadastrar empresa       (/vender)
  └ Minhas indicações       (/meus-anuncios — filtrado)
VALUATION
  └ Novo valuation múltiplos (/valuation/multiplos)
  └ Meus valuations          (/meus-valuations — filtrado)
COMPRADORES (anônimos)
  └ Possíveis compradores    (/parceiro/compradores — novo, anonimizado)
```

Esconder: Visão Geral (Painel/Inteligência genérica), Marketplace, Mapa, Comprar, Capital, DCF, Certificador, Mandatos (tabela), Dashboards, Equity Brain, Cockpit Interno, Head de Parcerias, Migração Monday.

Continua aparecendo o "Seu advisor pessoal — Rafael" no rodapé.

## 2. Painel do Parceiro = central de indicações + comissão

Refatorar `src/pages/PartnerDashboard.tsx` (rota `/parceiro`) para virar a **home** do parceiro com 4 blocos verticais:

1. **Header status do cadastro** — banner Volt se perfil ou empresa indicada estão incompletos: "Complete seu cadastro para destravar pesquisa de mercado, valuation e matches" + CTA.
2. **Minhas indicações** (tabela/cards): nome empresa, setor, status (cadastrada · valuation feito · anúncio publicado · em negociação · fechada), valuation estimado (se rodado), compradores compatíveis (contagem anônima), **comissão potencial** (5% indicação · 10% reunião BANT · 15% valuation+anúncio).
3. **Potencial da carteira** — incorporar resumo de `/potencial-carteira` (somatório comissão potencial × probabilidade).
4. **Próximos passos sugeridos por empresa** — "Faça o valuation da Gummy", "Publique o anúncio para receber matches", etc.

Remover da rota `/potencial-carteira` separada — passa a ser uma seção dentro de `/parceiro`.

Pós-login, parceiro cai direto em `/parceiro` (já é o `ROLE_HOME` correto, validar em `src/lib/authRedirects.ts`).

## 3. Filtrar Oportunidades / Pipeline / Mandatos por escopo do parceiro

Hoje o parceiro abre Equity Brain inteiro. Ele **não deve ver Equity Brain** — toda informação de match dele vive dentro de `/parceiro/compradores`.

- Remover acesso a `/equity-brain/*` no menu para `isPartnerAccountant && !isAdmin`.
- Bloquear nas próprias páginas (`OportunidadesPage`, `PipelinePage`, `MandatosTablePage`, `CompradoresPage`, `IspMarketPage`, `ExecutiveDashboardPage`, dashboards `/equity-brain/dashboards/*`): se `isPartnerAccountant && !isAdmin && !isAdvisorInterno`, redirecionar para `/parceiro` com toast "Esta área é exclusiva do time interno Vispe".
- Criar nova `/parceiro/compradores` que consulta `equity_brain.matches` **filtrado por** `cnpj IN (empresas indicadas pelo parceiro via partner_lead_reservations + listings.user_id = parceiro)` e **anonimiza** o buyer (mostra só: arquétipo, UF, ticket range, score) — sem nome, sem contato. CTA "Quero apresentar" → cria pedido para advisor interno.

## 4. Inteligência de mercado contextual ao setor da empresa indicada

Hoje `/inteligencia` (e tudo que chama `useUserSector`/IspMarketPage) assume telecom/ISP. Para o parceiro:

- Esconder `/inteligencia` da sidebar do parceiro até ele ter **pelo menos 1 empresa indicada com setor preenchido**.
- Quando habilitada, a página recebe `?sector=` baseado no setor da última indicação (ex.: Gummy → moda) e os blocos de notícias/benchmark passam a usar esse setor. Se `sector` não estiver no catálogo de setores cobertos, mostrar empty state: "Estamos preparando inteligência para o setor X. Enquanto isso veja: [valuation, matches]".
- ISP/Anatel só aparece se setor da empresa = telecom.

## 5. Matches/compradores não aparecem antes do cadastro real

A tela de "8 possíveis compradores" hoje aparece zerada com qualquer perfil novo porque `useMatchInbox` busca matches globais. Para parceiro:

- `useMatchInbox` (ou wrapper específico do parceiro) **só retorna linhas** onde `cnpj` pertence a empresas indicadas pelo parceiro. Sem indicação = lista vazia + empty state "Cadastre sua primeira empresa para Mari calcular compradores compatíveis".
- O card "8 possíveis compradores" do `/parceiro` desaparece quando `count = 0` e vira CTA "Cadastrar primeira empresa".

## 6. Janela de venda só após valuation + setor

O bloco "Janela de venda · ideal 2027" no `/painel` hoje vem do `painelExecutive.ts` rodando sobre dados agregados — sem empresa, sem sentido.

- Para parceiro: substituir esse bloco pela tabela de indicações. A janela de venda passa a ser **por empresa indicada** dentro do card da empresa (só renderiza quando empresa tem setor preenchido + valuation rodado).

## 7. Gates de "cadastro incompleto"

Adicionar componente `<PartnerOnboardingChecklist />` no topo de `/parceiro` com 4 missões:

- ☐ Completar perfil (nome, telefone, empresa)
- ☐ Cadastrar primeira empresa indicada (`/vender`)
- ☐ Rodar valuation por múltiplos da empresa
- ☐ Publicar anúncio (libera matches reais)

Cada item completo vira ✅ verde Volt. O checklist some quando todos os 4 estão ✅.

Botões "Pesquisa de mercado", "Ver matches", "Janela de venda" ficam disabled com tooltip "Complete passo X" enquanto pendentes.

## 8. Transição de página fluida (flash branco)

A tela branca de ~1s ao trocar de rota é o `Suspense` fallback dos `lazy()` sem fallback estilizado.

- Em `src/App.tsx`, envolver as rotas autenticadas com `<Suspense fallback={<AppShellSkeleton />}>` que renderiza sidebar+topbar estáticos com skeleton no main, em vez de tela branca. Nada de código split por rota dentro de `AppShell`.

## 9. Comissão — schema mínimo

Para mostrar "comissão potencial" precisamos do valor estimado da empresa × % do estágio. Sem migration nova:

- Calcular client-side: `valuation_history.result.mashupValue` (última do parceiro p/ aquele CNPJ) × {0.05, 0.10, 0.15} conforme: indicou / agendou BANT / fez valuation+anúncio.
- O estágio BANT já existe em `eb_mandates.stage` ou `partner_opportunity_interests.status`. Mapear: `indicado` → 5%, `qualificado_bant` → 10%, `valuation_publicado` → 15%, `fechado` → realizado.

(Se faltar campo `bant_qualified_at` em `partner_opportunity_interests`, adicionar em migration separada — confirmar antes.)

## Arquivos afetados (resumo)

- `src/components/layout/AppSidebar.tsx` — branch dedicada para `isPartnerAccountant && !isAdmin`.
- `src/pages/PartnerDashboard.tsx` — reescrever como home com 4 blocos + checklist.
- `src/pages/PortfolioPotential.tsx` — virar componente `<PortfolioPotentialSection />` consumido em `/parceiro`; manter rota como redirect.
- `src/pages/Painel.tsx` — para parceiro, redirect para `/parceiro`.
- `src/pages/Inteligencia.tsx` — receber sector dinâmico, gate por indicação.
- `src/pages/equity-brain/*` (Oportunidades, Pipeline, MandatosTable, Compradores, IspMarket, Executive, dashboards) — guard que redireciona parceiro para `/parceiro`.
- `src/hooks/useMatchInbox.ts` — novo hook `usePartnerMatches()` que filtra por CNPJs do parceiro e anonimiza.
- `src/pages/parceiro/PartnerBuyersPage.tsx` (novo) — `/parceiro/compradores` anonimizado.
- `src/components/parceiro/PartnerOnboardingChecklist.tsx` (novo).
- `src/components/parceiro/IndicacoesTable.tsx` (novo) — colunas: empresa, setor, status, valuation, compradores, comissão potencial.
- `src/lib/authRedirects.ts` — confirmar `partner` → `/parceiro`.
- `src/App.tsx` — Suspense fallback estilizado com sidebar+skeleton.

## Não faz parte deste plano

- Mudar advisor interno Vispe (continua vendo tudo).
- Mudar admin/franqueado.
- Mudar fluxo de seller/buyer puros.
- Mexer em valuation, capital, DCF — só esconder da sidebar do parceiro.
- Migration de schema (se precisar de `bant_qualified_at`, confirmo antes em fase separada).

Aprovando, implemento na ordem: §1 sidebar → §8 transição → §2/§7 painel+checklist → §3 guards EB → §5/§9 matches+comissão → §4 inteligência por setor.
