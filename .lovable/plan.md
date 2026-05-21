## Bloco 2 — Finalização (Cartas em Lote + Gráfica)

Domínio `notify.vispe.com.br` já está verificado. Vou ativar Lovable Emails e fechar os ~20% que faltam.

### Passos

1. **Infra de email (Lovable Emails)**
   - Provisionar infra de email (queue pgmq, cron, tabelas de log/suppressão).
   - Scaffold de transactional emails (cria `send-transactional-email` + registry + página `/unsubscribe`).

2. **Template `prospect-letters-batch`**
   - Componente React Email em `_shared/transactional-email-templates/prospect-letters-batch.tsx`.
   - Props: `advisorName`, `batchId`, `totalLetters`, `pdfUrl`, `csvUrl`, `expiresAt`, `graficaName`.
   - Visual mari (Carbon/Volt, fundo branco obrigatório), 2 botões grandes (Baixar PDF / Baixar CSV), aviso de expiração 7 dias.
   - Registrar em `registry.ts`.

3. **Edge function `send-letters-batch`**
   - Trocar o envio inline atual por `supabase.functions.invoke('send-transactional-email', { templateName: 'prospect-letters-batch', recipientEmail: graficaEmail, idempotencyKey: \`batch-\${batch_id}\`, templateData: {...} })`.
   - Manter geração de PDF/CSV + upload pro bucket `prospect-letters` + signed URLs (7d).
   - CC opcional via `app_settings.grafica_cc` → segundo invoke (uma cópia para advisor).

4. **Wiring no `ProspectionTab`**
   - Botão "Gerar carta em lote" abre `SendLettersDialog` já criado.
   - Passa contatos selecionados (validação ≤200 e `postal_address` obrigatório já feita no dialog).

5. **Admin Settings — Gráfica**
   - Mini-seção em `/admin` (ou `/admin/configuracoes`) com 3 campos persistidos em `app_settings`:
     - `grafica_email` (obrigatório)
     - `grafica_cc` (opcional, lista separada por vírgula)
     - `letter_sender_name` + `letter_sender_address` (rodapé do PDF)
   - Apenas admin pode editar (RLS já existe).

6. **QA**
   - Lint + deploy `send-transactional-email` e `send-letters-batch`.
   - Curl de teste: lote de 2 contatos fake → verificar PDF gerado, CSV, email recebido na gráfica.
   - Conferir `email_send_log` e `letter_batches.status='sent'`.

### Fora de escopo (mantido)
Tracking de entrega individual, sequências automáticas, editor visual de template, múltiplos templates por região.

### Estimativa restante
~3-4h. Sem novos secrets, sem connector externo.
