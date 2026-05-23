## Pré-requisitos (já confirmados na auditoria anterior)

| Item | Status | Local |
|---|---|---|
| `doc_templates` com `code='legal_nbo_v1'` | ✅ | banco |
| `mari-generate-document/index.ts` | ✅ | `supabase/functions/mari-generate-document/index.ts` |
| `_shared/selfCritiquePass.ts` | ✅ | `supabase/functions/_shared/selfCritiquePass.ts` |
| `NboWizardPage.tsx` | ✅ | `src/pages/equity-brain/NboWizardPage.tsx` |
| `useGenerateNboFromDraft` | ✅ | `src/hooks/useNboDraft.ts` |
| `template_body` / `customizable_fields` / `ai_instructions` atuais | ✅ confirmados na auditoria (5 seções, 15 fields, trava "1-5") | — |

Pré-req OK. Plano de 4 blocos abaixo, pausando entre cada para aprovação Pablo.

---

## BLOCO 1 — Template NBO v2 (texto real Vispe)

**Migration (`supabase--migration`):**
1. Criar tabela `doc_templates_archive` se não existir (`code, template_body, customizable_fields, static_clauses, ai_instructions, preferred_model, archived_at, archived_reason`).
2. `INSERT` no archive copiando o NBO v1 atual.
3. `UPDATE doc_templates` onde `code='legal_nbo_v1'`:
   - `template_body` ← texto Vispe oficial (5 seções, frases sagradas, placeholders `{{vendedor_razao_social}}` etc.).
   - `customizable_fields` ← 30+ campos (partes/objeto/preco/pagamento/exclusividade/foro/assinatura/extras) com `default`, `auto_derive_from`, `auto_calculate`, `default_per_tipo_transacao`.
   - `static_clauses` ← 6 regras Vispe documentadas (`is_frozen`).
   - `preferred_model='claude-sonnet-4-5'`.

**Pausa para aprovação.**

---

## BLOCO 2 — System prompt cirúrgico (`ai_instructions`)

**Migration:** `UPDATE doc_templates SET ai_instructions = <novo texto>` onde `code='legal_nbo_v1'`.

Novo `ai_instructions` cobre as 10 regras:
1. 5 seções deliberadamente enxutas (sem trava "1-5").
2. Frases sagradas literais (tranquila ≠ eficiente, intermediadora, diligência, foro, rubricas).
3. Dados fixos Vispe (CNPJ 31.526.112/0001-04, endereço Gravataí/RS).
4. Defaults inteligentes (40/24/30/30, foro = sede Compradora).
5. `[A PREENCHER]` apenas para nome/CNPJ/endereço/representante/data — nunca para defaults.
6. Cálculos automáticos (`valor_por_unidade × quantidade_unidades`, breakdown 40/60).
7. Por extenso obrigatório.
8. Formatação brasileira (R$ X.XXX,XX, CNPJ, CPF, data).
9. Tom Vispe (jurídico, enxuto, sem latinismos).
10. Output apenas o markdown, sem comentários.

**Pausa para aprovação.**

---

## BLOCO 3 — Few-shot HAD×ETECC

**Editar `supabase/functions/mari-generate-document/index.ts`:**
- Adicionar constantes `FEW_SHOT_USER_EXAMPLE` (custom_fields HAD×ETECC) e `FEW_SHOT_ASSISTANT_EXAMPLE` (NBO real completo).
- Quando `template_code === 'legal_nbo_v1'`, montar `messages = [user_example, assistant_example, user_actual]`.

**Editar `supabase/functions/_shared/anthropicGateway.ts`** se necessário para aceitar array `messages` com `user/assistant` alternados (verificar — provavelmente já aceita, é Anthropic). Caching ephemeral muda para cobrir system + few-shot.

Smoke: invocar `mari-generate-document` via `supabase--curl_edge_functions` com payload de teste e checar saída próxima ao NBO real.

**Pausa para aprovação.**

---

## BLOCO 4 — Wizard expandido + self-critique bloqueante

**`src/pages/equity-brain/NboWizardPage.tsx`** — reescrever para 6 steps:
1. Partes (vendedor + comprador completos, com qualificação representante).
2. Objeto (radio `tipo_transacao` + textarea com default por tipo).
3. Preço (`valor_por_unidade × quantidade_unidades` com preview calculado).
4. Pagamento (`%à vista` default 40, `nº parcelas` default 24, tipo, dias início — com preview à vista/parcelado/parcela média).
5. Exclusividade + Foro (auto-derivado de `comprador_cidade_sede`/`comprador_uf_sede`, editável).
6. Assinatura + termos adicionais livres (IA interpreta).

Auto-derivações no client (apelido = 1ª palavra, cidade/UF do endereço, foro = sede compradora).

**`src/hooks/useNboDraft.ts`** — `useGenerateNboFromDraft` passa `use_self_critique: true` e `block_on_critique_failure: true` no body.

**`supabase/functions/_shared/selfCritiquePass.ts`** — adicionar função especializada (ou ramificação por `templateCode==='legal_nbo_v1'`) com 18 checks regex/contains: placeholders, frases sagradas, dados Vispe, 5 seções H2, padrão por extenso, formato BRL. Retorna `{ passed, errors[], score }`.

**`supabase/functions/mari-generate-document/index.ts`** — quando `use_self_critique` e branch NBO:
- Rodar critique; se falhar e `block_on_critique_failure`, regenerar 1x com prompt de retry incluindo `errors`.
- Se falhar 2x, persistir em `deal_documents` com `status='draft_critique_failed'` + `critique_errors`/`critique_score` (migration adiciona colunas se faltarem) e devolver erro amigável ao client.

Smoke: gerar 3-5 NBOs de teste; conferir checks 100%.

---

## Detalhes técnicos

- O `mari-generate-document` já lida com `eb_mandates`/`eb_companies` para resolver codename (correção da rodada anterior).
- O `hydrateTemplate` (lines 174-192 do edge) precisa ser tolerante a novos placeholders (`{{vendedor_razao_social}}` etc.) — já é (regex genérico `{{key}}`).
- Cache do Anthropic (ephemeral) deve cobrir o bloco `system + few-shot` (estável) e deixar a 3ª mensagem (input do deal) fora do cache.
- Modelo permanece `claude-sonnet-4-5` (a auditoria confirmou que está vindo do `tpl.preferred_model`).
- Coluna `critique_errors`/`critique_score` em `deal_documents`: criar via migration no Bloco 4.

## Fora de escopo (declarado por Pablo)

- NDA/Term Sheet/SPA/Mandato v2 — método será replicado depois.
- Mudanças no fluxo de assinatura/homologação.
- Mudanças no `LegalDocsMenu` / call-sites do Kanban.

## Arquivos que serão tocados

- `supabase/migrations/<timestamp>_nbo_v2_template.sql` (Bloco 1, 2)
- `supabase/migrations/<timestamp>_nbo_critique_columns.sql` (Bloco 4)
- `supabase/functions/mari-generate-document/index.ts` (Bloco 3, 4)
- `supabase/functions/_shared/anthropicGateway.ts` (Bloco 3 — só se necessário)
- `supabase/functions/_shared/selfCritiquePass.ts` (Bloco 4)
- `src/pages/equity-brain/NboWizardPage.tsx` (Bloco 4)
- `src/hooks/useNboDraft.ts` (Bloco 4)
- `mem/features/legal-docs-entry-points.md` (atualizar nota NBO v2)
