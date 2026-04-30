---
name: Match Inbox — Matches IA acionáveis com explicabilidade SHAP
description: Hero "Matches do dia" no Dashboard, página /equity-brain/match-inbox com fila acionável (tier hot/warm/cold via percentis), página dedicada por match em /equity-brain/match/:matchId com ID copiável, ficha vendedor+comprador, MatchWhyCard (SHAP completo + p_close + EV + razões + contrafactual + comparáveis + AI pitch), contatos reais e histórico. Rota /equity-brain/empresa/:idOrCode resolve cnpj/codename/listing UUID/ticker via useCompanyResolver e redireciona para a URL canônica. DealCard com handlers reais: WhatsApp (wa.me + telefone do contato), Email (mailto + body), Salvar (equity_brain.saved_companies). Fallback "Adicionar contato" via AddContactDialog quando faltam dados.
type: feature
---
- Página inbox: `src/pages/equity-brain/MatchInboxPage.tsx` em `/equity-brain/match-inbox`.
- Página por match: `src/pages/equity-brain/MatchDetailPage.tsx` em `/equity-brain/match/:matchId` (ID curto MATCH-XXXXXX, link copiável, drawer ainda existe para preview rápido).
- Hero reutilizável: `MatchHotHero` no Dashboard e na aba "Matches IA" do CRM Hub.
- `TopMatchesHeader` mostra top 5 matches no header do mandate/buyer 360.
- Badge na EBSidebar mostra nº de matches quentes (≥ percentil 10).
- Threshold dinâmico: hot = top 10%, warm = top 30%, cold = resto. Recalibra conforme distribuição.
- Filtros: score mínimo, UF, setor, "só com mandato vigente".
- Hook `useMatchById` enriquece 1 match (cnpj/buyer/mandate) com TODAS as colunas v2 (`feature_contributions`, `reasons`, `counterfactual`, `comparables`, `ai_thesis_summary`, `ai_pitch`, `ai_confidence`, `p_close_12m + IC`, `ev_p10/p50/p90`, `multiple_p10/p50/p90`, `data_confidence`, `abstain/abstain_reason`, `buyer_archetype`, `sector_cycle_phase`, `engine_version`, `ma_score_emp`).
- Hook `useMatchInbox` agora também traz `feature_contributions`, `p_close_12m`, `engine_version` para a microlinha "por que" no card.
- Hook `useCompanyResolver(idOrCode)` aceita: 14 dígitos (CNPJ direto), `MARI-...` (codename), UUID (listing_id em equity_brain.companies → fallback public.listings.id), ticker (public.listings.ticker). Após resolver, `DealDetailPage` faz `navigate(replace)` para a URL canônica `/equity-brain/empresa/<cnpj>`.
- `DealCard` botões reais: Ligar abre QuickCallModal, WhatsApp usa `getWhatsAppLink(template, sellerPhone)` com mensagem pré-preenchida da mari, Email abre `mailto:` com subject+body. Salvar/Remover via `useToggleSaved` em `equity_brain.saved_companies` (UNIQUE user+cnpj, RLS por user_id, admin lê tudo).
- Quando o vendedor não tem telefone/email cadastrado, os botões viram "Adicionar WhatsApp/Email" abrindo `AddContactDialog` para o entity_type=company.
- **Explicabilidade**: `src/components/equity-brain/match/MatchWhyCard.tsx` é o card central que renderiza (a) narrativa da Mari + badges engine/conf/dados + alerta de abstenção, (b) decomposição estilo SHAP ordenada por |Δ| com tooltips por feature via `EB_TIPS.feat_*`, (c) cards de p(close 12m) com IC, EV p10/50/90, múltiplos e tese acionada, (d) razões + contrafactual em duas colunas, (e) comparáveis + AI pitch (apenas modo full). Suporta prop `compact` para o drawer. Fallback v1: mostra apenas as 4 fits básicas com aviso "motor legado".
- Drawer (`MatchDetailDrawer`) faz fetch lazy via `useMatchById` quando o row da inbox vem sem `feature_contributions`, garantindo SHAP no preview.
- Microlinha "por que: setor +0.30 · tese +0.16 · semantic_fit +0.04" + badge `p(close)` aparece direto no `MatchInboxRow`.

