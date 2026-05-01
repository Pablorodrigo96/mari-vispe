
# Fase 2 — Tela Hoje + WhatsApp Bridge + Resumo Mari

**Princípio carregado:** cada feature é filtrada por *"isso reduz o trabalho do advisor ou aumenta?"*. Inteligência fica no motor, simplicidade na superfície, Mari traduz.

## Diagnóstico do que já existe (verificado no banco agora)

```text
mandates_total          317   (todos ativos — pipeline_stage não tem 'closed' ainda)
crm_activities          633   (última: hoje 03:12)
contacts                741   (723 com telefone E.164 — 97.5%)
matches.match_score≥70  4330  (todos current, todos abertos)
```

Tudo que precisamos para alimentar MATCH QUENTE e DEAL ESFRIANDO **já existe**. Não precisa criar dado, só ranquear, surfar e gerar texto.

Twilio **não está conectado** — vamos conectar em paralelo na Semana 5 para ter pronto na Semana 8.

---

## O que vamos construir

### 1. Tela Hoje (`/hoje`)

Rota nova, **não substitui** `/equity-brain`. Sidebar ganha um item **"Hoje"** (Volt) no topo, acima de Dashboard. Advisors vão naturalmente migrar; admins continuam podendo ir direto pro EB.

Layout: lista vertical, máximo 7 cards, ranqueados por `priority_score`. Cada card é uma decisão. Frase em PT-BR, botão grande primário, sem ambiguidade.

Tipos de card na v1 (Semana 5):

```text
🔥 MATCH QUENTE       — match_score ≥ percentil 90 (~hot dinâmico),
                        criado nos últimos 7d, ainda não actioned
⚠️  DEAL ESFRIANDO    — mandate ativo + última atividade > 14d
                        + estágio diferente de 'closed'
```

Cards de NOTÍCIA ficam para Fase 3 (Semana 8). Não vamos mostrar mock — quando a fonte estiver viva, eles aparecem sozinhos.

Cada card tem 3 ações: **primária** (Apresentar/Mandar mensagem), secundária (Ver detalhes), e dismiss (Não é boa / Já falei). Dismiss grava em `today_card_dismissals` para não aparecer de novo por X dias.

### 2. WhatsApp Bridge (dual-track)

**Track A — v1 imediata (Semana 5-6):** deep links com tracking.
- Botão `[ MANDAR MENSAGEM ]` chama `openWhatsAppForContact(contactId, mandateId, draftedText)`.
- Função: (a) registra `crm_activity` kind=`whatsapp_sent` direction=`outbound`; (b) abre `wa.me/{phone}?text={draft}` em nova aba; (c) atualiza `mandates.last_outreach_at`; (d) re-ranqueia `priority_score` do mandato.
- Tracking honesto: marcamos "mensagem enviada" — não lemos conteúdo nem confirmação de entrega. Advisor pode ratificar com botão "Foi entregue / Foi respondida" no card que aparece na Hoje 24h depois.

**Track B — v2 Twilio (Semana 5-10, paralelo):**
- Conecto Twilio agora via standard connector.
- Edge function `whatsapp-send-template` que dispara mensagem via Twilio Business API (template aprovado).
- Webhook `/twilio-inbound` recebe respostas → grava `crm_activity` direction=`inbound` automaticamente.
- Quando estiver vivo, alterno o feature flag por advisor: usuários piloto ganham Track B; resto fica em Track A.

**Mensagens pré-rascunhadas pela Mari:** edge function `mari-draft-message` recebe `{contact_id, mandate_id, intent}` e retorna texto curto e contextual (gemini-2.5-flash, não gasta gpt-5). 4 intents na v1: `retomar_contato`, `apresentar_match`, `marcar_reuniao`, `pedir_documentos`.

### 3. Resumo automático do deal (híbrido)

**Background pros 50 deals ativos do advisor:**
- Edge function `mari-summarize-deal` que pega `mandate_id` e gera 3 linhas + 1 ação sugerida usando gemini-2.5-flash.
- Output salvo em nova tabela `mandate_summaries(mandate_id, summary_text, suggested_action_text, suggested_action_intent, suggested_contact_id, model, tokens_in, tokens_out, generated_at)`.
- Cron a cada 4h re-roda só os mandatos com `last_activity_at > last_summary_at` (incremental, barato).
- Trigger adicional dispara summarize quando `crm_activity` é inserida (debounce 5min via job na fila).

**On-demand para o resto:**
- Quando advisor abre um deal sem `summary` fresco, frontend chama `mari-summarize-deal` direto. UX: skeleton de 3 linhas + spinner ~2-3s. Cache por 2h.

Componente `<DealSummaryCard mandateId>` reutilizável: usado na Tela Hoje (quando o advisor clica em "Ver detalhes") e na página `/equity-brain/crm/mandate/:id` (substitui o header existente).

### 4. priority_score do mandato

Função SQL `compute_mandate_priority(mandate_id)` que retorna 0-100 combinando:
- 30 pts: `max(match_score)` dos matches abertos do mandato (oportunidade quente)
- 25 pts: inverso dos dias desde `last_activity` (recência)
- 20 pts: `mandate_value` normalizado (deals maiores pesam)
- 15 pts: estágio do pipeline (NBO > match > closing > due_diligence)
- 10 pts: número de buyers no radar com `temperature='hot'`

Refresh: trigger nas tabelas `matches`, `crm_activities`, `mandates` — recomputa em batch via job. Persistido em `mandates.priority_score` para ordenação rápida.

---

## Cronograma (5 semanas)

