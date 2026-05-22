# Auditoria front-end — resultados

Rodei smoke tests visuais nas superfícies impactadas pelos últimos blocos (Pares/NBO/Assinaturas/E-mails de fechamento) e nas telas adjacentes que dependem do mesmo stack. Abaixo, o que funciona, o que está quebrado e o que proponho corrigir.

## ✅ Funcionando

| Superfície | Status |
|---|---|
| `/equity-brain/pipeline` — Kanban M&A com 393 mandatos, abas Prospecção / Mandatos / **Pares** / Empresas | OK |
| Aba **Pares** (Bloco 3) | Empty state correto com CTA para Matches |
| `/admin/aprovacoes` | Lista 6 pedidos (3 advisors + 3 franqueados) com botões Aprovar / Rejeitar |
| `/painel` | Tri-card valuation, score Mari, janela de venda, feed, agenda, análise executiva |
| `/equity-brain/hoje` | 7 insights da Mari + tooltip explicativo |
| `/unsubscribe` (novo) | Renderiza, valida token, fallback "Token ausente" |
| Mari Brain FAB (⌘K) | Abre painel lateral com sugestões contextuais |
| Infra de e-mail | `process-email-queue`, `send-transactional-email`, `handle-email-unsubscribe`, `handle-email-suppression`, `deal-closing-notify` deployadas |
| Trigger `fn_deal_doc_signed_notify` com hook `pg_net` | Migração aplicada |
| Tabelas | `deal_pairs`, `deal_documents`, `deal_closing_emails_log` criadas; 9 `doc_templates`, 6 `stage_doc_requirements` |

## ⚠️ Achados (priorizar)

### P0 — Bloqueia o fluxo de e-mails de fechamento end-to-end
1. **Domínio `notify.mari.vispe.com.br` ainda PENDING DNS.** E-mails entram na fila mas não saem. Precisa concluir os NS records no provedor do `vispe.com.br`.
2. **Não há dados de teste para validar NBO→assinatura→e-mail.** 0 `deal_pairs` e 0 `deal_documents` no banco. Sem promover um match para par e disparar uma assinatura mock, não dá pra confirmar o pipeline ponta a ponta.

### P1 — Erros que aparecem em múltiplas telas
3. **`/rest/v1/matches?...` retorna 500** (chamado em `/painel` e `/equity-brain/pipeline`). Provavelmente RLS quebrada ou coluna `is_current` ausente/renomeada. Repete em loop.
4. **`/functions/v1/track-event` → CORS bloqueado** com `Access-Control-Allow-Origin: *` + `credentials: include`. Headers precisam de origem específica ou o client precisa parar de mandar credentials.
5. **`/rest/v1/buyer_revealed_thetas` → 404** (tabela ausente ou sem GRANT). Hook `useBuyerRevealedThetas` provavelmente referencia algo que foi removido/migrado.

### P2 — UX/risco menor
6. **`DealPairDetailPage` não testado** porque não há par válido. Vale criar guarda de "par não encontrado" antes de ir ao ar (pode quebrar com 500 em vez de 404 amigável).
7. **Warning "Tooltip is changing from uncontrolled to controlled"** no console. Cosmético, mas suja DevTools.

## Plano de correção proposto

### Bloco A — Validar infra de e-mails (sem código)
- Confirmar status DNS atual de `notify.mari.vispe.com.br` (tool `check_email_domain_status`).
- Se ainda pendente, listar exatamente os 2 NS records que precisam estar no provedor.
- Quando ficar **active**, rodar smoke test:
  - SQL: criar 1 `deal_pair` mock + 1 `deal_document` NBO em `signed`.
  - Validar que `deal-closing-notify` foi chamado, registrou em `deal_closing_emails_log` e em `audit_events` (`nbo_signed`).

### Bloco B — Corrigir os 3 erros P1
- **`matches` 500**: rodar `EXPLAIN` + checar policies; provavelmente `is_current` foi para outra tabela ou virou view. Reapontar o hook.
- **`track-event` CORS**: ajustar `corsHeaders` da edge function para ecoar `Access-Control-Allow-Origin: <origin>` (sem wildcard) **ou** remover `credentials: 'include'` do client (que parece desnecessário pra evento de tracking público).
- **`buyer_revealed_thetas` 404**: investigar se a tabela foi renomeada para `eb_buyer_revealed_thetas` ou se virou view; ajustar hook.

### Bloco C — UI de e-mails enviados no par
- Card **"E-mails de fechamento"** abaixo de `PairSignaturesTimeline` em `/equity-brain/par/:id`:
  - Lista entradas de `deal_closing_emails_log` por par (destinatário, template, status, timestamp).
  - Botão **Reenviar** (admin/advisor) chamando `deal-closing-notify` com `force: true`.
  - Banner verde "Deal fechado em DD/MM" quando `status='closed'`.
- Guarda de 404 amigável em `DealPairDetailPage` quando o id não existe.

### Bloco D — Limpeza
- Resolver warning de Tooltip uncontrolled→controlled (provavelmente um `<Tooltip open={X}>` onde X começa undefined).

## Sugestão de execução

Vou começar pelos **erros P1 (Bloco B)** porque eles afetam várias telas em produção. Depois faço o **Bloco C (UI + guarda 404)** e por último o smoke test do **Bloco A** assim que o DNS estiver verde. Concorda com essa ordem ou prefere priorizar o card de e-mails enviados primeiro?