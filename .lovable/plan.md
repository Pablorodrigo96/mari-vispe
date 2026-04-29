
# Matches no centro do Equity Brain

## Diagnóstico — onde estão os matches hoje

Os matches **existem** (4.330 linhas em `equity_brain.matches` com `is_current=true`), mas estão escondidos:

- A página `/equity-brain/oportunidades` (onde você está) **não mostra matches** — ela lista *empresas* da view `eb_opportunities_ready` (todas as 5k+ companies sincronizadas do marketplace + RFB), ranqueadas por `ma_score`. Não há filtro de "tem buyer interessado".
- Match Analytics (`crm?tab=matching`) só mostra **agregados por UF/região/setor** — não lista os pares.
- O Pipeline tem 86 mandatos mas nenhum match associado → o advisor não vê "para esta empresa, esses 5 compradores casam".
- `match_score` máximo hoje é **57** (média 42), então o filtro `>=60` do Board zera tudo. Precisamos calibrar threshold.
- `eb_matches_enriched` (view pública) está retornando 0 — precisa ser checado/recriado.

**Em uma frase:** o motor calcula, mas nenhuma tela diz ao advisor *"hoje você tem X pares mandato↔buyer prontos para ligar"*.

---

## O que vai mudar

### 1. Nova página **`/equity-brain/match-inbox`** — a "caixa de entrada de matches"

Lista flat de pares **mandato (vendedor) × buyer (comprador)** ordenada por score, com tudo que o advisor precisa para agir em 1 clique:

```text
┌─ Match Inbox ──── 312 pares · 47 quentes · 18 sem ação há 7d ─────┐
│ [score≥40▼] [setor▼] [UF▼] [só mandatos vigentes] [só sem ação]   │
├──────────────────────────────────────────────────────────────────┤
│ 🔥 89  ISP-MG-1234 ─────► COMPRADOR ALPHA   telecom/MG  R$1.4M   │
│        Vitor Rosa            João S.        ✉ 📞 wa  [Abrir →]   │
│        "Match generic · setor 0.9 · geo 0.8 · porte 0.7"         │
│        ─ sem ação há 12d                          [Marcar ação]  │
├──────────────────────────────────────────────────────────────────┤
│ ⚡ 76  SAUDE-SP-991 ─────► FUNDO BETA        saúde/SP    R$8M    │
│   ...                                                            │
└──────────────────────────────────────────────────────────────────┘
```

Cada linha:
- Score (badge com cor por tier — quente ≥70, morno 50-69, frio 40-49)
- Codename / nome do mandato (com IdentityRevealCard inline)
- Codename / nome do buyer
- Setor · UF · ticket
- 3 botões: **Ligar** (deep-link tel:), **WhatsApp** (template), **Email**
- "Última ação" (de `crm_activities`) + estado: `novo`, `contatado`, `qualificado`, `descartado`
- Click → drawer lateral com `MatchDecisionCard` (já existe) + SHAP explainability

### 2. Dashboard inicial (`/equity-brain`) ganha **hero "Matches do dia"**

No topo, antes dos KPIs atuais:

```text
┌─ Hoje você tem 47 matches QUENTES esperando ação ───────────────┐
│  [Top 5 cards horizontais, scroll]                              │
│  [Ver todos →]  [Filtrar meus mandatos]                         │
└─────────────────────────────────────────────────────────────────┘
```

Card pequeno de cada match: score + mandato → buyer + 1 botão "Abrir".

### 3. CRM Hub ganha aba **"Matches"** (4ª top-tab)

Ao lado de Visão Geral · Executivo · Match Analytics, adiciona **"Matches"** (a inbox embedada). Match Analytics fica como ele é (agregados); Matches é a fila acionável.

### 4. MandateDetailPage e BuyerDetailPage ganham card **"Top Matches"** no header

Hoje a aba existe enterrada. Vamos puxar para o **header do 360**, sempre visível:

- Em `MandateDetailPage`: "🎯 5 compradores casam com este mandato — top: BUYER X (score 76)" + botões diretos.
- Em `BuyerDetailPage`: "🎯 8 mandatos casam com este buyer — top: ISP-MG-1234 (score 76)".

### 5. Sidebar do EB ganha item **"Match Inbox"** com badge contando matches sem ação

