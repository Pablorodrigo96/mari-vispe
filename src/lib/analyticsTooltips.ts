// Legendas centralizadas dos cards de Analytics — pt-BR
export const analyticsTooltips = {
  pageViews: "Quantas páginas foram abertas no período. Cada navegação conta uma vez (recargas e voltas no histórico inclusive).",
  sessions: "Sessões únicas (uma por aba/dispositivo). Identificadas pelo `session_key` armazenado no sessionStorage.",
  signups: "Novos cadastros confirmados — usuários que completaram signup no período.",
  leads: "Eventos `lead` registrados (formulários de interesse, captação, valuation). Mede conversão real, não tráfego.",
  pagesPerSession: "Média de páginas vistas por sessão. Indicador direto de engajamento — quanto maior, mais o usuário explora.",
  avgSessionTime: "Tempo médio de permanência. Calculado a partir do evento `page_leave` — sessões que fecharam abruptamente podem não contar.",

  growth: "Soma cumulativa de signups (área verde escura) e novos cadastros do dia (verde claro). Mostra a curva de aquisição.",
  daily: "Volume diário de page views, sessões únicas e novos cadastros sobrepostos. Útil para detectar picos e correlacionar com campanhas.",
  pageViewsDaily: "Distribuição de page views por dia. Boa para detectar dias atípicos (lançamentos, downtime, weekends).",
  leadsDaily: "Eventos `lead` por dia. A linha que importa para o time comercial.",
  topPages: "Top 20 caminhos por views (30 dias). 'Tempo médio' vem de `page_leave` — pode aparecer como 0s se o usuário fechou a aba sem disparar o beacon.",
  sources: "Sessões agrupadas por `utm_source` ou `referrer`. 'direct' = sem referrer (URL digitada ou veio de app/email).",
  longSessions: "Maiores `duration_ms` registrados em `page_leave`. Sessões anônimas aparecem como 'anon'.",

  funnel: "Funil de engajamento dos últimos 30 dias. Identifica gargalo: se sessões>30s cai, o site está pesado/confuso; se signups cai, o CTA falha; se leads cai, a oferta não converte.",
  devices: "Distribuição mobile vs desktop, derivada do user-agent na criação da sessão.",
  browsers: "Famílias de navegador (Chrome, Safari, Firefox, Edge, outros) detectadas via regex no user-agent.",
  heatmap: "Quando os usuários realmente usam a plataforma. Eixo Y = dia da semana, eixo X = hora local do servidor. Útil para agendar manutenção e campanhas.",
  exitPages: "Páginas onde a sessão terminou (último evento). Identifica 'becos sem saída' no UX — se uma página aparece muito aqui mas pouco em conversão, vale revisar.",
  cta: "Cliques em CTAs rastreados (`cta_click`). Conta total e sessões únicas por rótulo.",
  retention: "% de novos usuários que voltaram em D+1 e D+7 após o cadastro. É o melhor indicador de product-market fit.",

  trackingHealth: "Status do rastreamento no seu navegador agora + saúde geral dos beacons nas últimas 24h. Se 'page_leave' está muito baixo, o tempo médio fica subestimado.",
} as const;
