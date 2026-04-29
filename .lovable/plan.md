## Imports do Equity Brain (espelho do Exports)

Hoje o `/equity-brain/crm/exports` gera 4 CSVs (Deals, Mandatos enriquecidos, Buyers enriquecidos, Atividades CRM). Vamos criar o caminho inverso: `/equity-brain/crm/imports` aceitando os mesmos formatos (mais Empresas e Contatos) para popular o sistema em massa, com validação, preview e disparo automático dos pipelines (matches, scores, market waves, gráficos).

### Páginas / componentes novos

- `src/pages/equity-brain/ImportsPage.tsx` — espelho visual do `ExportsPage`, com 6 cards (Empresas, Mandatos/Deals, Buyers, Contatos, Atividades CRM, **Pacote completo .xlsx multi-aba**) abrindo cada um o `ImportDialog`.
- `src/components/equity-brain/crm/ImportDialog.tsx` — modal reutilizável (baseado em `BulkUploadDialog`):
  1. Botão **"Baixar modelo"** gera .xlsx com cabeçalhos exatos da view de export correspondente + linha-exemplo + aba "Instruções" com enums válidos.
  2. Drag-and-drop / file picker (.xlsx, .csv) — parse via `XLSX.read` (já no projeto).
  3. **Preview com validação linha-a-linha** (Zod schemas por entidade): mostra "X válidas / Y com erro" e badges por erro, igual ao BulkUpload.
  4. Toggle **"Dry-run"** (default ON) — chama edge function só validando, sem inserir.
  5. Botão **"Importar N linhas"** — chama edge function em modo commit.
- Link "Imports" adicionado no header do `ExportsPage` e na sidebar do CRM.

### Edge function `eb-import`

`supabase/functions/eb-import/index.ts` — única função, validação server-side com Zod, recebe `{ entity, rows, dry_run, dedupe_strategy }` onde `entity ∈ {companies, mandates, buyers, contacts, activities, bundle}`.

Pipeline por entidade:

```
text
companies   → upsert equity_brain.companies (key: cnpj)
              qualification_status = 'qualified', source = 'import'
mandates    → resolve company by cnpj (cria stub se faltar)
              upsert equity_brain.mandates (key: id ou cnpj+data_assinatura)
              + insere contato primário se vier nas colunas contato_*
buyers      → upsert equity_brain.buyers (key: id ou cnpj+name)
              qualification_status = 'qualified'
contacts    → upsert equity_brain.contacts (key: entity_type+entity_id+email)
activities  → insert equity_brain.crm_activities (append-only, dedupe por hash)
bundle      → processa abas na ordem: companies → buyers → mandates
              → contacts → activities, em transação única
```

Resposta (mesmo formato em dry-run e commit):
```json
{ "inserted": 12, "updated": 3, "skipped": 1, "errors": [{row, field, msg}], "ids": [...] }
```

### Auto-recálculo pós-import (o "popular gráficos")

Ao final de um commit bem-sucedido, a function enfileira jobs nas funções já existentes para que dashboards/gráficos atualizem sozinhos:

- `match-batch` para cada mandato/buyer novo → alimenta `MatchAnalyticsPage` e `PipelineKanban`.
- `calculate-scores` para empresas novas → alimenta `equity_score` no Dashboard/Grafo.
- `compute-market-waves` (debounce 30s) → atualiza `MarketWavesCard`.
- `compute-mandate-active-proba` para mandatos novos → temperatura/probabilidade.
- `crm-detect-new-matches` → notificações.
- Insere row em `equity_brain.match_queue` (já existe da fase de qualificação) marcando entidades para reprocessamento assíncrono.

Tudo é fire-and-forget (`Promise.allSettled`, sem bloquear a resposta). UI mostra toast: "12 mandatos importados — recalculando matches em background (~2 min)."

### Schemas de validação (Zod, por entidade)

Cada schema espelha as colunas baixáveis no Exports + aceita aliases comuns (pt-BR ↔ snake_case). Campos obrigatórios mínimos:

- **companies**: `cnpj` (14 dígitos, validado), `razao_social`, `uf`. Resto opcional.
- **mandates**: `company_cnpj`, `valor_pedido`, `data_assinatura`. Enums: `status`, `deal_type`, `pipeline_stage`, `outcome` validados contra valores aceitos pela view `eb_mandates`.
- **buyers**: `name`, `setores[]` (parseado de string separada por `|`), `ticket_min`, `ticket_max`, `ufs[]`.
- **contacts**: `entity_type`, `entity_id` OU `entity_cnpj`, `nome`, `email|telefone` (pelo menos um).
- **activities**: `entity_type`, `entity_id`, `kind`, `created_at`, `note`.
- **bundle**: arquivo .xlsx com abas nomeadas exatamente `companies|mandates|buyers|contacts|activities`.

### Permissões

- Rota protegida por `RequireRole role="admin|advisor"` (mesmo padrão do Exports).
- Edge function valida JWT + `has_role('admin'|'advisor')` antes de qualquer write.
- Imports são logados em `equity_brain.deal_events` com `event_type='bulk_import'`, payload com contagens — auditável no `AccessAuditPage`.

### Detalhes técnicos relevantes

- **Idempotência**: upserts usam `ON CONFLICT DO UPDATE` nas chaves naturais (cnpj, id quando informado). Reimportar a mesma planilha não duplica.
- **Tamanho**: chunking de 500 linhas por chamada (XLSX em browser comporta milhares; a function processa em lotes para respeitar timeout de 60s).
- **CSV vs XLSX**: ambos suportados (`xlsx` lib já lê os dois). Separador `;` ou `,` autodetectado.
- **Datas**: aceita `dd/mm/aaaa`, `aaaa-mm-dd` e serial number do Excel (normalizado para ISO no parse).
- **Colunas extras**: ignoradas silenciosamente (não quebra se o CSV exportado tiver colunas calculadas como `regiao`).
- **Erros parciais**: em modo commit, transação por linha — uma linha ruim não bloqueia as outras; erros vão num CSV de download "falhas_import_<data>.csv".

### Arquivos a criar/editar

Criar:
- `src/pages/equity-brain/ImportsPage.tsx`
- `src/components/equity-brain/crm/ImportDialog.tsx`
- `src/lib/ebImportSchemas.ts` (Zod + aliases)
- `src/lib/ebImportTemplates.ts` (gerador de modelo .xlsx por entidade)
- `supabase/functions/eb-import/index.ts`

Editar:
- `src/App.tsx` (rota `/equity-brain/crm/imports`)
- `src/pages/equity-brain/ExportsPage.tsx` (botão "Imports" no header, simétrico)
- `src/components/equity-brain/EBSidebar.tsx` (item de menu)
- `.lovable/memory/index.md` + nova memória `mem://features/eb-bulk-imports.md`

### Fora do escopo (próxima rodada se quiser)

- Mapeamento visual coluna→campo (assume cabeçalhos = nomes das colunas das views de export).
- Importar imagens/anexos (só metadados textuais por enquanto).
- Importar `deal_events` históricos para retroalimentar a Bayesian update do Equity Brain v2 (já existe `backfill-deal-events-from-history` separadamente).
