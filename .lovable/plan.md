# Ativar 3 funções Claude dormindo

Execução estrita em **5 blocos sequenciais**, com pausa para aprovação ao final de cada um.

---

## Bloco 0 — Inspeção (entregável agora, antes de tocar em código)

Já li o código das 3 funções. Reporto aqui o resumo factual + proposta inicial de UI (preview). **Pablo confirma e libera Bloco 1.**

### claude-generate-pitch
- **Inputs (body):** `cnpj` (obrigatório), `buyer_id` (opcional — alvo específico), `channel` (`call`|`whatsapp`|`email`, default `call`), `force_refresh`.
- **O que faz:** lê `equity_brain.companies_scored` + `matches_enriched` (top 1 ou buyer alvo) → monta prompt com empresa/buyer/justificativas/canal → chama Claude → escreve `ai_pitch` em `opportunities_ready` e no match → loga em `ai_runs`.
- **Output:** `{ parsed: { pitch, abertura_curta, subject? }, tokens, cost_usd, latency_ms }`.
- **Modelo:** `claude-sonnet-4-20250514`, max_tokens 1024.
- **Custo/chamada estimado:** ~$0.005–$0.015 (in $3/Mtok · out $15/Mtok, ~500 in + ~500 out).
- **Auth:** admin OR service_role.

### claude-classify-thesis
- **Inputs:** `cnpj`, `force_refresh`.
- **O que faz:** lê `companies_scored` + `company_signals` + top 3 matches → pede ao Claude tese refinada (consolidacao_regional/sucessao_familiar/roll_up_setor/aquisicao_carteira/ganho_margem_governanca) + summary + confidence + red_flags → grava `ai_thesis_summary` em `opportunities_ready` e `matches.is_current`.
- **Output:** `{ tese_refinada, summary, confidence, red_flags[] }`.
- **Modelo:** Sonnet 4, 1024 tokens. Custo ~$0.005–$0.012.
- **Auth:** admin OR service_role.
- **Observação importante:** classifica **a tese da empresa-alvo** (qual M&A faz sentido), **não a tese do buyer** como o briefing presumiu. Isso muda a UI proposta — ver tabela abaixo.

### claude-analyze-call
- **Inputs:** `cnpj`, `call_notes` (min 50 chars), `bdr_id` opcional.
- **O que faz:** lê empresa + `signal_catalog` (signal_keys válidas) → extrai JSON estruturado (`intencao_venda` 0–1, `timing_estimado`, `dor_principal`, `sinais_novos[]`, `faturamento_mencionado`, `ebitda_mencionado`, `followup_recomendado`) → grava em `ai_runs` apenas. **Não toca `company_signals` ainda** (Fase 7 do roadmap).
- **Modelo:** Sonnet 4, 1024 tokens. Custo ~$0.005–$0.015.
- **Auth:** admin OR advisor OR service_role.

### Propostas iniciais de UI (Pablo aprova em detalhe nos Blocos 2-4)

| Função | Onde encaixa melhor | Razão |
|---|---|---|
| `claude-generate-pitch` | Card de oportunidade no `/equity-brain` + aba "Pitch" em `MatchDetailPage` (combinação A+B do briefing) | Já tem `opportunities_ready.ai_pitch` e `matches.ai_pitch` — só precisa expor + botão "Gerar/Regenerar" por canal (call/wpp/email). |
| `claude-classify-thesis` | Card "Tese refinada" na `CompanyDetailPage` (EB) + ação batch admin (recalcular opportunities) | Função opera sobre **empresa-alvo**, não buyer. Encaixe natural é no 360 da company. |
| `claude-analyze-call` | Modal "Registrar call" disparado de qualquer entidade EB (mandato/empresa/buyer) + persistência em `crm_activities` linkando `ai_runs` | Já há infra de atividades CRM; sinais extraídos viram nota estruturada e ficam prontos pra Fase 7 alimentar `company_signals`. |

