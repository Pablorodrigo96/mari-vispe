## Bloco 5 (parte 2) — E-mails de fechamento via Lovable Emails

Boa notícia: o domínio **vispe.com.br** já está verificado no workspace. Não há dependência de DNS pendente — podemos enviar e-mails reais imediatamente.

### Escopo

Quando um documento `deal_documents` muda para `status='signed'` (já tratado pelo trigger do Bloco 5 parte 1), além das notificações in-app, disparar **e-mails transacionais** para:

- **Vendedor** (via `eb_companies.created_by` → `auth.users.email`)
- **Comprador** (via `buy_mandate` ou `buyer_profile_id`)
- **Advisor responsável** (via `deal_pairs.responsavel_advisor_id`)
- **Admin** (cc fixo configurável)

Tipos de e-mail por gatilho:
- Template **NBO assinado** → "NBO firmado em {data}. Próximos passos: due diligence."
- Template **SPA/Closing assinado** → "Deal fechado! {codename} oficializado em {data}."

### Componentes a criar

**1. Infra de e-mail (uma vez)**
- Rodar `email_domain.setup_email_infra` para criar `pgmq`, `process-email-queue`, suppression list, etc.
- Sender padrão: `mari@vispe.com.br`

**2. Edge function `deal-closing-notify`**
- Service-role
- Input: `{ deal_document_id: uuid }`
- Resolve o par, identifica tipo (NBO vs SPA), busca e-mails das partes via `auth.admin.listUsers` filtrado por ids
- Renderiza 2 templates React Email (NBO / SPA) com codename, datas, link para `/equity-brain/par/:id`
- Enfileira via `pgmq_send` em `email_outbox` (a infra cuida do envio com retry)
- Loga em `audit_events` com `event_type='deal_closed'` (SPA) ou `'nbo_signed'` (NBO)

**3. Templates React Email** em `supabase/functions/_shared/email-templates/`
- `nbo-signed.tsx` — header Volt #D9F564 / Carbon #0A0A0A, codename em destaque, CTA "Ver par no Mari"
- `deal-closed.tsx` — celebração + resumo financeiro + advisor + próximos passos pós-closing

**4. Migração**
- Adicionar gatilho complementar ao trigger `trg_deal_doc_signed_notify`: após inserir notificações, chamar `pg_net.http_post` para `deal-closing-notify` com o `deal_document_id`
- Adicionar evento `'deal_closed'` em `audit_events.event_type` enum (se enum) ou apenas string
- Tabela `deal_closing_emails_log` (id, deal_pair_id, deal_document_id, recipient_type, recipient_email, template, sent_at, error) para auditoria/reenvio

**5. UI**
- Em `/equity-brain/par/:id`, abaixo de `PairSignaturesTimeline`:
  - Card "E-mails enviados" listando destinatários + status + botão **"Reenviar"** (admin/advisor)
- Banner verde "Deal fechado em DD/MM" quando `status='closed'`

### Critério de aceite

- Assinar um doc NBO em `internal_signatures` → trigger avança `deal_pairs.status='signed'` → e-mail chega aos 4 destinatários em < 60s, render com codename correto
- Assinar SPA → status='closed' + e-mail "Deal fechado" + entry em `audit_events`
- Falha de envio (e-mail inválido) é logada em `deal_closing_emails_log.error` sem quebrar trigger
- Botão "Reenviar" funciona idempotente

### Fora de escopo

- Dossiê PDF consolidado (vai ficar para um próximo passo, se quiser)
- E-mail de NDA assinado (templates futuros)

### Estimativa: 4-6h

### Dúvidas rápidas

1. **Sender**: confirmo `mari@vispe.com.br` como remetente, com `reply-to` no advisor responsável? Ou prefere `closing@vispe.com.br`?
2. **Admin cc fixo**: qual e-mail? (ex: `pablo@vispe.com.br`) ou usar todos os usuários com role `admin`?
3. Quer que eu **inclua o dossiê PDF** nesta mesma rodada (vira ~10-12h) ou prefere fazer só os e-mails agora e dossiê em seguida?
