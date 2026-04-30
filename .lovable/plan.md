## Diagnóstico — 3 bugs reais confirmados no banco

### 1. "Criar mandato" → erro `invalid` (3 enums errados)
`QuickStartMandateDialog` envia valores que **não existem** nos enums de `equity_brain.mandates`:

| Campo enviado | Valor enviado | Enum real (banco) |
|---|---|---|
| `pipeline_stage` | `"qualificacao"` ❌ | `match \| nbo \| due_diligence \| spa \| closing \| closed` |
| `outcome` | `"ativo"` ❌ | `em_andamento \| em_negociacao \| vigente \| vendemos \| vendeu_sozinho \| concluido \| cancelado \| vencido` |
| `deal_type` | `"venda"` ❌ | `sellside \| buyside \| spa \| due_diligence \| cisao \| fusao \| nbo \| match` |

**Correção:** trocar para `pipeline_stage='match'`, `outcome='em_andamento'`, `deal_type='sellside'`. Status `'vigente'` está OK.

### 2. "Empresa não encontrada" para `VL60b55c58449f`
O `useCompanyResolver` só aceita 4 formatos canônicos. Na prática os matches gravam **CNPJs sintéticos** tipo `LST55316249134` (14 chars mas com letras), e alguns identificadores antigos vêm como `VL60xxxxxxxxxx` (ticker derivado de `listing.id`). Hoje o resolver:
- rejeita `LST...` (não passa no `\d{14}`)
- rejeita `VL60...` porque procura ticker exato em `listings.ticker`, mas isso **nunca foi gravado**

**Correção do resolver:**
- Tentar **lookup direto** em `equity_brain.companies.cnpj = raw` antes de validar formato (cobre `LST...`).
- Para strings que começam com letras + dígitos (ex.: `VL60...`): pegar os 12 hex chars finais e tentar `listings.id ILIKE '<hex>%'` (o `VL` veio do prefixo + slice do UUID).
- Em último caso, tentar `companies.razao_social ILIKE '%raw%'` limit 1.
- Se o resolver achar via fuzzy mas NÃO bater 100%, mostrar uma página com sugestões (top 3 candidatos) em vez do "404 amigável".

### 3. Mari Brain → "deu erro"
Na `getLiveContext` da edge function `mari-brain`:
```ts
.from("mandates").select("id, codename, stage, asking_price, ...")
```
Mas `equity_brain.mandates` **não tem** `codename`, `stage` nem `asking_price` (tem `pipeline_stage`, `valor_pedido`, sem codename). Isso retorna erro silencioso só no `try/catch` — porém o segundo bloco também usa `eb_matches_enriched` com `.select("id, match_score, codename, buyer_nome")` que pode falhar se a view não tiver esses campos. Quando ambos falham + alguma exception escapa do try, o stream nunca abre e o cliente recebe erro genérico.

**Correção:**
- Trocar `codename, stage, asking_price` por `id, pipeline_stage, valor_pedido, updated_at, company_cnpj`.
- Adicionar log explícito (`console.error`) com o erro do Supabase para a próxima depuração aparecer em `edge_function_logs`.
- Garantir `try/catch` global retornando erro JSON (já tem) — mas adicionar fallback: se `liveCtx` falhar inteiro, ainda chamar o modelo só com KB.

## Arquivos a editar

```
src/components/equity-brain/match/QuickStartMandateDialog.tsx
  → trocar payload: pipeline_stage='match', outcome='em_andamento', deal_type='sellside'

src/hooks/useCompanyResolver.ts
  → aceitar CNPJs alfa-numéricos (LST..., qualquer 14 chars) com lookup direto em companies
  → fallback de UUID parcial para VL60xxxx → listings.id ILIKE
  → devolver candidatos top-3 quando não houver match exato

src/pages/equity-brain/DealDetailPage.tsx
  → quando resolved.source==='not_found' mas tem candidatos, mostrar lista clicável
    "Você quis dizer: MARI-TELE-0037 · ISP - KZYR3"

supabase/functions/mari-brain/index.ts
  → corrigir colunas do select de mandates
  → console.error nos catches
  → fallback: se liveCtx falhar, segue só com KB
```

Sem migrações de banco — só código.

## Verificação após implementar

1. Match Inbox → "Iniciar" → preencher valor → "Criar mandato" → cair na 360 do mandato sem erro.
2. Match Inbox → clicar empresa codinome `MARI-TELE-0037` → abrir ficha resolvendo via `cnpj=LST55316249134`.
3. Abrir Mari Brain (FAB ⌘K) → perguntar "qual meu pipeline?" → resposta com streaming OK.
