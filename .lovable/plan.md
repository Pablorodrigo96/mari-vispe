## Esteira Operacional Advisor — Blocos 3, 4 e 5

Blocos 1 (Prospecção) e 2 (Cartas em Lote) já estão em produção. Restam os 3 blocos finais do prompt original, que conectam a prospecção ao fechamento jurídico do deal.

Recomendo executar **um bloco por loop** (cada um termina em estado utilizável), com um pequeno "go/no-go" entre eles. Plano abaixo é o macro detalhado dos 3 blocos.

---

### Bloco 3 — Pareamento (deal_pairs) + Segregação por sócio

**Objetivo:** transformar "match aprovado" em par formal vendedor↔comprador, com responsável, comissão acordada e visibilidade segregada por sócio/advisor.

**Schema (1 migração):**
- `deal_pairs`: `id`, `sell_mandate_id`, `buy_mandate_id` (ou `buyer_profile_id`), `status` (`draft|active|nbo|signed|closed|lost`), `responsavel_advisor_id`, `comissao_sell_pct`, `comissao_buy_pct`, `data_pareamento`, `lost_reason`, `notes`, timestamps.
- Constraint: par único ativo por combinação (sell, buy).
- Índices em `responsavel_advisor_id`, `status`.
- RLS: admin tudo; advisor vê apenas pares onde é `responsavel_advisor_id` **ou** dono de um dos lados; observer/legal só leitura.
- View `eb_deal_pairs_enriched` com nomes (cego para non-advisor via `is_company_visible_in_crm`).

**Backend:**
- RPC `create_deal_pair_from_match(match_id, comissao_sell, comissao_buy)` que lê de `eb_matches`, cria par em `draft` e dispara `audit_events`.
- RPC `transition_deal_pair(pair_id, new_status, reason?)` com validação de transições.
- Trigger que, ao virar `nbo`, cria pasta no bucket `deal-documents/{pair_id}/`.

**Frontend (`/equity-brain/pareamentos` + integração):**
- Nova aba **"Pares"** no `PipelinePage` (depois de Prospecção/Kanban).
- Lista densa: par, advisor responsável, status, comissão, dias parado, CTA.
- Modal "Criar par" a partir de um match aprovado (com sliders de comissão).
- Página `/equity-brain/par/:id` (3 colunas: vendedor · pareamento · comprador) reusando `MatchWhyCard` e `EntityDocChecklist`.
- Filtro "Só meus pares" (default ON para advisor não-admin).

**Critério de aceite:**
- Advisor A não vê pares do advisor B (a menos que seja admin).
- Conversão de match → par registrada em `audit_events`.
- Mudança de status logada e visível na timeline.

**Estimativa:** 16–22h. Independente dos outros blocos.

---

### Bloco 4 — NBO Wizard (7 passos) + Reescrita oficial NDA/NBO

**Objetivo:** advisor monta NBO/NDA em 7 passos guiados, com IA preenchendo cláusulas a partir do par e templates oficiais reescritos pelo jurídico.

**Dependência:** Bloco 3 (`deal_pair_id` é o dono do rascunho).

**Schema (delta leve):**
- `deal_documents.deal_pair_id` (nullable, FK para `deal_pairs`).
- Atualização dos templates `legal_nda_v1`, `legal_nbo_v1` em `doc_templates` com novo `template_body`, `customizable_fields` revisados e `static_clauses` blindadas pelo jurídico (Pablo manda o texto; subimos via migração).
- Tabela `nbo_drafts` (opcional, auto-save passo a passo): `id`, `deal_pair_id`, `current_step`, `payload jsonb`, `last_saved_at`.

**Wizard `/equity-brain/par/:id/nbo` (7 steps):**
1. **Identificação das partes** (auto via mandates do par).
2. **Objeto da operação** (% participação, ativos incluídos/excluídos).
3. **Preço e condições** (valor, earn-out, retenção).
4. **Estrutura** (compra de quotas/ações, ativos, M&A).
5. **Condicionantes** (DD, regulatórias, financiamento).
6. **Exclusividade & timeline** (prazo, multa).
7. **Revisão + geração IA** (chama edge `generate-legal-document` com Claude, fallback Gemini — já existe).

