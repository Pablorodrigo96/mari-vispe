# Smoke test — NBO → e-mail de fechamento

Objetivo: validar que o trigger `fn_deal_doc_signed_notify` → `deal-closing-notify` → `send-transactional-email` → fila pgmq → entrega via `notify.mari.vispe.com.br` está funcionando ponta a ponta, e que a UI (`PairClosingEmailsCard`) reflete o resultado.

## Passos

1. **Pré-checagens (read-only)**
   - Confirmar status do domínio `notify.mari.vispe.com.br` (`check_email_domain_status`).
   - Confirmar que `process-email-queue` está agendado no pg_cron.
   - Listar 1 mandato vendedor + 1 buyer existentes para usar no par mock.

2. **Criar par + documento NBO mock** (via migration ou insert direto)
   - Insert em `deal_pairs` (sell_mandate_id, buy_mandate_id, buyer_profile_id, responsavel_advisor_id, status='nbo').
   - Insert em `deal_documents` (deal_pair_id, template_code='nbo', category='nbo', status='draft').

3. **Disparar assinatura**
   - UPDATE `deal_documents` SET status='signed', signed_at=now() WHERE id=<doc>.
   - Trigger `fn_deal_doc_signed_notify` deve chamar `deal-closing-notify` via pg_net.

4. **Validar backend**
   - `deal_closing_emails_log`: linhas para seller/buyer/advisor/admin com `sent_at` preenchido.
   - `audit_events`: evento `nbo_signed` com payload contendo recipients.
   - `email_send_log`: linhas `pending` → `sent` por destinatário.
   - Edge function logs: `deal-closing-notify` 200, sem erro.

5. **Validar UI**
   - Abrir `/equity-brain/par/<id>` → `PairClosingEmailsCard` lista os e-mails enviados.
   - Testar botão "Reenviar" (admin) → nova entrada com `force=true`.

6. **Repetir para SPA/closing**
   - Inserir 2º `deal_document` template_code='spa', category='closing', status='signed'.
   - Validar template `deal-closed` enviado, evento `deal_closed` em audit, banner verde "Deal fechado" no card.

7. **Cleanup**
   - Manter par como amostra (útil para QA futuro) ou marcar como teste e remover. Pergunto antes de deletar.

## Riscos

- Se algum mandato/buyer não tiver e-mail vinculado em `auth.users`, recipientes ficam vazios — o teste vai expor isso.
- Se `pg_net` falhar silenciosamente, `audit_events` fica vazio. Vou checar logs de pg_net na auditoria.

## Entregável

Relatório curto com: ✅/❌ por etapa, IDs criados, screenshot da UI, e qualquer ajuste necessário descoberto no caminho.
