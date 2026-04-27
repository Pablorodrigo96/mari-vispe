# Enriquecimento do Motor de Buyers — Multi-Vertical M&A Brasil

## 🎯 Objetivo

Transformar o catálogo de buyers do Equity Brain de **piloto ISP (~21 buyers)** em **base institucional multi-vertical** com 67+ compradores reais cobrindo telecom, SaaS, saúde, educação, serviços B2B, agro, infra, varejo e indústria. Adicionar sistema de prioridade (P1–P4) e 15 novas teses específicas para alimentar o ranking de matches.

---

## 📊 Estado Atual (auditado via DB)

- **26 buyers cadastrados**, sendo ~21 do vertical ISP (Brasil TecPar, Vero, Unifique, Brisanet, Algar, Pátria, Vinci, IG4, etc.)
- **10 teses** em `investment_theses` (5 ISP + 5 genéricas)
- Schema `equity_brain.buyers` já tem todos os campos necessários: `tipo`, `ticket_min/max`, `setores_interesse`, `subsetores_interesse`, `ufs_interesse`, `sinergias_chave`, `porte_alvo`, `observacoes`, `source`, `raw_data` (JSONB)
- Schema `equity_brain.buyer_theses` permite múltiplas teses por buyer com `prioridade` (1-5)

**Gap crítico:** sem buyers de saúde, educação, SaaS, varejo, agro, infra (datacenter), serviços B2B → motor não consegue rankear matches fora de ISP.

---

## 🏗️ Mudanças Propostas

### 1. Migration de Schema (mínima)

**Arquivo novo:** `supabase/migrations/<timestamp>_enrich_buyers_priority.sql`

- Adicionar coluna `prioridade_global` (smallint 1-4) em `equity_brain.buyers` para ranking P1/P2/P3/P4 cross-vertical
- Adicionar coluna `cautela_flag` (boolean) + `cautela_motivo` (text) para buyers em pausa/integração (Hapvida, Dasa, Viveo, Magalu, Petz, LWSA, etc.)
- Adicionar coluna `vertical_principal` (text) para indexação rápida (telecom, saude, saas, educacao, servicos_b2b, agro, infra_digital, varejo, industria, energia)
- Index em `(prioridade_global, vertical_principal)` para queries do ranking

### 2. Seed de Teses (15 novas)

**Insert via tool `supabase--read_query` em `equity_brain.investment_theses`:**

Verticais cobertas:
- **SaaS B2B**: `saas_serial_acquirer`, `saas_vertical_consolidacao`
- **Saúde**: `saude_diagnostico_regional`, `saude_clinica_especializada`, `saude_hospital_regional`, `healthtech_vertical`
- **Educação**: `educacao_medicina`, `educacao_k12_premium`, `educacao_ead_polo`
- **Serviços B2B**: `corretora_seguros_rollup`, `facilities_consolidacao`, `logistica_especializada`
- **Agro**: `agro_distribuicao_regional`, `agro_insumos_revenda`
- **Infra digital**: `data_center_capacidade`, `infra_neutra_fibra`
- **Resíduos / ambiental**: `residuos_biogas_concessao`
- **Varejo**: `varejo_alimentar_regional`, `farmacia_regional`

Cada tese vai ter: `category` (tag do vertical), `description` (1 parágrafo), `required_signals`/`boosting_signals` (do `signal_catalog` existente, ex: `idade_socio_alta`, `crescimento_estavel`, `margem_apertada`), e `default_pitch_template` (para o `claude-generate-pitch`).

### 3. Seed de Buyers (~50 novos, total alvo: 67)

**Insert via tool em `equity_brain.buyers`** com `source = 'seed_multivertical_v1'`. Cada buyer recebe:

| Campo | Origem |
|---|---|
| `nome` | Conforme dossiê fornecido |
| `tipo` | estrategico / financeiro_fundo / family_office / plataforma_pe |
| `prioridade_global` | P1=1, P2=2, P3=3, P4=4 (do ranking final do dossiê) |
| `vertical_principal` | telecom, saude, saas, educacao, servicos_b2b, agro, infra_digital, varejo, industria, energia |
| `ticket_min/max` | Faixa em R$ do dossiê |
| `setores_interesse` | Array de tags (ex: `['fibra','b2b']` ou `['hospital','diagnostico']`) |
| `ufs_interesse` | UFs prioritárias ou `[]` (nacional) |
| `porte_alvo` | Array (ex: `['micro','pequeno','medio']`) |
| `sinergias_chave` | Array (ex: `['densidade_regional','cross_sell','rede_propria']`) |
| `cautela_flag` | true para Hapvida, Dasa, Viveo, Magalu, Petz/Cobasi, LWSA, etc. |
| `cautela_motivo` | Texto curto explicando (ex: "Em integração pós-fusão") |
| `observacoes` | Tese de aquisição + histórico relevante de M&A do dossiê |
| `raw_data` | JSONB com payload completo (backers, deals históricos, perfil de alvo detalhado, fonte) |