| Semana | Entrega                                                                  | Pra quem        | Gate (DoD) |
|--------|--------------------------------------------------------------------------|-----------------|-----------|
| 5      | Schema: `mandate_summaries`, `today_cards`, `today_card_dismissals`, `mandates.priority_score`. Função `compute_mandate_priority`. Job de recálculo. | Sistema         | G1+G3 |
| 5      | Conectar Twilio. Setup número WhatsApp Business + template aprovado. | Você (config) | G1 |
| 5      | Edge function `mari-draft-message` (4 intents, gemini-2.5-flash).        | Sistema         | G2 |
| 5      | Edge function `mari-summarize-deal` (gera 3 linhas + ação sugerida).     | Sistema         | G2 |
| 5      | Cron 4h `summarize-active-mandates` para os 50 mais ativos.              | Sistema         | G2+G5 |
| 6      | Página `/hoje` com 2 tipos de card (MATCH QUENTE, DEAL ESFRIANDO). Item no sidebar com badge Volt. | Advisor | G4+G5 |
| 6      | Helper `openWhatsAppForContact(contactId, mandateId, draftedText)` — Track A vivo. | Advisor | G3+G4 |
| 6      | Botão `[ MANDAR MENSAGEM ]` em todo lugar relevante chama o helper com draft pré-gerado pela Mari. | Advisor | G4 |
| 7      | Componente `<DealSummaryCard>` no header de `/equity-brain/crm/mandate/:id` substituindo o atual. | Advisor | G4 |
| 7      | Card de "Já falei, atualizar" + dismiss + auto-refresh da Hoje. Notificação web push pra cards 🔥. | Advisor | G3+G5 |
| 8      | Track B Twilio: edge function `whatsapp-send-template` + webhook `twilio-inbound`. Feature flag por advisor. | Sistema | G2+G3 |
| 9      | Card "CLIENTE PEDIU RETORNO": LLM passa em `crm_activities` extraindo promessas explícitas. | Advisor | G3 |

Tudo passa pelos 5 gates de DoD (G1 schema + assertion · G2 edge + observability · G3 dado real fluindo · G4 advisor completa fluxo sozinho · G5 health verde 48h + smoke test 3x).

---

## Detalhes técnicos

**Stack já no projeto:** React + Tailwind + shadcn/ui (`Sidebar` colapsável existente em `EBSidebar.tsx`), helper `getWhatsAppLink(message, phone)` em `src/lib/whatsapp.ts`, `withObservability` wrapper das funções edge, schema `mari_ops` para health, `equity_brain.contacts.telefone_e164` (723 com phone), `equity_brain.matches` (4330 hot), `equity_brain.crm_activities` (633 com `kind` enum + `direction`).

**Extensão do enum `crm_activity.kind`:** adicionar valores `whatsapp_sent`, `whatsapp_delivered`, `whatsapp_replied` se ainda não existirem (verificar antes da migration).

**Tela Hoje — fonte de cada card:**
```text
MATCH QUENTE     ← equity_brain.matches WHERE is_current AND match_score ≥ p90
                  AND status='new' AND assigned_bdr = current_user
                  AND NOT EXISTS (today_card_dismissals)
                  ORDER BY match_score DESC, computed_at DESC

DEAL ESFRIANDO   ← equity_brain.mandates WHERE responsavel_id = current_user
                  AND pipeline_stage <> 'closed'
                  AND (NOW() - last_activity_at) > INTERVAL '14 days'
                  AND priority_score >= 40
                  ORDER BY priority_score DESC
```

**Roteamento sem quebrar o atual:**
- Adiciona `<Route path="/hoje" element={<RequireAuth><HojePage /></RequireAuth>} />` em `App.tsx`.
- `EBSidebar` ganha item `{ to: "/hoje", label: "Hoje", Icon: Sparkles, end: true }` no topo, marcado em Volt (#D9F564), com badge da contagem de cards do dia.
- Default de login continua `/equity-brain`. Advisors descobrem `/hoje` pelo sidebar e voltam por gosto.

**Custos estimados (gemini-2.5-flash):** summarize de 50 mandatos a cada 4h = 300 calls/dia × ~800 tokens = ~240k tokens/dia ≈ **<$0.05/dia/advisor**. Drafts de mensagem ~300 tokens cada × ~50/dia/advisor ≈ **<$0.02/dia/advisor**.

**Twilio setup (você faz):**
1. Criar conta WhatsApp Business com número dedicado (~3-5 dias úteis).
2. Aprovar 1 template inicial: `mari_followup_pt` ("Oi {{1}}, aqui é {{2}} da MARI. {{3}} — Posso te ligar amanhã?").
3. Conectar via `standard_connectors--connect twilio` quando o número estiver ativo.

Enquanto Twilio não está pronto, Track A entrega 70% do valor.

---

## O que NÃO vamos fazer nesta fase

- Cockpit advisor separado em rota nova (mantém EB acessível).
- Notificações WhatsApp de saída (push web só).
- Card NOTÍCIA com mock (fica pra Fase 3 com dado real).
- Detecção de promessas em ativiades antigas (só novas, e só na Semana 9).
- Substituir o Kanban atual (continua funcionando como segundo nível).

## O que entrega no fim das 5 semanas

Um advisor logando vê **/hoje** no topo do sidebar, clica, vê 5-7 cards. Cada card tem botão grande. Clica em "Mandar mensagem" → WhatsApp abre com texto pronto. Manda. Volta. Card sumiu. Próximo card. Em 10 minutos resolveu o que antes levava 1 hora navegando entre 5 telas.

Você (admin) continua com EB inteiro disponível. Pode entrar em `/hoje` para ver o mundo do advisor sempre que quiser auditar.
