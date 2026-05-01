# Por que aparece "5 matches" no topo mas "0" na aba Matches

Auditei o caso INFORNET (CNPJ 02508631000141). No banco há **10 matches `is_current`** todos com buyers **`qualification_status='qualified'`** (NET-X, NAVETECH, VIRTUAL NET, LOOMY, SOFTDADOS, etc., score 56).

**Bug encontrado em `MatchesPanel.tsx` (linha 31):**
```ts
const getQual = (m: any) => m.qualification_status as string | undefined;
```
Lê `match.qualification_status` — coluna que **não existe** em `equity_brain.matches`. A flag de qualificação mora em `equity_brain.buyers.qualification_status`. Resultado: o filtro "Qualificados" zera, "Todos" também não exibe corretamente, "Base RFB" idem (depende de `match.source`, que tampouco existe em matches — `source` está em `buyers`).

Por isso o header "5 compradores casam — top NET-X" funciona (lê `matches` cru) e logo abaixo aparece "Nenhum match qualificado disponível ainda".

---

# O que vou entregar

## 1. Corrigir o filtro de qualificação (bug)

- Em `useMandateMatches`/`useBuyerMatches` (`src/hooks/useCrm.ts`): trocar o `select("*")` por um join leve via duas queries (matches + buyers/companies) e mesclar `qualification_status` e `source` da contraparte no objeto retornado, igual ao padrão de `useMatchInbox`.
- `MatchesPanel.tsx`: passar a ler `m.counterpart_qualification_status` e `m.counterpart_source`. Texto dos filtros vira "Qualificados", "Todos", "Vindos da Receita Federal".
- Resultado esperado no INFORNET: aba Matches passa a mostrar 10 matches (todos qualificados).

## 2. "Ver todos" levar à lista do mandato (não Match Inbox global)

- `TopMatchesHeader.tsx` linha 71: hoje aponta para `/equity-brain/match-inbox`.
- Quando a prop `cnpj` está setada, mudar o link para acionar a aba Matches do próprio mandato (mesma página, `?tab=matches`) — controlar `tab` por query string em `MandateDetailPage`. Idem para `buyerId` → aba Matches do buyer 360.

## 3. Reescrever "Por que esse match" em linguagem humana

Rebuild do `MatchWhyCard.tsx` num modo **plain-language por padrão**, com toggle "Ver técnico" para o atual SHAP detalhado.

Modo padrão (humano), seguindo o que cada feature significa na prática:

```text
🌎 Geografia          MATCH PERFEITO
   Comprador atua no Nordeste, INFORNET fica em PE.

📐 Porte              ENCAIXA
   Faturamento dentro do range alvo do comprador.

🎯 Tese               ALINHA
   Comprador busca consolidação regional de ISPs — INFORNET
   é exatamente o perfil.

🏭 Setor              MESMO SETOR
   Ambos em Telecom / ISP.

📞 Sinal de venda     FRACO
   Vendedor ainda não declarou intenção. Sugestão: ligar antes
   de envolver buyer.

💰 Saúde financeira   BOA
   Sinais financeiros recentes consistentes.

📊 Pressão de mercado MORNA
   Setor ISP × PE com atividade moderada de M&A nos últimos
   12 meses.
```

Regras de tradução que vou aplicar para todos os 17 features:
- valor ≥ 0.85 → "MATCH PERFEITO" / "MUITO ALTO"
- 0.65–0.84 → "ENCAIXA" / "BOM"
- 0.40–0.64 → "PARCIAL" / "MORNO"
- < 0.40 → "FRACO" + sugestão de ação curta

Para os 3 cards de cenário, troco os rótulos:
- "p(close 12m)" → **"Chance de fechar em 12 meses"**
- "EV (P10/P50/P90)" → **"Valor estimado do deal: pessimista / provável / otimista"**
- "Tese & score M&A" → **"Tese do comprador"**

Sobre a queixa de score baixo apesar de mesmo setor: o score 56 do INFORNET vem de **Seller intent baixo (0.40)** e **Wave pressure morna (0.39)** puxando pra baixo, mesmo com setor/geografia/porte 1.0. Isso fica explícito no novo card com a frase "puxa pra baixo" em destaque vermelho.