**Distribuição planejada:**

- **Telecom/ISP/Infra digital (já parcial)**: completar com Megatelecom, V.tal, Macquarie, Brookfield/Ascenty, Equinix, Scala, Elea, Aligned/ODATA, Claro, Vivo, TIM Enterprise, Triple Play/Cabo Brasil, Alares, Alloha (já existe como Giga+, mesclar)
- **SaaS/Tech (5)**: TOTVS, Nuvini, Sinqia, Selbetti, House of Brains, LWSA (com cautela), iFood
- **Saúde (9)**: Rede D'Or, Fleury, Dasa (cautela), Hapvida (cautela), Oncoclínicas, Athena Saúde, Mater Dei, DNA Capital, Viveo (cautela), Bionexo
- **Educação (7)**: Yduqs, Afya, Grupo Salta, Cogna, Cruzeiro do Sul, Ânima, Vitru/UniCesumar
- **Serviços B2B (3)**: Alper, Grupo GPS, Simpar/JSL
- **Agro (3)**: Nutrien, Lavoro, Pátria Agro
- **Resíduos/Ambiental (1)**: Orizon
- **Varejo/Consumo (7)**: Plurix/Pátria, Supermercados BH, RD Saúde, Pague Menos (cautela), Magalu (cautela), Grupo SBF, Petz/Cobasi (cautela), Vinci F&B
- **Indústria/Energia (6)**: WEG, Frasle, Tigre, Dexco, Auren, Engie, Eletrobras, JBS/Marfrig
- **Fundos / Capital partners (~14)**: Kinea, Crescera, BTG, Vinci Compass, EB Capital, L Catterton, Advent, Bain, HIG, Warburg Pincus, Blackstone, GIC/Temasek, Actis, General Atlantic
- **Family offices (~5)**: BWGI/Moreira Salles, Brainvest, Jera Capital, Apex Capital, J&F

### 4. Buyer ↔ Theses linking

**Insert em `equity_brain.buyer_theses`:** cada buyer recebe 1-3 teses com `prioridade` (1=core, 2=secundária). Ex:
- Brasil TecPar → `isp_consolidacao_regional` (1), `isp_carteira_premium` (2)
- TOTVS → `saas_vertical_consolidacao` (1), `saas_serial_acquirer` (2)
- Alper → `corretora_seguros_rollup` (1)
- Rede D'Or → `saude_hospital_regional` (1)
- Afya → `educacao_medicina` (1)

### 5. UI Adjustments (mínimos)

#### `src/components/equity-brain/BuyerCard.tsx`
- Mostrar badge de **prioridade** (P1 verde, P2 azul, P3 amarelo, P4 cinza)
- Mostrar badge de **cautela** (alerta vermelho com tooltip do motivo) quando `cautela_flag = true`
- Mostrar `vertical_principal` como chip ao lado do tipo

#### `src/pages/equity-brain/BuyersPage.tsx`
- Adicionar coluna **Prioridade** (P1-P4) na tabela
- Adicionar coluna **Vertical** (chip)
- Adicionar filtro por `vertical_principal` (dropdown) e por `prioridade_global` (multi-select P1/P2/P3/P4)
- Tornar default sort: `prioridade_global ASC, deals_realizados DESC`
- Toggle "Esconder buyers em cautela" (default: marcado)

#### `src/hooks/useVertical.ts`
- Estender o mapping de verticais para incluir os novos: saude, saas, educacao, servicos_b2b, agro, infra_digital, varejo, industria, energia (atualmente só `all` e `isp`)
- Cada vertical define o seu `cnaeFilter` correspondente para reaproveitamento na DashboardPage e OportunidadesPage

#### `src/components/equity-brain/VerticalSelector.tsx`
- Listar todos os verticais novos no dropdown

### 6. Documentação

