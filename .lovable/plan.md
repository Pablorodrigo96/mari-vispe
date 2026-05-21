# Bloco 2 — Cartas em Lote (PDF único + e-mail nativo)

## Mudança vs. versão anterior
- ❌ Resend descartado
- ❌ Anexos individuais descartados
- ✅ **1 PDF consolidado** (uma página por carta) no Storage
- ✅ **E-mail nativo do Lovable** com link de download pra gráfica

## Objetivo
Advisor seleciona N contatos com `status='letter_queued'` na aba Prospecção, clica "Gerar lote de cartas" → sistema gera **um único PDF** (página 1 = carta do contato 1, página 2 = carta do contato 2, …) + 1 CSV com endereços/etiquetas, salva ambos no bucket privado, envia e-mail pra gráfica com links assinados (7 dias), e move status pra `letter_sent` com auditoria.

## Pré-requisitos
- Bloco 1 entregue ✓
- Lovable Emails habilitado + domínio configurado (vou checar status; se não houver, abro o dialog de setup antes de prosseguir)
- Setup de infra de e-mails (`setup_email_infra` + `scaffold_transactional_email`)

## Entregas

### 1. Schema (migration)
- **`letter_templates`** (admin gerencia, advisor lê ativos):
  - `name`, `subject` (assunto do e-mail pra gráfica — *não* da carta), `body_html` (corpo da carta com placeholders `{{contact_name}}`, `{{company_name}}`, `{{advisor_name}}`, `{{advisor_phone}}`, `{{cnpj}}`, `{{city}}`), `signature_html`, `is_default boolean`, `created_by`
- **`letter_batches`** (advisor vê os seus, admin vê todos):
  - `advisor_id`, `template_id`, `total_contacts int`, `pdf_storage_path`, `csv_storage_path`, `status` (generating/sent/failed), `grafica_email`, `email_message_id` (id da fila Lovable), `error_message`, `sent_at`
- **`letter_batch_items`**: `batch_id`, `prospect_contact_id`, `page_number int`, `snapshot_jsonb` (snapshot do contato no momento do envio — pra auditoria mesmo se o contato for editado depois)
- **Bucket privado `prospect-letters`** + RLS policies (advisor lê só os seus paths)
- **`app_settings`**: `grafica_email`, `grafica_cc`, `letter_sender_name`, `letter_sender_address`

### 2. Edge Function única: `send-letters-batch`
Recebe `{ contact_ids[], template_id }` →
1. Auth: valida sessão + role (advisor/admin/franchisee), valida ownership dos contatos
2. Valida `postal_address` + `postal_zipcode` preenchidos em todos
3. Cria `letter_batches` row com `status='generating'`
4. Carrega template + dados do advisor (nome, telefone)
5. **Gera PDF único** com `jspdf` (npm:jspdf@2):
   - Para cada contato: `doc.addPage()` (exceto a primeira), renderiza header com remetente, bloco de destinatário (nome, empresa, endereço, CEP), corpo da carta com placeholders substituídos via `splitTextToSize`, assinatura, número da página
   - Salva como `prospect-letters/{advisor_id}/{batch_id}/cartas.pdf`
6. **Gera CSV de etiquetas** (uma linha por contato: nome, empresa, endereço, CEP, cidade/UF) — salva como `prospect-letters/{advisor_id}/{batch_id}/etiquetas.csv`
7. Cria signed URLs de 7 dias pros dois arquivos
8. Insere `letter_batch_items` com snapshot de cada contato
9. **Envia e-mail pra gráfica** via `send-transactional-email` (template `prospect-letters-batch`):
   - To: `grafica_email` (do app_settings)
   - CC: `grafica_cc` (opcional) + advisor.email
   - `templateData`: `{ advisorName, batchId, totalCartas, pdfUrl, csvUrl, expiresAt }`
   - `idempotencyKey`: `letters-batch-${batch_id}` (segurança de retry)