## 4. "Match Composto" no pipeline (Match Card como uma ficha unificada)

Hoje o pipeline movimenta **mandato** OU **buyer** isolado. Você quer mover o **par (mandato + buyer)** como uma única ficha — chamada **Deal**.

Estrutura que vou criar:

**Tabela nova `equity_brain.deals`:**
```text
id              uuid pk
match_id        uuid → matches(id)
mandate_id      uuid → mandates(id)
buyer_id        uuid → buyers(id)
cnpj            text
stage           text  (pipeline stage atual)
outcome         text  (open / won / lost / paused)
owner_user_id   uuid
created_at, updated_at, last_moved_at
notes           text
```

Promoção: na tela do match, botão **"Promover para Pipeline"** cria a row em `deals` (idempotente por `match_id`). A página de Pipeline passa a renderizar **deals** (não mais mandates soltos), com card mostrando:

```text
┌─────────────────────────────────────────┐
│ DEAL · INFORNET ⇄ NET-X            56  │
│ Telecom · NE · R$ 0                    │
│ Estágio: Discovery · 3d                │
└─────────────────────────────────────────┘
```

Clicar abre **`/equity-brain/deal/:id`** — nova rota com:
- header do par (vendedor + comprador lado a lado, mesma estética do MatchDetailPage)
- 3 colunas: ficha do vendedor (clicável → 360 da empresa), ficha do comprador (clicável → 360 do buyer), painel central com timeline unificada, próxima ação, WhatsApp para ambos os lados, documentos e MatchWhyCard humano
- botões de mover estágio (drag no kanban também)

Migração de pipeline:
- `eb_pipeline_transitions` ganha coluna nullable `deal_id` (mantém `mandate_id` para retrocompat).
- `PipelineKanbanPage` ganha toggle no topo: **"Por Deal (par)"** (default) / **"Por Mandato (legado)"**.

## 5. Por que a aba "Base RFB" mostra 0

Os 10 matches do INFORNET têm `buyers.source = 'import'`, não `'rfb_expand'`. Então corretamente é 0 — mas o usuário interpreta como "bug". Vou:
- renomear filtro para **"Vindos da Receita Federal"** + tooltip explicando que aparecem aqui apenas matches gerados pelo botão "Expandir busca na Base RFB" do buyer 360
- adicionar contador no tooltip: "Use 'Expandir busca' no buyer para popular esta lista"

---

# Arquivos tocados

```text
NOVOS
  supabase/migrations/<ts>_eb_deals_pipeline.sql   (tabela deals + RLS + trigger)
  src/pages/equity-brain/DealDetailPage.tsx        (já existe stub — preencher)
  src/hooks/useDeal.ts
  src/lib/matchWhyHumanizer.ts                     (tradução feature → texto)

EDITADOS
  src/hooks/useCrm.ts                              (join buyer/company nos matches)
  src/components/equity-brain/crm/MatchesPanel.tsx (filtro correto + rótulos pt)
  src/components/equity-brain/match/TopMatchesHeader.tsx (link contextual)
  src/components/equity-brain/match/MatchWhyCard.tsx     (modo humano + toggle)
  src/pages/equity-brain/MandateDetailPage.tsx     (tab via querystring + botão "Promover para Pipeline")
  src/pages/equity-brain/MatchDetailPage.tsx       (botão "Promover para Pipeline")
  src/pages/equity-brain/PipelineKanbanPage.tsx    (toggle Deal/Mandato + render por deal)
  src/App.tsx                                      (rota /equity-brain/deal/:id se faltar)
```

# Resultado esperado no INFORNET

- Aba Matches passa a mostrar **10 qualificados** (NET-X, NAVETECH, VIRTUAL NET, LOOMY, SOFTDADOS, PLANOWEB, TURBONET, WANTEL, KASATECH, NORTETEL)
- "Ver todos" no header abre a própria aba Matches (não some pra inbox global)
- Card "Por que esse match" diz em pt-BR claro o que significa cada peça e por que deu 56 apesar de mesmo setor
- Botão **"Promover para Pipeline"** cria um Deal NET-X⇄INFORNET que aparece no Kanban como uma única ficha movível

Aprova que eu já mando bala?
