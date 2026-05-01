## Diagnóstico: o que realmente existe hoje

Antes de propor mudanças, fiz auditoria do que está no código:

**Não existe Twilio neste projeto.**
- Zero edge functions com nome `twilio*`, `sms*`, `whatsapp-send*`
- Zero ocorrências da string `twilio` em `src/` ou `supabase/`
- Zero connectors Twilio linkados no workspace (só Perplexity e ElevenLabs/Hitch estão linkados)
- Tabela `meta_whatsapp_config` não existe; `whatsapp_messages` não existe

**O que existe da semana passada (WhatsApp Bridge v1 + Tela Hoje):**
- `src/lib/whatsappBridge.ts` — `openWhatsAppForContact()` abre `wa.me` em nova aba e loga via RPC
- `src/lib/whatsapp.ts` + `src/lib/crmWhatsapp.ts` — helpers de normalização de telefone e templates estáticos
- `src/components/equity-brain/crm/WhatsAppPanel.tsx` — UI de templates + envio
- RPC `eb_log_whatsapp_send` — grava em `crm_activities` (kind=whatsapp, direction=out)
- Edge functions: `mari-draft-message` (AI draft on-demand) e `mari-summarize-deal` (resumo 3 linhas, cache 2h) — ambas **já usam Gemini 2.5-flash via Lovable AI Gateway**, exatamente como o briefing pede
- Tela `/equity-brain/hoje` (`TodayPage.tsx`) com feed priorizado
- Cron `mari-refresh-active-summaries` a cada 4h
- Stack de observabilidade `mari_ops` + `withObservability` wrapper já operacional

**Conclusão:** o briefing pede "remover Twilio e implementar deep links + AI draft + log + observabilidade". Isso já está 80% pronto sob outro nome. Reescrever do zero seria desperdício e quebraria o que está em produção. Proposta: reaproveitar a base existente, evoluí-la para os critérios de aceite do briefing, e seguir nas Etapas 2/3/4 que são genuinamente novas.

---

## Etapa 0 — "Reversão" (5 minutos, basicamente confirmação)

Como não há código Twilio, esta etapa é só formalizar:

1. Confirmar para você que nenhuma function/tabela Twilio será removida (não existe nada para remover)
2. Manter o connector Twilio **disponível** no workspace (não está nem linkado, então não há ação)
3. Decisão sua: o `whatsappBridge.ts` + `eb_log_whatsapp_send` + `mari-draft-message` atuais **viram a fundação da Etapa 1** (recomendado), ou apago tudo e refaço com a nomenclatura do briefing (`whatsapp_action_log`, `generate-whatsapp-draft`, `WhatsAppActionButton`)?

**Minha recomendação:** reaproveitar e renomear/expandir, porque:
- A lógica é idêntica
- Já está instrumentado com `mari_ops`
- Já está integrado na Tela Hoje
- Reescrever quebra `TodayPage`, `WhatsAppPanel`, hooks, e o cron de resumos

Se você concordar, sigo com **"Etapa 1 = evolução do Bridge v1 para atender 100% dos critérios de aceite do briefing"**. Se preferir reescrever do zero, faço também — só preciso saber.

---

## Etapa 1 — Deep links inteligentes (cobertura completa dos critérios de aceite)

Gap analysis vs. o que o briefing pede:

| Critério do briefing | Status atual | Ação |
|---|---|---|
| Edge function que gera draft via Gemini | ✅ `mari-draft-message` existe | Adicionar `draft_type` enum (`first_contact`, `followup`, `valuation_send`, `meeting_request`, `match_announcement`) e retornar `suggested_action_label` |
| Componente UI de botão WhatsApp | ⚠️ Existe `WhatsAppPanel` (modal grande) | Criar `<WhatsAppActionButton>` reusável (botão + modal compacto edit-and-send) |
| Aparece em deal/contact/match/mandate | ⚠️ Só em CRM detail | Plugar nos 4 lugares |
| Modal pós-envio com `[✅ Mandei] [❌ Não foi] [⏰ Adiar]` | ❌ Falta | Implementar |
| Tabela `whatsapp_action_log` com draft gerado vs. enviado | ⚠️ `crm_activities` loga só o final | Criar tabela dedicada com `draft_text_generated` + `draft_text_sent` para auditoria de edição |
| Atualizar `last_contact_at` + `next_action_suggested_at` no deal | ⚠️ Trigger só atualiza `last_activity_at` | Estender trigger |
| Integração com `deal_events` (`whatsapp_outbound`) | ❌ Falta | Adicionar emissão |
| Observabilidade em `mari_ops.health_check` | ✅ Wrapper já existe | Garantir nas funções novas |