---

## Bloco 1 — Migração para Lovable AI Gateway (preview do que farei após aprovação do Bloco 0)

Para cada uma das 3 funções:

1. **Trocar `fetch` direto + `apiKey`** por wrapper centralizado. `_shared/apiTrack.ts` já tem `callLovableAI()` (gateway com telemetria embutida). Vou:
   - Adicionar opção `system` em `callLovableAI` (o gateway aceita `messages` com role `system` no formato OpenAI).
   - Trocar payload: `model: "anthropic/claude-sonnet-4-20250514"`, `messages: [{role:"system", content: SYSTEM_PROMPT}, {role:"user", content: userPrompt}]`, `max_tokens: 1024`.
   - Ler `data.choices[0].message.content` em vez de `data.content[0].text`.
   - Remover `assertProviderAllowed("anthropic")` (gateway já governa) — manter o guard só por compatibilidade temporária com `provider="lovable_ai"`.
   - Recalcular custo pelo `api_pricing` row de `lovable_ai` (já em uso) — eliminar constantes hard-coded `COST_INPUT_PER_MTOK`/`COST_OUTPUT_PER_MTOK`.

2. **Tratamento de erro:** 429 → "Sistema sobrecarregado"; 402 → "Limite atingido"; 500 genérico. Surface em JSON para a UI.

3. **Deletar `ANTHROPIC_API_KEY`** dos secrets — só após smoke test de cada função via gateway retornar OK e aparecer em `api_usage_logs` com `provider="lovable_ai"`.

4. **Smoke test (SQL):**
   ```sql
   SELECT function_name, provider, count(*), sum(cost_usd)
   FROM api_usage_logs
   WHERE function_name LIKE 'claude-%'
     AND created_at > now() - interval '1 hour'
   GROUP BY 1,2;
   ```

---

## Blocos 2-4 — UI por função (uma rodada de aprovação Pablo cada)

Para cada função: apresento 2-3 opções com prós/contras → Pablo escolhe → implemento com:
- Botão destacado (cor Volt, ícone ✨), estados idle/loading/erro/resultado.
- Persistência (tabela existente ou nova).
- Discoverability: tooltip primeira-vez + badge "NOVO" 7d + card no `/equity-brain/hoje`.
- Ações pós-resultado: copiar, compartilhar via WhatsApp (`getWhatsAppLink`), regenerar.

**Tabelas previstas (avalio reutilização antes de criar):**
- `generate-pitch`: já temos `opportunities_ready.ai_pitch` + `matches.ai_pitch` + `ai_runs`. Possivelmente só criar `generated_pitches` se quisermos histórico por canal/tom.
- `classify-thesis`: já existe `opportunities_ready.ai_thesis_summary` + `matches.ai_thesis_summary`/`ai_confidence`. Sem nova tabela.
- `analyze-call`: gravar em `crm_activities` (kind=`call_analysis`, payload JSON) + link pra `ai_runs.id`. Sem nova tabela.

---

## Bloco 5 — Smoke test consolidado + relatório de custo

- Fluxo comprador (pitch) + fluxo advisor (tese + call) end-to-end.
- Query final em `api_usage_logs` agrupada por feature.
- Checklist de discoverability (3/3 pontos por feature).
- Custo total dos testes + estimativa mensal.

---

## Pré-requisito CRÍTICO (não posso validar — Pablo confirma)

Antes do Bloco 1.3 (deletar `ANTHROPIC_API_KEY`):
- [ ] Pablo confirmou no console Anthropic que **há limite de gasto $50/mês configurado** OU
- [ ] Pablo autoriza deletar a chave direto (preferível — gateway é caminho único).

## Aprovação solicitada

Liberar **Bloco 0** (este resumo está OK?) → seguir para **Bloco 1** (migração das 3 funções para gateway + smoke test + deletar `ANTHROPIC_API_KEY`).