**Fluxo:**
- Cada passo salva em `nbo_drafts.payload`.
- Step 7 cria `deal_documents` com `status='draft'`, `requires_partner_approval=true`, fluxo de homologação jurídica via token (já existe).
- Pós-homologação, abre assinatura interna eletrônica (já existe `internal_signatures`).

**Frontend:**
- Componente `NboWizard.tsx` com `<Stepper>` (shadcn-style custom).
- Preview lateral colável com diff de versões.
- Botão "Voltar para rascunho" / "Enviar para jurídico".

**Critério de aceite:**
- NDA + NBO oficiais validados pelo jurídico (texto fornecido pelo Pablo).
- Auto-save funciona (fechar/abrir aba mantém estado).
- Doc gerado entra no fluxo de homologação + assinatura existente sem refactor.

**Estimativa:** 22–30h.

---

### Bloco 5 — Fechamento: e-mails automáticos + dossiê PDF consolidado

**Objetivo:** ao assinar NBO/SPA, disparar notificações para as partes e gerar PDF único do deal completo (par + match + docs + timeline).

**Dependência:** Blocos 2 (infra PDF + gráfica) e 4 (NBO assinado).

**Backend:**
- Edge `deal-closing-notify`: trigger em `internal_signatures.signed_at IS NOT NULL` para docs `legal_nbo_v1` / `legal_spa_v1`. Envia e-mail (Lovable Emails — depende DNS Cloudflare) para vendedor, comprador, advisor responsável e admin. Templates em `doc_templates` com placeholders.
- Edge `deal-dossier-pdf(deal_pair_id)`: gera PDF consolidado (capa, partes, timeline, todos `deal_documents`, anexos do VDR), arquiva em `deal-documents/{pair_id}/dossie-final.pdf`.
- Atualiza `deal_pairs.status = 'signed'` ou `'closed'` conforme tipo de doc.

**Frontend:**
- Botão "Gerar dossiê" em `/equity-brain/par/:id` (admin/advisor).
- Card "Documento Final" com download + reenvio de e-mail.
- Banner de sucesso "Deal fechado em DD/MM" na timeline.

**Fallback sem e-mail:**
- Se DNS gráfica/Cloudflare ainda pendente, e-mails ficam enfileirados (queue pgmq já configurada) — funciona automaticamente quando DNS subir. PDF e mudança de status independem do e-mail.

**Critério de aceite:**
- Assinar NBO no `internal_signatures` dispara notificação em < 30s (com DNS ativo) ou enfileira (sem DNS).
- Dossiê gerado abre corretamente, paginação OK, todos os documentos do par presentes.
- `audit_events` com `deal_closed`.

**Estimativa:** 12–16h.

---

### Ordem sugerida e gates

```text
Bloco 3 (16-22h)
   |
   v
[Pablo valida pareamentos com 1-2 deals reais]
   |
   v
Bloco 4 (22-30h)  <-- jurídico precisa entregar texto NDA/NBO antes
   |
   v
[Pablo valida 1 NBO ponta a ponta]
   |
   v
Bloco 5 (12-16h)
```

**Total:** 50–68h. Cada bloco entrega valor isolado (não há risco de "tudo ou nada").

### Pré-requisitos externos
- **Bloco 4** depende do Pablo nos enviar os textos oficiais de NDA/NBO revisados pelo jurídico.
- **Bloco 5 (e-mails)** depende do DNS da gráfica/Cloudflare ficar ativo (já em standby do Bloco 2).

### Fora de escopo destes 3 blocos
- Earn-out tracking pós-fechamento (vira Bloco 6 futuro).
- Dashboard de comissões por advisor (item separado do CRM).
- Integração com cartório/registro (manual por ora).

---

### Próximo passo

Confirmar se executo **Bloco 3 agora** (estimativa 16-22h, sem dependência externa) ou se prefere outra ordem.
