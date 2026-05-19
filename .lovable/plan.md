# Smoke test C3 + C4 — resultado

✅ Tudo verde no banco:

| Check | Esperado | Encontrado |
|---|---|---|
| Colunas novas em `access_logs` (`disclosure_mode`, `context`, `cnpj`) | 3 | **3** |
| RPC `eb_log_identity_access` | existe | **existe** |
| View `eb_access_logs_v` | existe | **existe** |
| Logs migrados pra `implicit` | 51 | **51** |
| Logs `explicit` (NDA formal) | 0 | **0** (esperado, fluxo dormente) |

UI (Tri-Postura + AuditPage) só falta QA visual, que você optou por pular. Posso seguir.

---

# C6 — Multi-vertical 2026

## Objetivo
Replicar o que já existe pra ISP/Anatel em **N outros setores** sem reescrever pipeline. Hoje o pipeline ISP é: import cru → stats cidade/UF/empresa → match cold → promote → sugestões → mercado público (`/equity-brain/isp/mercado`).

A meta é abstrair isso num **framework de vertical** onde cada novo setor é uma config + 1 dataset, sem código novo de pipeline.

## Diagnóstico do que já existe (reaproveitável)
- `equity_brain.isp_anatel_imports` → tabela de staging cru
- `isp_company_market_stats` / `isp_city_market_stats` → agregados
- `eb_isp_uf_summary` (view pública) → consumido pelo dashboard
- `cnae_to_sector_mapping` → **chave da abstração**, já mapeia setor
- `sector_research` / `sector_market_trends` → base por setor existe
- `is_company_visible_in_crm()` → gate de visibilidade já genérico
- `match-company-v2` → já aceita direction sell/buy/partner (após C3)

## Verticais candidatas (você confirma quais entram)
Baseado nas que mais aparecem em `cnae_to_sector_mapping`, sugiro priorizar 4:

1. **Healthtech / Clínicas** (CNAEs 86.x) — fonte externa: CNES (DataSUS)
2. **Educação privada** (CNAEs 85.x) — fonte externa: e-MEC / Censo Escolar (INEP)
3. **Energia distribuída / GD solar** (CNAEs 35.1x + 43.21) — fonte externa: ANEEL (dados.gov)
4. **Logística / transporte rodoviário** (CNAEs 49.30) — fonte externa: ANTT (RNTRC)

Cada uma tem regulador público com base aberta, igual ANATEL.

## Arquitetura proposta

```text
┌──────────────────────────────────────────────────────────┐
│  vertical_registry (config por setor)                    │
│  ─────────────────────────────────────                   │
│  slug | label | cnae_prefixes[] | source_name | active   │
│  isp  | ISP   | {61.10}         | anatel-scm  | true     │
│  saud | Saúde | {86.10,86.30}   | cnes        | true     │
│  ...                                                     │
└──────────────────────────────────────────────────────────┘
             │ (1:N)
             ▼
┌──────────────────────────────────────────────────────────┐
│  vertical_imports (substitui isp_anatel_imports)         │
│  vertical_slug | cnpj | raw_payload jsonb | ingested_at  │
└──────────────────────────────────────────────────────────┘
             │
             ▼ (functions genéricas)
┌──────────────────────────────────────────────────────────┐
│  fn_refresh_vertical_stats(slug)                         │
│   → preenche vertical_company_stats + vertical_uf_stats  │
│  fn_match_cold_vertical(slug)                            │
│   → reusa match-company-v2 com filtro CNAE da vertical   │
│  fn_promote_to_crm(slug, cnpj)                           │
│   → vira eb_companies + cria deal                        │
└──────────────────────────────────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────────────────────┐
│  /equity-brain/vertical/:slug/mercado (rota dinâmica)    │
│  reaproveita componentes do ISPMarketPage                │
└──────────────────────────────────────────────────────────┘
```

## Plano executável

### Fase 1 — Refactor genérico (sem mexer em ISP em produção)
1. Migration: criar `vertical_registry` + seed com `isp` (espelhando comportamento atual).
2. Criar `vertical_imports`, `vertical_company_stats`, `vertical_uf_stats`, `vertical_promotion_log` como **superset** das tabelas `isp_*`.
3. Criar funções `fn_refresh_vertical_stats(slug)`, `fn_match_cold_vertical(slug)`, `fn_promote_vertical(slug, cnpj)`.
4. Views públicas `eb_vertical_uf_summary`, `eb_vertical_company_stats` (filtrando por slug).
5. **Dual-write temporário**: pipeline ISP continua escrevendo nas tabelas `isp_*` E nas novas tabelas `vertical_*` com `slug='isp'`. Garante zero regressão.

