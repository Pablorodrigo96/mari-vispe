---
name: Tela Hoje + WhatsApp Bridge
description: /equity-brain/hoje feed advisor com max 7 cards (hot_match + cooling_deal), bridge wa.me com log automático, resumos IA híbridos via Gemini 2.5-flash.
type: feature
---

# Phase 2 — Advisor Anti-Fricção (Semana 5)

## Stack
- **RPC**: `eb_today_cards(p_limit)` retorna feed priorizado (hot_match + cooling_deal) por advisor logado.
- **Hook**: `useTodayCards()` + `useDismissCard()` + `useMandateSummary()` em `src/hooks/useTodayCards.ts`.
- **Página**: `src/pages/equity-brain/TodayPage.tsx` rota `/equity-brain/hoje`.
- **Sidebar**: link Volt (`#D9F564`) destacado no topo da `EBSidebar`.
- **Bridge**: `openWhatsAppForContact()` em `src/lib/whatsappBridge.ts` chama `eb_log_whatsapp_send` automaticamente.
- **Edge Functions**:
  - `mari-summarize-deal` — Gemini 2.5-flash, gera summary 3 linhas + suggested_action + draft, cache 2h em `mandate_summaries`.
  - `mari-draft-message` — Draft contextual leve (sem cache), aceita `intent: cold_outreach|follow_up|reminder|thanks`.
  - `mari-refresh-active-summaries` — cron 4h refresca top 50 deals por priority_score.

## Princípios
- Tela `/hoje` é o feed humano. `/equity-brain` é o cockpit técnico — ambos coexistem.
- Bridge: nunca redireciona aba atual; popup bloqueado → copia link + log mesmo assim.
- Resumo: cache 2h (TTL `expires_at`), `force=true` regera. Híbrido = top 50 background, resto on-demand.
- Dismiss padrão = 24h (`resurface_at`).
