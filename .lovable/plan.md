## Problema

Erro `column m.codename does not exist` quebra:
- Tela Hoje (`/equity-brain/hoje`)
- Botão WhatsApp em Mandate/Buyer/Match Detail
- Resumos automáticos (cron 4h)

Causa raiz: na Semana 5 eu assumi schema `equity_brain` e coluna `codename` em `mandates`, mas a realidade do projeto é:
- Schema: **`public`** com prefixo **`eb_`** (`eb_mandates`, `eb_buyers`, `eb_contacts`, `eb_matches`, `eb_companies`, `eb_crm_activities`)
- `eb_mandates` **não tem** `codename`, `mandate_value`, `priority_score` — esses vivem em `eb_companies` (codename) ou precisam ser derivados (`valor_pedido` / `valor_operacao`)
- Codename é resolvido via JOIN `eb_mandates.company_cnpj = eb_companies.cnpj`

## Correções

### 1. Migration: recriar RPCs `eb_today_cards`, `eb_dismiss_today_card`, `eb_log_whatsapp_send`, `eb_open_whatsapp_action`, `eb_mark_whatsapp_action`
- Trocar todas as referências `m.codename` por `COALESCE(c.codename, m.company_cnpj)` via LEFT JOIN `eb_companies c ON c.cnpj = m.company_cnpj`
- Trocar `m.mandate_value` → `COALESCE(m.valor_operacao, m.valor_pedido)`
- Trocar `m.priority_score` → derivar de `m.temperature` (hot=0.9, warm=0.6, cold=0.3) ou usar `0.5` default
- Trocar `m.last_contact_at`/`m.next_action_suggested_at` (colunas que adicionei mas não existem em `eb_mandates`) — usar `m.stage_changed_at` para "esfriando" (>10 dias = esfriando) e MAX(`eb_crm_activities.created_at`) para último contato
- Eventos de feedback gravar em `eb_crm_activities` (que existe) em vez de `crm_activities` / `deal_events` (que não existem no schema público)

### 2. Edge Functions — trocar schema
Em `generate-whatsapp-draft`, `mari-summarize-deal`, `mari-draft-message`, `mari-refresh-active-summaries`:
- Remover `.schema("equity_brain")` — usar `from("eb_mandates")`, `from("eb_buyers")`, `from("eb_contacts")`, `from("eb_matches")`, `from("eb_companies")`, `from("eb_crm_activities")`
- `mari-summarize-deal`: ler `mandate_summaries` no schema public (criar se não existir na migration); resolver codename via JOIN com `eb_companies`
- `generate-whatsapp-draft`: ler `eb_mandates` (sem `codename`, sem `last_outreach_at`); pegar codename de `eb_companies`; pegar último outreach de `eb_crm_activities`

### 3. Frontend — `whatsappBridge.ts` e `WhatsAppActionButton.tsx`
- Remover chamadas a RPCs inexistentes; manter apenas as que recriarei na migration
- `useTodayCards` / `useMandateSummary` continuam usando os mesmos nomes de RPC (recriadas com assinatura compatível)

### 4. Migration: criar tabela `mandate_summaries` (cache 2h dos resumos da Mari) em `public` se ainda não existir
```sql
CREATE TABLE IF NOT EXISTS public.mandate_summaries (
  mandate_id uuid PRIMARY KEY REFERENCES public.eb_mandates(id) ON DELETE CASCADE,
  summary_3lines text, suggested_action text, whatsapp_draft text,
  generated_at timestamptz DEFAULT now(),
  model text DEFAULT 'gemini-2.5-flash'
);
```

### 5. Limpar tabela órfã `whatsapp_action_log`
Se foi criada em schema errado, recriar em `public` com FK para `eb_mandates(id)`.

## Arquivos afetados

**Nova migration** (recria RPCs + ajusta colunas que adicionei errado):
- `supabase/migrations/<novo>_fix_today_whatsapp_schema.sql`

**Edge functions**:
- `supabase/functions/generate-whatsapp-draft/index.ts`
- `supabase/functions/mari-summarize-deal/index.ts`
- `supabase/functions/mari-draft-message/index.ts`
- `supabase/functions/mari-refresh-active-summaries/index.ts`

**Frontend** (ajustes mínimos de campos retornados):
- `src/hooks/useTodayCards.ts`
- `src/lib/whatsappBridge.ts`
- `src/components/whatsapp/WhatsAppActionButton.tsx`

**Páginas** (sem mudança estrutural — só garantir que os campos consumidos existem na resposta):
- `src/pages/equity-brain/TodayPage.tsx`
- `src/pages/equity-brain/MandateDetailPage.tsx`
- `src/pages/equity-brain/BuyerDetailPage.tsx`
- `src/pages/equity-brain/MatchDetailPage.tsx`

## Validação pós-correção

1. `/equity-brain/hoje` carrega sem erro e mostra cards
2. Clicar em WhatsApp em qualquer mandate/buyer/match abre o draft
3. Após "✅ Mandei", aparece linha em `eb_crm_activities`
4. Cron 4h roda sem erro

## Observação

Ainda não há dados em `eb_mandates`/`eb_buyers` no projeto? Verifico antes de testar — se vazio, a tela Hoje fica vazia legitimamente (sem erro) e validamos com 1 mandate de teste.
