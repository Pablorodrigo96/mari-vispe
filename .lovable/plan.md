## Mudança

Atualizar `doc_templates.preferred_model` do SPA (`legal_spa_v1`) de `claude-opus-4-1` para `claude-opus-4-7`.

## Onde

1. **DB**: `UPDATE public.doc_templates SET preferred_model='claude-opus-4-7' WHERE code='legal_spa_v1';` (via insert tool, é só dado).
2. **Migration original** (`supabase/migrations/20260519233010_eca162fb-e5ec-450e-8138-df03355e9efc.sql` linha 77): trocar `'claude-opus-4-1'` → `'claude-opus-4-7'` para manter consistência caso o banco seja recriado.

## Validação

- Confirmar via `SELECT code, preferred_model FROM doc_templates WHERE category='spa';`
- O edge function `mari-generate-document` já lê `tpl.preferred_model` dinamicamente → nenhuma mudança de código necessária ali.

## Observação

No último teste, o Opus caiu pro fallback (Gemini) em pelo menos uma das 6 partes paralelas. Se o `claude-opus-4-7` continuar instável no `anthropicGateway`, podemos avaliar reduzir paralelismo ou usar `claude-sonnet-4-6` como fallback intermediário antes do Gemini — mas isso fica para depois do teste com Opus 4.7.