## Diagnóstico

Rodei `cnpj-db-inspect` em produção e o resultado é claro:

```
PostgresError: password authentication failed for user "postgres"
connected: false
```

Conclusão: toda a UI/edge functions/cron RFB foi entregue, mas o **secret `EXTERNAL_DB_URL` tem credenciais inválidas**. Por isso o "0 companies com source='rfb_expand'" — nenhum import jamais conseguiu rodar.

Itens secundários encontrados:
- `EnrichCompanyButton` foi criado mas **não está usado em nenhuma página** (CompanyDetail / MandateDetail).
- `MandateDetailPage` ainda não tem o `<ExpandRFBDialog target="buyers"/>` direto no header (só dentro do `MatchesPanel`).
- Worker `process-match-queue` está agendado (cron 5min ✅) mas precisa ser validado end-to-end depois que a conexão voltar.
- Schema `equity_brain` é acessado via `supabase.schema("equity_brain")` — confirmar que está exposto no PostgREST (provavelmente está, dado que as outras telas EB funcionam).

## Plano de execução

### 1. Pedir ao usuário a credencial correta do banco RFB (BLOQUEADOR)

Sem isso, nenhum dos outros itens vira "100% funcional". Vou usar `add_secret` para solicitar **`EXTERNAL_DB_URL`** novamente, no formato:
```
postgresql://USUARIO:SENHA@HOST:5432/DATABASE?sslmode=require
```

Após o usuário atualizar, vou:
- Rodar `cnpj-db-inspect` via curl e confirmar `connected: true` + listar tabelas (`empresas`, `estabelecimentos`, `socios`, `simples`).
- Rodar uma busca real (1 empresa, UF=SP, qualquer setor) via `expand-companies-from-rfb` e verificar inserção em `equity_brain.companies`.
- Disparar `process-match-queue` manualmente e confirmar que consome a fila.

### 2. Plugar `EnrichCompanyButton` na `CompanyDetailPage`

Adicionar no header, ao lado dos botões existentes, visível quando `company.cnpj` existir. Reaproveita o componente já criado.

### 3. Adicionar atalho RFB no header do `MandateDetailPage`

Botão "Importar compradores RFB" (target="buyers", `mandate_id` = atual) ao lado do "Mostrar no grafo 3D", para o advisor não precisar entrar em Matches → empty state.

### 4. Hardening do `RfbHubPage`

- Mostrar mensagem amigável quando `connected=false` (atualmente só joga erro no toast) — apontar para "atualizar EXTERNAL_DB_URL".
- Corrigir cálculo de contagem em `loadQueue` (hoje usa `.length` em resposta de `count: 'exact', head: true`, que vem em `count` no retorno; ajustar para ler `count` corretamente).

### 5. Validação final (smoke test em produção)

- `cnpj-db-inspect?samples=0` → `connected: true`
- `expand-companies-from-rfb` com `target=companies, uf=SP, limit=5` → ver linhas em `equity_brain.companies` com `source='rfb_expand'`
- `expand-companies-from-rfb` com `target=buyers, mandate_id=<uuid>, limit=5` → ver linhas em `equity_brain.buyers`
- `process-match-queue` → consome itens
- Hub `/equity-brain/admin/rfb` exibe contagens reais

## O que NÃO vou mudar

- Schema do banco / RLS (já está pronto: `qualification_status`, `source`, `match_queue`, `qualify_lead`).
- Lógica das edge functions já deployadas (apenas validar).
- Cron (já agendado e ativo).

## Pergunta única antes de começar

Você consegue me passar a string de conexão RFB correta (`postgresql://user:pass@host:5432/db?sslmode=require`)? Assim que aprovar este plano, eu disparo o `add_secret` para você colar o valor de forma segura — depois sigo direto com itens 2–5.
