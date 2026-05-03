## Objetivo

Tornar a base RFB (5M CNPJs via `EXTERNAL_DB_URL`) descobrível e útil em todo o Equity Brain, com hub admin, expansão em mandates, worker da fila de matches e enriquecimento automático.

## Itens

### 1. Hub Receita Federal — `/equity-brain/admin/rfb`
Nova página `RfbHubPage.tsx` (admin/advisor only) com 4 seções:
- **Status da conexão**: chama `cnpj-db-inspect` (sem `?samples=` pesado), mostra se conectou, schemas, tabelas principais (`empresas`, `estabelecimentos`, `cnaes`, `estabelecimentos_detalhados`) e contagem aproximada.
- **Busca livre RFB**: form com setor/UF/capital min/idade min/limit, usa `expand-companies-from-rfb` em modo `dry_run` para preview e import real.
- **Últimas importações**: tabela agrupando `equity_brain.companies WHERE source='rfb_expand'` por dia (count, UFs, setores).
- **Toggle BrasilAPI fallback**: lê/escreve `integrations_config.brasilapi_fallback_enabled`.

### 2. Expand RFB em MandateDetailPage
Adicionar `<ExpandRFBDialog/>` com modo "buscar buyers" (`target='buyers'`). Requer extensão da edge function `expand-companies-from-rfb` para aceitar `target: 'companies' | 'buyers'` e gravar em `equity_brain.buyers` quando `buyers` (com `source='rfb_expand'`, `qualification_status='unqualified'`). Dispara `match-company-v2` para o mandate.

### 3. Item no EBSidebar
Adicionar entrada **"Base Nacional (RFB)"** com ícone `Database`, visível só para `admin`/`advisor`, apontando para `/equity-brain/admin/rfb`. Agrupar dentro de "Admin" (já existente).

### 4. Banner descoberta no MatchesPanel
Quando lista de matches vier vazia OU < 3, mostrar callout discreto: "+5M CNPJs disponíveis na Base RFB" com CTA reusando `<ExpandRFBDialog/>` já montado.

### 5. Worker `process-match-queue` (cron 5 min)
- Nova edge function que lê N items pendentes de `equity_brain.match_queue`, chama `match-buyer` ou `match-company-v2` conforme `entity_type`, marca processado.
- Cron via `pg_cron` + `pg_net` (registrar via insert tool, não migration).
- Página de health (admin/rfb) mostra tamanho da fila e últimos processados.

### 6. Botão "Enriquecer via RFB" em CompanyDetail
Reaproveitar padrão do `EnrichBuyerButton` em company. Cria nova edge function `enrich-company-via-rfb` que: dado CNPJ, faz lookup em `national-search` (type=cnpj), preenche campos faltantes em `equity_brain.companies` (razão social, CNAE, endereço, idade, capital, QSA via BrasilAPI fallback). Loga em `api_usage_logs`.

## Estrutura técnica

```text
supabase/functions/
  expand-companies-from-rfb/    [EDIT]  +target=buyers
  process-match-queue/          [NEW]   cron worker
  enrich-company-via-rfb/       [NEW]
  cnpj-db-inspect/              [reuso] hub status

src/pages/equity-brain/admin/
  RfbHubPage.tsx                [NEW]

src/components/equity-brain/
  rfb/RfbStatusCard.tsx         [NEW]
  rfb/RfbSearchPanel.tsx        [NEW]
  rfb/RfbImportsLog.tsx         [NEW]
  rfb/BrasilApiToggle.tsx       [NEW]
  company/EnrichCompanyButton.tsx [NEW]

src/components/layout/EBSidebar.tsx        [EDIT]  + item Base Nacional
src/components/equity-brain/crm/MatchesPanel.tsx [EDIT] +banner descoberta
src/pages/equity-brain/MandateDetailPage.tsx     [EDIT] +ExpandRFBDialog(target=buyers)
src/App.tsx                                       [EDIT] +rota /equity-brain/admin/rfb
```

## Migrations / DB
- Nenhuma alteração de schema necessária (tabelas e colunas já existem).
- Cron job criado via insert tool (contém URL/anon key).

## Observações
- Acesso restrito a admin/advisor em todas as superfícies novas (`RequireRole`).
- Imports RFB continuam entrando como `unqualified` — qualificação manual via `<QualifyLeadButton/>` existente.
- Sem novas dependências npm.
