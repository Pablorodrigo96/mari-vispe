## Problema

Hoje a Match Inbox lista 4.300+ pares vendedor↔comprador, mas é uma **lista morta**:

- Os textos do Vendedor e do Comprador **não são links** — não dá pra clicar e abrir o 360.
- Os botões de **WhatsApp / telefone / e-mail estão quebrados**: usam fallback fixo, `tel:` e `mailto:` vazios. Nenhum contato real aparece.
- **Identidade fica cega** mesmo para advisor/admin (só razão social mascarada/codename) — o `IdentityRevealCard` só existe nas páginas internas de Mandato e Buyer.
- Sem mandato, **não há CTA "Criar mandato a partir do match"** — o advisor vê o par quente mas não tem como começar a trabalhar.
- Sem **detalhe rápido** (SHAP, fits, último contato, observações) → advisor não consegue decidir o que fazer só pela linha.

## Solução

Transformar cada linha em um "cartão de ação" e adicionar um drawer de detalhe que concentra contatos reais + razões do match + ações.

### 1. Linhas clicáveis (MatchInboxRow)

- O bloco do **Vendedor** vira link para `/equity-brain/crm/mandate/:id` quando há mandato, ou `/equity-brain/empresa/:cnpj` caso contrário.
- O bloco do **Comprador** vira link para `/equity-brain/crm/buyer/:id`.
- Clicar em qualquer área "vazia" da linha (fora dos botões/links) abre o **MatchDetailDrawer** (lateral).
- Botão "Abrir" passa a ter um menu suspenso: "Mandato · Empresa · Buyer · Detalhe do match".

### 2. Identidade real inline (advisor/admin)

- Reusar o hook `useIdentityVisibility({ cnpj })`. Quando `canSee=true`:
  - Mostrar **razão social real** (no lugar do codename) com chip "Identidade revelada".
  - Mostrar CNPJ formatado embaixo.
- Quando `canSee=false`: mantém codename + chip "Cego" + botão "Solicitar abertura via Advisor" (já existe `RequestDisclosureDialog`).
- Cada expansão grava `identity_reveal` em `equity_brain.access_logs` (já existe via `useTeaserAccessLog`).

### 3. Contatos reais (WhatsApp / telefone / email)

Hoje não existem `email/phone` em `equity_brain.buyers` nem em `companies` — vivem em `equity_brain.contacts` (`entity_type` + `entity_id`, com `telefone_e164`, `email`, `is_primary`, `whatsapp_opt_in`).

- Novo hook `useMatchContacts(cnpj, buyerId)` que busca em paralelo:
  - Contato primário do **buyer** (`entity_type='buyer'`, `entity_id=buyerId`, prioriza `is_primary=true`).
  - Contato primário do **vendedor**: tenta `entity_type='company' / 'cnpj'` pelo CNPJ; se não houver, pega `mandates.contato_telefone/contato_email` (já existem no schema).
- Botões da linha passam a usar valores reais:
  - WhatsApp: `getWhatsAppLink(message, telefoneE164)` — já é o helper centralizado.
  - `tel:` e `mailto:` recebem os valores reais; quando não há, ficam **disabled** com tooltip "Sem contato cadastrado · adicionar".
- Se não houver contato algum, o botão WhatsApp abre um **modal "Adicionar contato rápido"** que insere em `equity_brain.contacts` direto (advisor/admin only, RLS já permite).

### 4. Criar mandato a partir do match

- Quando `mandate_id` é `null`, aparece botão **"Iniciar mandato"** (volt) na linha.
- Clica → modal `QuickStartMandateDialog` (advisor/admin) que faz INSERT em `equity_brain.mandates` com:
  - `company_cnpj`, `match_buyer_id` (do match), `comprador_nome` (do buyer), `setor` (da empresa), `uf`, `status='prospecting'`, `pipeline_stage='qualificacao'`, `responsavel_id = auth.uid()`.
  - Loga `crm-log-activity` ("Mandato criado a partir do match #score").
- Após sucesso, redireciona para `/equity-brain/crm/mandate/:novoId`.

### 5. MatchDetailDrawer (slide-over à direita)

Novo componente mostrando, em uma única tela:

- Header com vendedor (link) ↔ comprador (link), score, tier (🔥/⚡/·) e percentil.
- **Por que esse match?** — barras de `setor_fit`, `geografia_fit`, `porte_fit`, `tese_fit` + tese (`thesis_key`).
- **Identidade real** (componente reusado, condicional ao `eb_can_view_identity`).
- **Contatos** (lista com botões WA/tel/email para cada contato).
- **Atividade recente** do mandato (se existir) — reusa `ActivityTimeline` filtrando últimos 5.
- Ações no rodapé: "Abrir mandato", "Abrir buyer", "Iniciar mandato" (se faltar), "Marcar como contatado" (insere atividade `match_contacted` via `crm-log-activity`), "Snooze 7d" (insere `match_snoozed_until` em uma nova coluna ou em `notas`).

### 6. Acessibilidade & feedback

- Loading skeletons na linha enquanto contatos carregam (não bloqueia render principal).
- Toast em todas as ações (`sonner`).
- Tooltip nos botões disabled explicando o motivo.

## Detalhes técnicos

**Arquivos a criar**
- `src/hooks/useMatchContacts.ts` — busca contatos primários de buyer + vendedor.
- `src/components/equity-brain/match/MatchDetailDrawer.tsx` — slide-over com SHAP/contatos/ações.
- `src/components/equity-brain/match/QuickStartMandateDialog.tsx` — criar mandato a partir do match.
- `src/components/equity-brain/match/AddContactDialog.tsx` — inserir contato rápido em `equity_brain.contacts`.

**Arquivos a editar**
- `src/components/equity-brain/match/MatchInboxRow.tsx` — links clicáveis, identidade condicional, contatos reais, CTA "Iniciar mandato", abrir drawer.
- `src/pages/equity-brain/MatchInboxPage.tsx` — gerenciar estado do drawer e do dialog.
- `src/hooks/useMatchInbox.ts` — incluir `mandate_id` no select já existe; adicionar `match_snoozed_until` se sair migration.

**Migration (opcional, leve)**
- Adicionar coluna `snoozed_until timestamptz null` em `equity_brain.matches` para permitir snooze por advisor; filtrar `snoozed_until is null OR snoozed_until < now()` na inbox.

**Sem mudança de RLS** — `equity_brain.contacts`, `mandates` e `matches` já têm policies de admin/advisor. `eb_can_view_identity` continua como guarda única para identidade.

## Resultado

Cada linha da Match Inbox vira uma "missão pronta" para o advisor: vê quem é a empresa real, vê o comprador real com WhatsApp/telefone funcionando, abre o detalhe com 1 clique, cria o mandato com 1 clique e marca como contatado sem sair da página.
