## Diagnóstico — o que está vivo e o que falta

Investiguei o código atual:

| Funcionalidade | Status |
|---|---|
| `/admin/parcerias` — Aba **Visão Geral** (KPIs globais + ranking de parceiros + drill-down lateral + registro de atividade) | ✅ **Funciona** (`AdminPartnerships.tsx` linhas 350–500+) |
| `/admin/parcerias` — Aba **Reservas** (Kanban 4 colunas + filtro "expirando 7d" + Forçar exclusividade + Fechar pela matriz) | ✅ **Funciona** (handlers `handleForceExclusive`, `handleCloseByMatrix`) |
| `/admin/parcerias` — Aba **Cofre Digital VDR** (validar ✓ / rejeitar ✗ com motivo, recálculo automático do `vdr_readiness`) | ✅ **Funciona** (handlers `handleValidateDoc`, `handleRejectDoc` + trigger `update_listing_vdr_readiness`) |
| `/parceiro` — Stats + lista de reservas com countdown + Cofre Digital + Gerar Valuation + Pool da Rede | ✅ **Funciona** (`PartnerDashboard.tsx`) |
| Triggers de banco: `auto_create_partner_reservation` (45 dias automático ao cadastrar listing), `qualify_reservation_on_vdr` (sobe para exclusivo ao subir doc), `expire_old_reservations` (avisa 7 dias antes + expira), `update_listing_vdr_readiness` | ✅ **Todos ativos** |
| **Subir 200 clientes de uma vez (planilha) direto do painel do contador** | ❌ **Faltando no fluxo do parceiro** |
| **Score individual por cliente da carteira** | 🟡 **Parcial** — `equity_score` existe na tabela `listings`, mas não há cálculo automático; precisa preencher no upload em lote |
| **Dashboard agregado da carteira (potencial total em R$)** | 🟡 **Existe `/potencial-carteira`** mas é genérico (CFO/AC/M&A), não usa os scores individuais nem mostra a soma do `asking_price`/`annual_revenue` da carteira real |

**O `BulkUploadDialog` já existe** em `src/components/sell/BulkUploadDialog.tsx` — usa `xlsx`, valida 16 colunas (título, categoria, faturamento, lucro, valor, cidade, estado, motivo, etc.) e insere em `public.listings`. Hoje está disponível só em `/vender` num botão menos óbvio. Por causa do trigger `auto_create_partner_reservation`, **se um contador parceiro fizer upload em lote por essa rota, cada uma das 200 linhas já vira uma reserva de 45 dias automaticamente**. A peça que falta é puxar esse fluxo para dentro do painel do parceiro como ação de primeira classe e enriquecê-lo com os campos contábeis que viram score.

---

## O que vai ser feito

### Etapa 1 — Botão "Importar carteira (planilha)" dentro do `/parceiro`

**Arquivo:** `src/pages/PartnerDashboard.tsx`

- Adicionar uma seção **"Importar carteira"** no topo do painel (acima dos stats), com:
  - Botão primário **"Importar 200 clientes de uma vez"** que abre o `BulkUploadDialog` já existente.
  - Botão secundário **"Cadastrar 1 cliente"** que leva para `/vender`.
  - Após upload bem-sucedido (`onSuccess`), recarrega `loadAll()` para que as novas reservas apareçam no card "Meus Leads Reservados" com countdown de 45 dias.
- Importar `BulkUploadDialog` de `@/components/sell/BulkUploadDialog`.

Resultado: o contador entra no painel, vê o convite "Importar sua carteira completa", baixa o modelo Excel, sobe o arquivo. O trigger `auto_create_partner_reservation` cria automaticamente 1 reserva de 45 dias por linha, com notificação.

### Etapa 2 — Estender o template Excel com campos contábeis (score)

**Arquivo:** `src/components/sell/BulkUploadDialog.tsx`

Adicionar 4 colunas opcionais ao template:

| Coluna | Uso |
|---|---|
| `divida_total` (numeric) | Para o score patrimonial |
| `caixa_disponivel` (numeric) | Idem |
| `funcionarios` (int) | Tamanho da operação |
| `crescimento_yoy_pct` (numeric) | Velocidade — peso alto no score |

E **calcular o `equity_score` (0–100) na hora do insert**, usando regra simples já existente em `src/lib/equityBrain.ts` (margem líquida + crescimento + relação dívida/EBITDA + tamanho). O score vai direto para `listings.equity_score`, então:
- Aparece no ranking do Sérgio (`avg_equity_score` por parceiro).
- Aparece no card de cada lead no painel do contador.
- Alimenta o Equity Brain (já tem trigger `sync_listing_bootstrap_eb`).

