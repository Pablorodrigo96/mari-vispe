## Objetivo

Validar que o template `legal_spa_v1` gera um SPA completo via geração modular (6 seções em paralelo com Claude Opus 4.1), persiste corretamente em `deal_documents` e está pronto para o fluxo de homologação/assinatura.

## O que o teste cobre

`legal_spa_v1` difere de `legal_nbo_v1`:
- **6 partes paralelas** (`parts.length > 0` no edge function), não monolítico
- **Modelo**: `claude-opus-4-1` (não Sonnet 4.5)
- **Sem self-critique** (só roda para monolíticos)
- Partes: PARTES E OBJETO · PREÇO E PAGAMENTO · CONDIÇÕES PRECEDENTES · DECLARAÇÕES E GARANTIAS · INDENIZAÇÃO/NON-COMPETE · ARBITRAGEM E FINAIS

## Passos

1. **Curl de teste** em `mari-generate-document` com payload realista (ETECC/HAD, 100% das quotas, R$ 5M preço-base, escrow R$ 500k/24m, non-compete 3a, non-solicit 2a, cap 30%, basket 1%, CAM-CCBC). Sem `deal_id` para evitar poluir CRM.
2. **Verificar resposta**: `parts_count = 6`, `failed_parts` vazio, `model = claude-opus-4-1`, comprimento total >8k chars.
3. **Conferir persistência** em `deal_documents`: status `draft`, `template_code = legal_spa_v1`, `final_text` contendo as 6 seções `## ...` na ordem correta, `meta.input_tokens`/`output_tokens` preenchidos.
4. **Inspecionar logs** da function para detectar falhas parciais de seção (retry interno) ou timeouts do Opus.
5. **Amostragem qualitativa** do `final_text`: presença das cláusulas sagradas Vispe (declarações vendedor/comprador, indenização com cap+basket, non-compete, arbitragem CAM-CCBC), placeholders do header substituídos, valores BRL formatados.

## Critérios de aceite

- ✅ Status 200, 6/6 partes geradas, persistência OK em `deal_documents`
- ✅ Cada seção `##` presente e não-vazia (>500 chars)
- ✅ Cap, basket, escrow e prazos refletem inputs numéricos
- ✅ Sem erros de constraint (status, foreign keys)

## Se falhar

- **Parte específica vazia/erro**: ajustar `instructions` no `parts[i]` ou aumentar timeout do retry em `generateSectionWithRetry`
- **Constraint violation**: idêntico ao fix do NBO — adicionar status faltante via migration
- **Opus indisponível/timeout**: avaliar fallback para `claude-sonnet-4-5` na geração modular

## Próximo passo após aprovação

Disparar o curl no modo build, coletar resposta + linha do `deal_documents`, e te entregar um diagnóstico curto (passou / o que ajustar).