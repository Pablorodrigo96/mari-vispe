
# Geração Inteligente de Documentos Legais — Plano de Integração

Integração ao Equity Brain existente. Reaproveita `deal_documents`, `doc_templates`, bucket `deal-documents`, AppShell, painéis de stage.

## Decisões consolidadas

| Tema | Decisão |
|---|---|
| Motor IA | **Anthropic direto** (Claude Sonnet 4.5 para NDA/NBO, Claude Opus 4.1 para SPA/TS) |
| Aprovador antes do advogado | Role `admin` existente |
| Entrega ao advogado | **Link público com token** + **e-mail Resend** (quando configurado) |
| Assinatura | **Sistema interno próprio** (sem ClickSign) |
| Templates | Começar com placeholders estruturados; admin substitui via UI |

## Fases (uma de cada vez, 100% funcional antes de avançar)

### FASE 0 — Fundações (uma migration + um wrapper)

**0.1 Secret `ANTHROPIC_API_KEY`** — pedirei via `add_secret`.

**0.2 Wrapper `_shared/anthropicGateway.ts`** — espelha `apiTrack.ts`:
- `callAnthropic({ model, system, messages, max_tokens })` → POST `https://api.anthropic.com/v1/messages`
- Headers: `x-api-key`, `anthropic-version: 2023-06-01`
- Loga em `api_usage_logs` (provider=`anthropic`, model, tokens, custo via `api_pricing`)
- Trata 429/529/insufficient_quota com fallback ao Gemini (Lovable Gateway) para não travar fluxo

**0.3 Migration de schema:**
- `doc_templates`: + `template_body text`, + `customizable_fields jsonb`, + `static_clauses jsonb`, + `ai_instructions text`, + `parts jsonb` (para SPA modular)
- `deal_documents`: + `generated_body text`, + `custom_fields_snapshot jsonb`, + `version_number int default 1`, + `parent_version_id uuid`, + `requires_partner_approval boolean default true`, + `partner_approved_at timestamptz`, + `partner_approved_by uuid`, + `partner_comments text`, + `homologation_status text` (`none|pending|approved|rejected`)
- `legal_homologations` (nova): `id`, `document_id`, `lawyer_name`, `lawyer_email`, `access_token` (uuid único), `sent_at`, `viewed_at`, `decision` (`approved|rejected|changes_requested`), `comments`, `decided_at`, `expires_at`
- `internal_signatures` (nova): `id`, `document_id`, `signer_user_id` (nullable se externo), `signer_email`, `signer_name`, `signer_role` (`seller|buyer|witness`), `sign_token`, `signed_at`, `ip`, `user_agent`, `signature_hash` (SHA-256 do PDF+timestamp+IP), `signature_image` (storage path opcional de assinatura desenhada)
- Bucket `legal-signatures` (privado) para imagens de assinatura desenhada e PDFs finais com selo
- Trigger `audit_events` para toda decisão de aprovação/homologação/assinatura

**RLS:** seguir padrão existente (admin/advisor/legal = full; buyer só vê `visible_to_buyer=true` + `buyer_has_active_access`); homologação pública por `access_token` (RPC `homologation_get_by_token` security definer); assinatura pública por `sign_token` (RPC `signature_get_by_token`).

---

### FASE 1 — NDA end-to-end (referência arquitetural)

**Edge Functions:**
1. `mari-generate-document` — recebe `{deal_id, template_code, custom_fields, mode}` → busca template, hidrata variáveis, monta prompt, chama `callAnthropic('claude-sonnet-4-5')`, persiste em `deal_documents.generated_body`, cria versão.
2. `document-partner-approval` — admin aprova/reprova; muda `partner_approved_at`, libera próxima etapa.
3. `homologation-send` — gera `access_token`, salva em `legal_homologations`, retorna URL pública `/homologacao/:token` e (se Resend ativo) dispara e-mail.
4. `homologation-decide` — pública via token, registra decisão + comentários.
5. `internal-signature-request` — cria tokens de assinatura para cada signatário, envia (e-mail + link) ou retorna URLs.
6. `internal-signature-sign` — pública via token; aceita `{signature_image_base64, accept_terms}`; valida IP/UA; grava hash; quando todos assinarem, gera PDF final com selo (HTML→PDF via `npm:html-pdf-node`) e sobe a `legal-signatures`.

