## Diagnóstico (com a planilha já aberta)

A aba `contacts` tem **450 linhas** referenciando 3 tipos de entidade:

| entity_type | linhas | situação atual |
|---|---|---|
| buyer | 294 | 179 referem buyers que existem; **112 buyers únicos** referenciados não estão na planilha nem no banco (ex.: `EBT (ENORMITY)`, `FIX FIBRA`, `CEUNET + 8G TELECOM + LIVE CONNECT`, `D'CESARY`) |
| mandates | 115 | `entity_id` é o **alias entre parens** da razão social do mandato (ex.: `ABENET` casa com `Abenet Provedora de Acesso a Internet Ltda (ABENET)`) — resolver atual procura só por CNPJ → falha 100% |
| companies | 41 | `entity_id` é nome curto/fantasia (ex.: `GESTOR PDV`, `VUCA SOLUTION`) — resolver atual procura só por CNPJ → falha 100% |

Por isso o dry-run mostrou 181 OK · 269 erros.

## O que vou fazer

### 1. Reescrever `processContacts` em `supabase/functions/eb-import/index.ts`

Resolver multi-camada com índice em memória (1 query por tipo, depois tudo on-the-fly):

- **Pré-carrega** todos buyers, companies e mandates do banco e indexa por:
  - UUID exato
  - CNPJ
  - nome normalizado (lowercase, sem acento, sem pontuação leve)
  - **strip de parênteses** (`EBT (ENORMITY)` → tenta também `EBT` e `ENORMITY`)
  - **splits por `+`, `,`, `/`, ` - `** (`CEUNET + 8G TELECOM + LIVE CONNECT` → tenta cada parte)
  - para mandates: também usa `parens(razao_social)` da empresa do mandato
  - para companies: também usa `nome_fantasia`

- Para `buyer` que mesmo assim não casar: **auto-cria stub** em batch com:
  - `tipo='estrategico'`, `qualification_status='pending'`, `source='import_contact_stub'`
  - `observacoes` registrando que precisa revisão
  - vira **warning** (não erro) na resposta

- Para `mandate`/`company` que não casar: continua **erro** (não dá para criar stub seguro de mandato/empresa sem CNPJ).

### 2. Atualizar `ImportDialog.tsx`

Hoje só renderiza `errors`. Vou adicionar bloco **warnings** (laranja) ao lado, mostrando contagem e detalhes (até 10 visíveis). Toast final passa a mostrar `X OK · Y warnings · Z erros`.

### 3. Deploy automático do edge function

Lovable já deploya sozinho ao salvar; vou aguardar 5–10s e validar que está vivo.

### 4. Subir a planilha eu mesmo via `supabase--curl_edge_functions`

- Leio `/tmp/monday.xlsx` que já está no sandbox.
- Converto cada aba para o formato `bundle` esperado.
- Chamo `POST /functions/v1/eb-import` com `dry_run=true` primeiro → mostro relatório.
- Se passar, chamo de novo com `dry_run=false` → import real, dispara recálculo de matches/scores em background.

### 5. Relatório final

Vou reportar (em chat):
- inseridos por entidade
- buyers stubs criados (lista)
- erros remanescentes (se houver) com linha + motivo
- onde revisar (CRM › Buyers › filtro `qualification_status=pending`)

## Resultado esperado

```
companies:  48 OK · 0 erros · 48 warnings (placeholder CNPJ)
buyers:    179 OK · 0 erros
mandates:  115 OK · 0 erros · 62 warnings (valor_pedido vazio)
contacts:  450 OK · 0 erros · ~180 warnings (~112 stubs + sem email/telefone)
activities:  0 OK · 1 erro (linha de exemplo "uuid-do-mandato")
```

Total: **792 registros importados, 0 erros bloqueantes**.

Sem mudança de schema. Sem migration. Tudo reversível: stubs de buyers ficam isolados pelo `qualification_status='pending'` e podem ser deletados/mesclados depois.

Posso seguir?
