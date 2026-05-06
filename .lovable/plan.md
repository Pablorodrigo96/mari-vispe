# Analytics — Saúde do tracking, legendas e métricas avançadas

Hoje o `/admin/analytics` mostra os 4 KPIs e os gráficos básicos, mas não explica **o que cada gráfico significa** nem por que **eventos podem sumir** (DNT, opt-out, sessão sem `page_leave`). Vamos resolver isso e adicionar métricas que importam de verdade para entender o uso real da plataforma.

## 1. Card "Estado do tracking" (no topo da tela)

Bloco compacto, à direita dos KPIs, mostrando em tempo real o **seu próprio navegador** + um snapshot do banco:

- **Seu navegador agora**
  - DNT (Do Not Track): on/off
  - Consentimento de analytics (`vispe_cookie_consent.analytics`): aceito / recusado / pendente
  - `session_key` atual (8 chars) e `user_id` atual
  - Status efetivo: "rastreando" (verde) / "bloqueado por DNT" / "bloqueado por opt-out" / "aguardando consentimento"
  - Botão "enviar evento de teste" (dispara `cta_click` com metadata `{source:'admin-test'}`) → confirma roundtrip
- **Plataforma (últimas 24h)**
  - Eventos recebidos por tipo (page_view / page_leave / signup / lead / cta_click)
  - % sessões com `page_leave` (saúde do beacon — se cair muito, tempo de permanência fica subestimado)
  - % sessões anônimas vs logadas
  - Último evento recebido (timestamp) — se >30min, alerta amarelo

Componente novo: `src/components/admin/analytics/TrackingHealthCard.tsx`.
Hook: `useTrackingHealth()` agregando 1 query em `analytics_events` (últimas 24h por `event_type`) e 1 em `analytics_sessions`.

## 2. Legendas/explicação em cada gráfico

Cada Card de gráfico ganha um ícone `(i)` no canto direito do título com Tooltip (padrão `ebTooltips`) explicando:

- **Crescimento de usuários**: "Soma cumulativa de signups (linha verde clara) e total acumulado de usuários (área verde escura). Mostra a curva de aquisição."
- **Atividade diária**: "Volume diário de page views, sessões únicas e novos cadastros sobrepostos. Útil para detectar picos e correlacionar com campanhas."
- **Page views por dia**: "Quantas páginas foram abertas por dia. Cada navegação conta uma — recargas e voltas no histórico inclusive."
- **Leads por dia**: "Eventos `lead` registrados (formulários de interesse, captação, valuation). Mede conversão real, não tráfego."
- **Páginas mais vistas**: "Top 20 caminhos por views (30d). 'Tempo médio' vem de `page_leave` — pode ser zero se o usuário fechou a aba sem disparar o beacon."
- **Fontes de tráfego**: "Sessões agrupadas por `utm_source` ou `referrer`. 'direct' = sem referrer (digitou URL ou veio de app)."
- **Permanências mais longas**: "Maiores `duration_ms` registrados em `page_leave`. Sessões anônimas aparecem como 'anon'."

Todos centralizados em `src/lib/analyticsTooltips.ts` para manutenção fácil.

## 3. Novas métricas de monitoramento

Adicionar três blocos novos abaixo dos atuais:

### 3.1 Card "Funil de engajamento" (30d)
Linha horizontal com 5 pílulas:
`Sessões → Páginas/sessão → Sessões >30s → Signups → Leads`
com valor absoluto e % de conversão entre etapas. Identifica gargalo: se "páginas/sessão" cai, o conteúdo não engaja; se "Sessões >30s" cai, o site está pesado/confuso.

### 3.2 Card "Dispositivos & geolocalização"
- **Dispositivo** (donut): mobile vs desktop (de `analytics_sessions.device`)
- **Top 10 user_agent simplificado** (Chrome / Safari / Firefox / outros) — derivado regex do `user_agent`
- **Top 10 cidades/países** se `country` estiver populado; senão placeholder com hint "Backfill via IP geolocation pendente"

### 3.3 Card "Heatmap de horário"
Grid 7×24 (dia da semana × hora) colorido por nº de eventos. Mostra quando os usuários realmente usam a plataforma — base para agendar manutenção, push, e campanhas.

### 3.4 Card "Páginas de saída" (exit rate)
Top 10 caminhos onde a sessão termina (último evento da sessão). Identifica "becos sem saída" no UX.

### 3.5 Card "Conversões CTA"
Tabela de `cta_click` agrupados por `metadata->>'cta'` com count e CTR sobre page_views da página de origem. Hoje os CTAs são rastreados mas nunca exibidos.

### 3.6 Card "Retenção D1/D7"
Para usuários autenticados: % que voltam em 1 dia e 7 dias após signup. Métrica chave de produto.

### 3.7 KPIs extras na faixa do topo
Adicionar 2 KPIs ao lado dos 4 atuais (linha vira grid de 6):
- **Páginas / sessão** (engajamento)
- **Tempo médio de sessão** (duração)

## 4. Mudanças técnicas resumidas

- **Novas views SQL** (migração read-only):
  - `v_analytics_funnel` — agregação 30d com sessões, sessões>30s, signups, leads
  - `v_analytics_devices` — group by device + family de user_agent
  - `v_analytics_hourly_heatmap` — `(dow, hour, count)` 30d
  - `v_analytics_exit_pages` — último path por sessão, group by path, 30d
  - `v_analytics_cta` — `cta_click` agrupado por `metadata->>'cta'`
  - `v_analytics_retention` — % usuários ativos D1/D7 após signup
- **Hook `useAdminAnalytics`** ganha 6 queries novas (mesmo padrão das atuais).
- **`AdminAnalytics.tsx`** organizado em seções com `<h2>` separadoras: "Visão geral" → "Tendências" → "Engajamento" → "Tráfego" → "Comportamento".
- **`useTrackingHealth.ts`** novo hook independente, atualiza a cada 30s via `refetchInterval`.
- **`src/lib/analytics.ts`** ganha helper `getTrackingState()` retornando `{dnt, consent, status, sessionKey, userId}` para o card de saúde reusar a mesma lógica de `isAnalyticsOptedOut`.

## 5. Não vamos fazer agora

- Backfill de `country` via IP (precisa serviço externo ou edge function nova) — fica como hint visível.
- Replay de sessão (rrweb-style) — fora de escopo.
- Export CSV dos relatórios — pode entrar numa próxima.

Confirmando este plano, implemento na sequência: migração das views → hook → card de saúde → tooltips → seções novas no dashboard.