Ícone `ArrowLeftRight` + número em pílula Volt (ex: `47`), igual o badge de notificações.

### 6. Recalibração + auto-promoção a pipeline

- Threshold "quente" passa a usar **percentis dinâmicos** (top 10% = 🔥, top 30% = ⚡) em vez de hardcode 80/60. Hoje nada bate 80; com percentil, o advisor sempre vê os melhores X%.
- Trigger novo: quando advisor marca match como `qualificado`, abre modal "Criar mandato/atividade vinculando este match" — mantém pipeline alimentado pelo motor.

### 7. Recriar `public.eb_matches_enriched` (está vazia)

Migration recria a view pública apontando para `equity_brain.matches_enriched` (que tem dados) com GRANT correto. Hoje a UI consulta ela e recebe 0 linhas — bug silencioso.

---

## O que **não** muda agora

- A página `/equity-brain/oportunidades` continua existindo (universo de empresas para prospecção fria), mas ganha banner: "Procurando pares prontos? Vá pra **Match Inbox**".
- `MatchAnalyticsContent` não muda — ele é o painel agregado de visão de mercado.
- O motor de cálculo (`match-batch`, `match-company-v2`) não muda nesta entrega.

---

## Detalhes técnicos

**Arquivos novos**
- `src/pages/equity-brain/MatchInboxPage.tsx`
- `src/components/equity-brain/match/MatchInboxRow.tsx`
- `src/components/equity-brain/match/MatchHotHero.tsx` (usado no Dashboard)
- `src/components/equity-brain/match/TopMatchesHeader.tsx` (usado em Mandate/Buyer 360)
- `src/hooks/useMatchInbox.ts` (query + filtros)
- `src/hooks/useMatchPercentiles.ts` (computa quente/morno/frio dinamicamente)
- `supabase/migrations/<ts>_recreate_eb_matches_enriched.sql` (recria view + grants)

**Arquivos editados**
- `src/App.tsx` — rota `/equity-brain/match-inbox`
- `src/pages/equity-brain/DashboardPage.tsx` — insere `<MatchHotHero />` no topo
- `src/pages/equity-brain/CrmHubPage.tsx` — adiciona top-tab "Matches"
- `src/pages/equity-brain/MandateDetailPage.tsx` e `BuyerDetailPage.tsx` — `<TopMatchesHeader />` no topo
- `src/components/equity-brain/EquityBrainLayout.tsx` (ou sidebar do EB) — item "Match Inbox" + badge
- `src/lib/ebTooltips.ts` — chaves para os novos KPIs ("Match quente", "Sem ação 7d", percentis)
- `mem://index.md` + nova memória `mem://features/match-inbox.md`

**Query base do inbox** (já validada manualmente):
```sql
SELECT m.id, m.cnpj, m.buyer_id, m.match_score, m.thesis_key, m.status,
       m.setor_fit, m.geografia_fit, m.porte_fit, m.feature_contributions,
       c.razao_social, c.codename, c.uf, c.setor_ma, c.faturamento_estimado,
       b.nome AS buyer_nome, b.tipo AS buyer_tipo,
       (SELECT MAX(created_at) FROM equity_brain.crm_activities a
         WHERE a.entity_type='match' AND a.entity_id=m.id) AS last_action_at
FROM equity_brain.matches m
LEFT JOIN equity_brain.companies c ON c.cnpj = m.cnpj
LEFT JOIN equity_brain.buyers b    ON b.id   = m.buyer_id
WHERE m.is_current = true
ORDER BY m.match_score DESC
LIMIT 200;
```

InfoHints (padrão `info-hints-pattern`) em todo KPI/badge novo.

---

## Resposta direta à sua pergunta

**Quem está em "Oportunidades"?** Todas as **empresas** (CNPJs vindos do marketplace + RFB) com score M&A calculado — é uma lista de prospecção fria, não de matches. Por isso parece desconectada do CRM/pipeline.

**Onde estão os matches?** Calculados em `equity_brain.matches` (4.330 pares ativos), mas só apareciam afundados em drawers, no DealCard, no Shadow e em agregados. Este plano traz eles para o centro: hero no Dashboard, top-tab no CRM, página dedicada `Match Inbox`, badge na sidebar e card no topo de cada mandato/buyer.