**Frontend (em `/equity-brain/deal/:id` aba "Documentos"):**
- `<DocumentGenerationWizard />` — 3 steps: (1) escolher template, (2) preencher `customizable_fields` (gerado a partir do schema), (3) revisar + gerar.
- `<DocumentReviewer />` — editor markdown side-by-side, versioning visual, botão "Solicitar aprovação do sócio".
- `<PartnerApprovalPanel />` — visível só p/ admin, lista pendentes, aprova/rejeita com comentário.
- `<LegalHomologationLauncher />` — após aprovação, abre modal "Enviar para advogado": nome, e-mail, copia link OU envia e-mail.
- Página pública `/homologacao/:token` — visualizador read-only + 3 botões (Aprovar / Solicitar mudanças / Rejeitar) + textarea.
- `<InternalSignatureLauncher />` — após homologação, escolhe signatários (seller user + buyer user via `buyer_deal_access` + testemunhas), dispara.
- Página pública `/assinar/:token` — visualiza PDF, checkbox de aceite, canvas para desenhar assinatura (lib `react-signature-canvas`), confirma.
- Badge no Kanban: status do doc (rascunho → aprov. sócio → homolog. → assinatura → assinado).

**Teste manual (eu entrego o passo-a-passo):** criar deal de teste → gerar NDA → aprovar como admin → enviar homologação → abrir link anônimo → aprovar → disparar assinatura → assinar em duas sessões → conferir PDF final + audit_events.

---

### FASE 2 — NBO
Mesma arquitetura. Diferenças:
- Template com cláusulas de valor, prazo, condições suspensivas (campos no `customizable_fields`).
- Validação extra na edge function: valores em formato BR, datas futuras, CNPJ comprador válido.
- Reusa todos os componentes da Fase 1.

### FASE 3 — Term Sheet
- Template enxuto (1-2 páginas). Modelo Opus para garantir linguagem precisa.
- Reusa pipeline.

### FASE 4 — SPA modular
- `doc_templates.parts` define seções (Definições, Objeto, Preço, Reps&Warranties, Indenizações, Condições, etc.).
- Wizard expandido: usuário escolhe quais partes ativar e completa fields por parte.
- Geração em paralelo (uma chamada Claude Opus por parte) + merge final.
- Mantém aprovação/homologação/assinatura iguais.

---

## Detalhes técnicos críticos

**Custo Anthropic:** registrado em `api_pricing` (provider=`anthropic`, models=`claude-sonnet-4-5`, `claude-opus-4-1`). Dashboard admin de custos já existe — só ler.

**Versionamento:** cada regeneração ou edição manual cria nova linha em `deal_documents` com `parent_version_id`. Aprovação fica atrelada à versão exata.

**LGPD/audit:** toda visualização de doc por advogado externo + assinatura grava em `audit_events` (entity_type=`legal_document`, payload com IP/UA).

**Assinatura interna — valor jurídico:** modelo "assinatura eletrônica simples" (MP 2.200-2/2001 art. 10 §2º). Coletamos: aceite expresso + IP + UA + timestamp servidor + hash SHA-256 do PDF + opcional assinatura grafotécnica desenhada. Gera "Certificado de Assinatura" anexado ao PDF com trilha completa. Não é ICP-Brasil — comunicar isso na UI.

**E-mail Resend:** opcional. Se `RESEND_API_KEY` ausente, sistema funciona 100% com links copiáveis. Quando presente, dispara automaticamente.

**Fallback Gemini:** se Anthropic 429/down, edge function tenta `google/gemini-2.5-pro` via Lovable Gateway e marca `generated_body_fallback=true` para revisão obrigatória.

---

## O que NÃO faço neste plano
- Não toco em `clicksign-mock` (fica vivo para outros fluxos não-legais)
- Não mudo `mari-brain` nem deals/CRM existentes
- Não substituo `stage_documents` — adiciono camada "legal" em cima

---

## Ordem de entrega da Fase 1 (próximas mensagens, sequenciais)

1. `add_secret` → ANTHROPIC_API_KEY (+ RESEND_API_KEY opcional)
2. Migration única (schema + RLS + RPC + buckets) → aguardo seu OK
3. `_shared/anthropicGateway.ts` + `mari-generate-document`
4. UI Wizard + Reviewer
5. Fluxo aprovação sócio
6. Fluxo homologação + página pública
7. Fluxo assinatura interna + página pública + PDF final
8. Teste manual passo-a-passo entregue por escrito

Cada item acima vira uma mensagem fechada com verificação antes do próximo.

**Aprova esse plano para eu começar pela Fase 0/1?**