**Arquivo novo:** `docs/EQUITY_BRAIN_BUYERS_CATALOG.md`
- Lista canônica dos 67 buyers com prioridade, vertical, ticket range
- Critérios de cautela
- Fonte (dossiê interno Vispe — out/2025)
- Como manter o catálogo atualizado (responsável: Head de M&A)

**Atualização:** `.lovable/memory/index.md`
- Nova entrada: `[Buyers Multi-Vertical Catalog](mem://features/buyers-multivertical-catalog)`

---

## ⚠️ Pontos de Atenção

1. **Cautela buyers**: Hapvida, Dasa, Viveo, Magalu, Petz, LWSA, Brisanet (como buyer base, não como ativo), FiBrasil, I-Systems devem ser inseridos mas com `cautela_flag = true` para o ranking penalizar (-20 conforme fórmula do dossiê).

2. **Brisanet aparece em 2 listas**: como buyer P1 ISP no piloto **e** como "cautela" no novo dossiê. Resolver: manter como buyer com `cautela_flag = true` e nota "Crescimento mais orgânico recente; pode entrar em leilão mas não é buyer base".

3. **Alloha/Giga+ duplicidade**: já existe "Giga+ Fibra" cadastrado. Atualizar (UPDATE) com dados completos do dossiê (Alloha como sinônimo, backers eB Capital + Neo, ticket R$ 50M-500M) em vez de criar duplicado.

4. **Algar Telecom duplicidade**: já existe. Atualizar com `prioridade_global = 2` e foco B2B/corporativo conforme dossiê.

5. **Fórmula de scoring** (`buyer_fit_score` do dossiê): documentada em `EQUITY_BRAIN_BUYERS_CATALOG.md` como referência, mas **não implementada na fase atual** — fica para Fase 12.1 (refino do score engine v1.1) usando os campos novos (`prioridade_global`, `cautela_flag`).

6. **Múltiplos por setor** (tabelas EV/EBITDA do dossiê): incluir como referência no doc; integrar no `claude-generate-pitch` em fase futura via prompt enrichment.

7. **Privacidade**: nenhum desses buyers tem PII — são entidades públicas. Sem RLS adicional necessária.

---

## ✅ Critério de Aceite

- 67+ buyers no `equity_brain.buyers` com `prioridade_global` e `vertical_principal` preenchidos
- 25+ teses em `investment_theses` (10 atuais + 15 novas)
- Cada buyer P1/P2 com pelo menos 1 thesis vinculada
- BuyersPage mostra coluna Prioridade + filtro por vertical funcional
- VerticalSelector lista todos os verticais novos
- Filtro "esconder buyers em cautela" funcional
- Doc `EQUITY_BRAIN_BUYERS_CATALOG.md` publicado
- Memory atualizada

---

## 📦 Arquivos Afetados

**Novos:**
- `supabase/migrations/<ts>_enrich_buyers_priority.sql`
- `docs/EQUITY_BRAIN_BUYERS_CATALOG.md`
- `.lovable/memory/features/buyers-multivertical-catalog.md`

**Modificados:**
- `src/components/equity-brain/BuyerCard.tsx` (badges prioridade + cautela)
- `src/pages/equity-brain/BuyersPage.tsx` (colunas + filtros)
- `src/hooks/useVertical.ts` (novos verticais)
- `src/components/equity-brain/VerticalSelector.tsx` (opções novas)
- `.lovable/memory/index.md` (entry nova)

**Inserts via Supabase tool (não-migration):**
- `equity_brain.investment_theses` (~15 novas teses)
- `equity_brain.buyers` (~50 novos + ~3 updates)
- `equity_brain.buyer_theses` (~80 vínculos)

---

## 🔄 Sequência de Execução (após aprovação)

1. Aplicar migration de schema (3 colunas novas + index)
2. Inserir 15 teses novas
3. UPDATE nos 3 buyers existentes (Alloha/Giga+, Algar, Brisanet) com cautela/prioridade
4. INSERT dos ~50 buyers novos em batches por vertical
5. INSERT dos buyer_theses (vínculos)
6. Atualizar `useVertical.ts` e `VerticalSelector.tsx`
7. Atualizar `BuyersPage.tsx` (colunas + filtros) e `BuyerCard.tsx` (badges)
8. Criar doc + atualizar memory
9. Validar via query: `SELECT vertical_principal, prioridade_global, count(*) FROM equity_brain.buyers GROUP BY 1,2 ORDER BY 1,2`