**Entregáveis Etapa 1:**

```text
NOVO  supabase/functions/generate-whatsapp-draft/index.ts
      (wrapper sobre mari-draft-message com draft_type tipado +
       suggested_action_label; mantém mari-draft-message como fallback genérico)

NOVO  src/components/whatsapp/WhatsAppActionButton.tsx
      props: { contactId, dealId?, draftType, phone, label? }
      fluxo: click → POST generate-whatsapp-draft → modal editável
             → "Abrir no WhatsApp" (wa.me, nova aba)
             → modal de marcação [✅ Mandei] [❌ Não foi] [⏰ Adiar]

NOVO  src/components/whatsapp/WhatsAppDraftModal.tsx (subcomponente)

NOVA migration:
  - tabela whatsapp_action_log (advisor_id, contact_id, deal_id,
    draft_type, draft_text_generated, draft_text_sent, phone_number,
    opened_at, marked_action, marked_at) + RLS (advisor dono OR admin)
  - extender trigger trg_bump_mandate_activity para também setar
    deals.next_action_suggested_at = now() + interval calculado por draft_type
  - função RPC eb_log_whatsapp_action(p_log_id, p_marked_action) que:
      • atualiza whatsapp_action_log
      • emite deal_events { type: 'whatsapp_outbound' } com snapshot
      • bumpa last_contact_at no deal vinculado

PLUGAR <WhatsAppActionButton> em:
  - src/pages/equity-brain/MandateDetailPage.tsx
  - src/pages/equity-brain/BuyerDetailPage.tsx
  - src/pages/equity-brain/MatchDetailPage.tsx
  - cards de matches no Today feed
```

**Critérios de aceite (replicados do briefing, valido todos antes de fechar):**
- Botão aparece em deal/buyer/match/mandate ✓
- Draft em <5s via Lovable AI ✓
- Modal editável ✓
- `wa.me?text=` encoded corretamente ✓
- `[✅ Mandei]` cria deal_event ✓
- `whatsapp_action_log` registra draft gerado e enviado (diff visível) ✓
- `mari_ops.health_check` registra cada execução ✓
- Mobile + desktop ✓
- Sem erros no console ✓

**Nada de:** webhook receiver, Cloud API, chat embutido, captura inbound, resumo automático novo (`mari-summarize-deal` que já existe continua rodando, mas não é escopo da Etapa 1).

---

## Etapa 2 — Setup Meta Business (documentação + admin shell)

Só inicio depois que Etapa 1 estiver assinada.

**Entregáveis:**

```text
NOVO  docs/whatsapp-cloud-api-setup.md
      passo a passo Meta Business Manager, Permanent Access Token,
      webhook verify token, App Secret, e os 5 templates em PT-BR
      ("primeiro_contato_advisor", "followup_reuniao",
       "match_novo_buyer", "envio_valuation", "lembrete_documento")
      com texto pronto para colar.

NOVA migration:
  - tabela meta_whatsapp_config (advisor_id, meta_phone_number_id,
    meta_business_account_id, access_token_encrypted,
    webhook_verify_token, status, connected_at) + RLS admin-only
  - usar pgsodium ou pgcrypto para encrypt do access_token

NOVO  src/pages/admin/AdminWhatsAppSetup.tsx em /admin/whatsapp-setup
      apenas role admin (usar RequireRole)
      formulário simples: phone_number_id, business_account_id, token,
      verify_token; mostra status badge.
```

**Sem código de webhook ativo** — só schema + UI. Webhook é Etapa 3.

---

## Etapa 3 — Webhook receiver (só após Meta verificada)

Gate: você confirma "Meta verificada, número conectado, webhook URL apontada".

**Entregáveis:**