### Fase 2 — Frontend genérico
6. Criar `/equity-brain/vertical/:slug/mercado` reaproveitando `ISPMarketPage` como `VerticalMarketPage` (props: slug, label, KPIs).
7. Sidebar EB: nova seção "Verticais" listando `vertical_registry.active=true`.
8. `/equity-brain/hoje`: cards de oportunidade ganham filtro por vertical.
9. Manter `/equity-brain/isp/mercado` como alias permanente pra `/equity-brain/vertical/isp/mercado`.

### Fase 3 — Datasets externos (aqui entra você + Claude)
Pra cada nova vertical preciso de um **CSV consolidado** com schema mínimo:

```text
cnpj (14 dígitos) | razao_social | uf | municipio | cnae_principal | 
metrica_porte_1 (ex: clientes, leitos, alunos, MWh) | 
metrica_porte_2 (opcional) | fonte_url | data_corte
```

**O que peço pra você produzir externamente (Claude/scraping):**

| Vertical | Fonte | Tamanho esperado | O que preciso do Claude |
|---|---|---|---|
| Saúde | CNES (DataSUS) | ~250k estabelecimentos | CSV com `cnpj, razao_social, uf, municipio, leitos_total, tipo_unidade, fonte_url='cnes.datasus.gov.br', data_corte` |
| Educação | e-MEC + INEP | ~25k IES + escolas | CSV com `cnpj, razao_social, uf, municipio, qtd_alunos, modalidade, fonte_url='emec.mec.gov.br'` |
| Energia/GD | ANEEL | ~50k geradores | CSV com `cnpj, razao_social, uf, municipio, potencia_mw, modalidade, fonte_url='dados.gov.br/aneel'` |
| Logística | ANTT/RNTRC | ~200k transportadores | CSV com `cnpj, razao_social, uf, municipio, qtd_veiculos, categoria, fonte_url='portal.antt.gov.br'` |

Você sobe via `/equity-brain/crm/imports` (já existe upload .xlsx/.csv da feature [EB Bulk Imports]), com um seletor novo de vertical.

### Fase 4 — Switch ISP pro novo pipeline (cleanup)
10. Após 30 dias de dual-write estável, parar de escrever em `isp_*` e deixar só `vertical_*` com slug='isp'. Manter `isp_*` como view de compatibilidade.

## Detalhes técnicos

- `vertical_registry` é a tabela mestre. Todo CNAE prefix vira filtro automático no `match-company-v2` quando `vertical_slug` é passado.
- Funções DB são `SECURITY DEFINER` com `search_path=equity_brain,public` (segue padrão atual).
- RLS: leitura pública só nas views `eb_vertical_*` filtrando `is_company_visible_in_crm()` igual ISP faz hoje (escondendo o que não foi promovido).
- Sidebar lê `vertical_registry` em tempo real, não hardcoded.
- Rota `/equity-brain/vertical/:slug/mercado` cai num único componente parametrizado.
- Cron `mari-generate-insights` ganha loop por vertical ativa (gera insights por setor).

## O que NÃO está no escopo desta fase
- Não vou criar novas IA/scoring por vertical agora (reusa `match-company-v2` v2).
- Não vou refazer Mari Brain KB por vertical (fica pra fase posterior, quando houver dados).
- Não vou tocar em Stripe/planos por vertical (precificação fica igual).
- Não vou subir os datasets — você + Claude trazem os CSVs, eu só preparo o ingestor genérico.

## Entregáveis desta fase (o que eu construo na próxima execução)
1. Migration `vertical_registry` + tabelas `vertical_*` + funções genéricas + dual-write trigger no pipeline ISP atual.
2. `VerticalMarketPage` componente parametrizado + rota `/equity-brain/vertical/:slug/mercado`.
3. Update na sidebar EB pra listar verticais ativas.
4. Update no `/equity-brain/crm/imports` adicionando seletor de vertical.
5. Memory update: `mem://features/multi-vertical-framework`.

## Antes de começar, preciso de você:

1. **Confirmar as 4 verticais** acima ou trocar por outras (você manda).
2. **Definir se Fase 1 sai sozinha** (eu construo só o framework genérico e o ISP migra) **ou se Fase 1+2 saem juntas** (framework + UI nova).
3. **Definir prioridade da Fase 3**: começamos com Saúde? Educação? As 4 em paralelo? (Eu só preparo o ingestor — você traz os CSVs no seu ritmo.)