Sem campos contábeis adicionais, o score continua sendo calculado só pela base mínima (faturamento, lucro, idade) — não quebra nada.

### Etapa 3 — Enriquecer o card do lead no `/parceiro` com o score individual

**Arquivo:** `src/pages/PartnerDashboard.tsx`

No bloco de cada reserva (já tem título, categoria, comissão, VDR%), adicionar:
- Badge **"Score X/100"** colorido (verde ≥ 70, amarelo 40–69, vermelho < 40).
- Linha "Potencial estimado: **R$ X**" usando `asking_price` (ou `annual_revenue × 1,5` se preço estiver oculto).

### Etapa 4 — Dashboard "Potencial da Carteira" filtrado por contador

**Arquivo:** `src/pages/PortfolioPotential.tsx`

Hoje a página assume "X clientes × cenário fixo de honorários CFO". Vou adicionar **uma nova seção no topo** (mantendo a simulação de honorários abaixo, intacta):

- **Cards agregados da carteira real do contador logado**:
  - Total de clientes cadastrados (count `listings` do user)
  - Faturamento agregado (sum `annual_revenue`)
  - Valor potencial M&A da carteira (sum `asking_price` ou estimativa)
  - Score médio da carteira (avg `equity_score`)
  - Nº de leads "prontos para vitrine" (`vdr_readiness = 100` ou score ≥ 70)
- **Mini-tabela top 5 clientes** por score, com link para o anúncio.
- **CTA**: "Comissão potencial em M&A: **R$ X** (5% sobre valor potencial agregado)".

Isso converte os 200 clientes da planilha em uma narrativa financeira para o contador — ele vê na hora quanto pode ganhar.

### Etapa 5 — Link de navegação

**Arquivo:** `src/components/layout/AppSidebar.tsx`

Garantir que dentro do grupo **"Parcerias"** já existente apareça (para `isPartnerAccountant`/`isAdvisor`):
- "Painel do Parceiro" → `/parceiro`
- "Potencial da Carteira" → `/potencial-carteira`

Se já estiver lá, só confirmar a ordem. Se não, adicionar.

---

## Critérios de aceite

1. Em `/parceiro`, contador vê botão **"Importar carteira (planilha)"** no topo. Clica, baixa modelo, sobe arquivo com 200 linhas → **200 reservas de 45 dias** aparecem na hora no card "Meus Leads Reservados", cada uma com countdown.
2. Cada lead no card mostra **score individual** (badge colorido) e **potencial estimado em R$**.
3. Em `/potencial-carteira`, contador vê **dashboard agregado real** da carteira que acabou de subir (total de clientes, faturamento somado, valor M&A potencial, top 5 por score) — abaixo continua a simulação de honorários original.
4. Sérgio em `/admin/parcerias` aba **Visão Geral** vê o ranking atualizado com o contador no topo (200 leads cadastrados, score médio calculado).
5. Sérgio na aba **Reservas** vê 200 novos cards na coluna "Reservado" do Kanban, filtráveis por parceiro.
6. Quando o contador subir um doc no Cofre Digital de qualquer um desses 200 leads, o trigger `qualify_reservation_on_vdr` move o card para "Exclusivo" automaticamente — fluxo já existente, intacto.
7. Triggers de expiração (45 dias), aviso (7 dias antes), recálculo de VDR e notificação por interesse continuam funcionando — nenhuma regression.

---

## Arquivos tocados

**Editados**
- `src/pages/PartnerDashboard.tsx` — banner de importação + score/potencial nos cards
- `src/components/sell/BulkUploadDialog.tsx` — 4 colunas contábeis novas + cálculo de `equity_score` no insert
- `src/pages/PortfolioPotential.tsx` — nova seção "Carteira real" no topo, simulação de honorários mantida
- `src/components/layout/AppSidebar.tsx` — confirmar links Parcerias

**Não tocados (preservados)**
- `src/pages/admin/AdminPartnerships.tsx` — todas as 3 abas continuam exatamente como estão
- `src/components/partner/VDRUploader.tsx`, `ReservationCountdown.tsx`, `SharedOpportunityCard.tsx`, `InterestModal.tsx`
- Todos os triggers de banco (`auto_create_partner_reservation`, `qualify_reservation_on_vdr`, `update_listing_vdr_readiness`, `expire_old_reservations`, `notify_partner_interest`)
- View `partner_opportunity_pool` e tabela `partner_opportunity_interests`