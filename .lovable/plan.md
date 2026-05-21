# Bloco 2 — Cartas em Lote + Gráfica (Resend)

## Objetivo
Permitir que o advisor selecione contatos com `status='letter_queued'` em `/equity-brain/pipeline` (aba Prospecção) e dispare cartas físicas: gera PDF personalizado por contato, envia em lote por e-mail para a gráfica parceira via Resend, e move status para `letter_sent` com auditoria.

## Pré-requisitos
- Bloco 1 entregue (tabela `prospect_contacts` com `postal_address`, `status`)
- Conectar Resend (connector) — usuário aprova
- Secret: `GRAFICA_EMAIL` (e-mail da gráfica destinatária)
- Setting admin: assinatura da carta, remetente, template HTML base

## Entregas

### 1. Schema (migration)
- Tabela `letter_templates`:
  - `id`, `name`, `subject`, `body_html` (com placeholders `{{contact_name}}`, `{{company_name}}`, `{{advisor_name}}`, `{{advisor_phone}}`), `signature_html`, `is_default boolean`, `created_by`, timestamps
  - RLS: admin gerencia, advisor lê ativos
- Tabela `letter_batches`:
  - `id`, `advisor_id`, `template_id`, `total_contacts int`, `pdf_count int`, `status` (queued/sent/failed), `grafica_email`, `resend_message_id`, `error_message`, `sent_at`, timestamps
  - RLS: advisor vê seus batches, admin vê todos
- Tabela `letter_batch_items`:
  - `id`, `batch_id`, `prospect_contact_id`, `pdf_storage_path`, `status`
- Bucket privado `prospect-letters` (PDFs)
- Setting em `app_settings`: `grafica_email`, `grafica_cc`, `letter_sender_name`

### 2. Edge Functions
- **`generate-prospect-letter`** (single): recebe `contact_id` + `template_id` → renderiza HTML com placeholders → converte em PDF (jsPDF + html2canvas server-side ou puppeteer-like; usar **jspdf** simples server-side para A4 com texto formatado, sem screenshot — mais leve no Deno) → grava em `prospect-letters/{advisor_id}/{batch_id}/{contact_id}.pdf` → retorna signed URL
- **`send-letters-batch`**: recebe `contact_ids[]` + `template_id` →
  1. Valida advisor + ownership dos contatos + `postal_address` preenchido
  2. Cria `letter_batches` row
  3. Loop: gera PDF de cada (reusa lógica acima) → cria `letter_batch_items`
  4. Envia 1 e-mail para gráfica via Resend (gateway) com **todos os PDFs como anexos** + planilha resumo (CSV inline) com endereços
  5. Move `prospect_contacts.status` para `letter_sent`, seta `last_contact_at`
  6. Loga `prospect_letter_batch_sent` em audit
  7. Atualiza `letter_batches.status='sent'` + `resend_message_id`

Limites: máx 50 contatos por batch (anexos Resend ~40MB). UI bloqueia acima.

### 3. UI
- **`/equity-brain/cartas/templates`** (admin): CRUD de `letter_templates` com preview HTML
- **ProspectionTab — bulk action "Gerar cartas em lote"**:
  - Habilita só se ≥1 contato selecionado E todos com `postal_address`
  - Abre `SendLettersDialog`: select template + preview do 1º contato + confirmação ("X cartas serão enviadas para gráfica em {grafica_email}")
  - Loading state durante batch (pode levar 30-90s)
  - Toast sucesso/erro + refresh tabela
- **`/equity-brain/cartas/historico`**: lista `letter_batches` do advisor (data, qtd, status, link p/ ver itens)
- **Settings admin** (`/admin/configuracoes`): seção "Gráfica" com inputs `grafica_email`, `grafica_cc`, `letter_sender_name`

### 4. Hooks
- `useLetterTemplates` (list, create, update, delete)
- `useSendLettersBatch` (mutation com loading longo)
- `useLetterBatches` (histórico paginado)

## Detalhes técnicos
- PDF: usar `jspdf` via `npm:jspdf@2` no edge function. Layout A4, margem 20mm, header com logo (URL público), corpo com `splitTextToSize`, footer com assinatura. Sem fontes custom (Helvetica default ok).
- Resend gateway: `POST /emails` com array `attachments: [{filename, content: base64}]`
- Idempotência: dedup por `(advisor_id, contact_id, date_trunc('day', now()))` — evita reenvio acidental
- Rate limit: 1 batch/min por advisor (in-memory no edge function)
- Status mapping na UI: badge colorido (queued=amber, sent=green, failed=red)

## Fora de escopo (Bloco 3+)
- Tracking de entrega (correios)
- Cartas individuais sob demanda
- Sequências automáticas (followup)
- Editor visual de template (só HTML por enquanto)

## Smoke test
1. Admin cria template default
2. Admin configura `grafica_email` em settings
3. Advisor adiciona 3 prospects com `postal_address` completo, marca como `letter_queued`
4. Seleciona 3 → "Gerar cartas em lote" → confirma
5. Verifica: e-mail recebido na gráfica com 3 PDFs anexos + CSV; status dos 3 vira `letter_sent`; batch aparece em `/cartas/historico`; audit log gravado
6. Tentar reenviar mesmo dia → bloqueado por idempotência
7. Mobile 375px: dialog responsivo

## Estimativa
18–24h. Após entrega: pausa para validação Pablo antes de Bloco 3 (deal_pairs).