```text
NOVA edge function whatsapp-webhook (PUBLIC, verify_jwt = false em config.toml)
  - GET: hub.mode/hub.verify_token/hub.challenge handshake
  - POST: valida X-Hub-Signature-256 (HMAC-SHA256 com App Secret)
  - decodifica payload Meta (entry[].changes[].value.messages[])
  - identifica advisor por phone_number_id (lookup em meta_whatsapp_config)
  - identifica contato por wa_id → buscar em eb_contacts
  - tenta vincular a deal ativo (match contact + status=active)
  - INSERT em whatsapp_messages
  - mídia: salva metadata + URL temporária, NÃO baixa arquivo
  - withObservability wrapper

NOVA migration:
  - tabela whatsapp_messages (schema completo do briefing)
  - tabela whatsapp_messages_audit_log (quem leu o quê, LGPD)
  - índices: (deal_id, timestamp_meta), (advisor_id, timestamp_meta), unique meta_message_id
  - trigger tg_whatsapp_message_received:
      • atualiza deals.last_contact_at se vinculado
      • cria notification se inbound + deal com priority_score >= 70
  - RLS: advisor dono OR admin (com log em audit table no read)

NOVO  src/pages/admin/AdminWhatsAppMonitor.tsx em /admin/whatsapp-monitor
      últimas 100 mensagens, filtros advisor/direction/status, realtime
```

---

## Etapa 4 — Inteligência automática (cron + digest + dashboard)

Gate: Etapa 3 estável por pelo menos 48h capturando mensagens reais.

**Entregáveis:**

```text
NOVA edge function whatsapp-classify-batch (cron */30 min)
  - pega messages com status='received' das últimas 30min, agrupa por deal
  - Gemini 2.5-flash → JSON { sentiment, intent, confidence }
  - INSERT em whatsapp_message_analysis
  - marca processed

NOVA edge function whatsapp-daily-digest (cron 0 22 * * * BRT)
  - para cada deal com mensagens hoje
  - Gemini 2.5-flash → JSON { summary_3_lines, phase_change_to,
                              next_action, attention_points[] }
  - UPSERT em deal_daily_summary
  - se phase_change_to ≠ atual, dispara eb_pipeline_transitions

NOVAS tabelas:
  - whatsapp_message_analysis (message_id, sentiment, intent, confidence,
    analyzed_at, model_used, prompt_version)
  - deal_daily_summary (deal_id, summary_date UNIQUE, summary_text,
    phase_change_detected, phase_change_to, next_action_suggested,
    attention_points jsonb, generated_at, model_used)

EVOLUIR src/pages/equity-brain/TodayPage.tsx
  - adicionar 3 tipos de card novos:
      🚨 ATENÇÃO URGENTE (sentiment=urgent OR intent=rejecting)
      📈 DEAL AVANÇOU (phase_change_detected = true)
      🎯 PRÓXIMA AÇÃO SUGERIDA (top 5 deals ativos)
  - manter os 2 cards existentes (MATCH QUENTE, DEAL ESFRIANDO)

NOVO smoke test em mari-smoke-tests/index.ts:
  - "daily_digest_produces_summary": valida que se houve mensagens
    no dia, há pelo menos 1 deal_daily_summary do dia
```

**IA usada:** apenas Lovable AI Gateway (Gemini 2.5-flash + flash-lite). **Claude API permanece intocado** (só `claude-analyze-call`, `claude-classify-thesis`, `claude-generate-pitch`).

---

## Regras gerais (aplicadas em todas as etapas)

1. **Observabilidade obrigatória** — toda função nova nasce com `withObservability` (já temos wrapper + schema `mari_ops`)
2. **RLS rigoroso** — `whatsapp_messages` e `whatsapp_action_log` só leem advisor dono OU admin (com log de acesso para admin)
3. **LGPD** — `content_text` criptografado at-rest via `pgcrypto`/`pgsodium`; tabela de audit log de acesso; retenção configurável (default 365 dias) via cron de purge
4. **Não pular etapas** — paro ao fim de cada uma e espero seu OK
5. **Não mexer no que funciona** — `calculate-scores`, `match-company-v2`, `mari-brain`, `claude-*`, scores, embeddings: zero alteração
6. **Rollback** — toda migration cria pareada com bloco de DOWN documentado

---

## Decisões que preciso de você ANTES de começar a Etapa 1

1. **Reaproveitar Bridge v1 como base** (recomendado, preserva Tela Hoje funcionando) — ou **reescrever do zero** com nomes do briefing?
2. **Confirmação:** o `whatsappBridge.ts` atual fica vivo até a Etapa 1 nova estar plugada nas 4 telas, depois aposento ele e migro `WhatsAppPanel.tsx` para usar `<WhatsAppActionButton>`. OK?
3. **Confirmação:** posso considerar Etapa 0 fechada (não há Twilio para reverter) e começar Etapa 1 imediatamente após sua aprovação?

Aguardo seu OK nessas 3 perguntas + aprovação geral do plano para começar a codar a Etapa 1.