10. Update `prospect_contacts.status='letter_sent'`, `last_contact_at=now()`
11. Update `letter_batches.status='sent'`, `email_message_id`, `sent_at`
12. Audit log: `prospect_letter_batch_sent` com `{ batch_id, count, contact_ids }`

Limites: máx 200 contatos/lote (PDF de 200 páginas A4 ~ 5-10MB no Storage, fora do limite de anexo). UI bloqueia acima.

### 3. Template de e-mail React Email
`supabase/functions/_shared/transactional-email-templates/prospect-letters-batch.tsx`
- Saudação à gráfica
- Resumo: "Segue lote de X cartas para impressão e envio postal"
- Botão "Baixar PDF das cartas" → `pdfUrl`
- Botão "Baixar CSV de etiquetas" → `csvUrl`
- Aviso: "Links expiram em 7 dias"
- Bloco com nome/telefone do advisor pra contato

### 4. UI
- **`/equity-brain/cartas/templates`** (admin): CRUD de `letter_templates` com preview HTML lado a lado
- **`/equity-brain/cartas/historico`**: lista `letter_batches` do advisor (data, qtd, status, botão "Baixar PDF novamente")
- **`ProspectionTab`** — bulk action "Gerar lote de cartas":
  - Habilita só se ≥1 selecionado E todos com `postal_address`
  - Limite 200; acima disso, mostra aviso e bloqueia
  - Abre `SendLettersDialog`: select template + preview da primeira carta + confirmação ("X cartas serão consolidadas em 1 PDF e enviadas para {grafica_email}")
  - Loading 10-60s durante geração; toast sucesso/erro; refresh tabela
- **Settings admin** (`/admin/configuracoes`): seção "Gráfica" com `grafica_email`, `grafica_cc`, `letter_sender_name`, `letter_sender_address`

### 5. Hooks
- `useLetterTemplates` (list/create/update/delete)
- `useSendLettersBatch` (mutation; loading longo, toast estruturado)
- `useLetterBatches` (histórico paginado + signed URL on-demand)

## Detalhes técnicos
- PDF: `jspdf@2` puro Deno, A4 (210x297mm), margens 20mm, Helvetica. `splitTextToSize` pra wrap automático. Sem fontes custom (Helvetica resolve PT-BR sem caracteres especiais quebrados).
- Idempotência: `letters-batch-${batch_id}` no `idempotencyKey` evita reenvio em retry de rede
- Rate limit: 1 batch a cada 60s por advisor (chave em `app_settings.last_batch_at` por advisor; in-memory backup)
- Status badge UI: queued=âmbar, sent=verde, failed=vermelho
- Snapshot em `letter_batch_items.snapshot_jsonb`: garante que se o contato for editado/excluído depois, o histórico mantém o estado original do envio (LGPD + auditoria)

## Smoke test
1. Admin cria template default + configura `grafica_email`
2. Lovable Emails configurado e ativo
3. Advisor cadastra 3 prospects com endereço completo
4. Seleciona os 3 → "Gerar lote de cartas" → confirma
5. Verifica: e-mail chega na gráfica com 2 botões (PDF + CSV); PDF tem 3 páginas (uma por contato); CSV tem 3 linhas; status dos 3 vira `letter_sent`; batch aparece em `/cartas/historico`; audit log gravado
6. Reabrir histórico, baixar PDF novamente → funciona (nova signed URL)
7. Mobile 375px: dialog responsivo, botões empilhados

## Fora de escopo (Bloco 3+)
- Tracking de entrega (correios)
- Cartas individuais sob demanda
- Sequências automáticas (followup)
- Editor visual de template (só HTML/markdown por enquanto)
- Múltiplos templates por gráfica/região

## Estimativa
**12-16h** (era 18-24h). Economia vem de:
- Sem Resend setup
- Sem connector/secrets novos
- 1 edge function ao invés de 2
- Template de e-mail bem mais simples (sem N anexos)