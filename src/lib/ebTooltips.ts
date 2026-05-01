import type { InfoHintProps } from "@/components/equity-brain/InfoHint";

type Tip = Omit<InfoHintProps, "side" | "align" | "className" | "iconClassName">;

/**
 * Centralized dictionary of every tooltip text used across Equity Brain
 * dashboards (Board, CRM Hub, Executive Dashboard, Match Analytics, 360 panels).
 *
 * Each entry follows: { title, what (definition), action (what to do with it) }
 */
export const EB_TIPS = {
  // ───────────────────── Board Executivo · Saúde do motor
  empresas_no_banco: {
    title: "Empresas no banco",
    what: "Universo total de empresas indexadas no Equity Brain (públicas + privadas).",
    action: "Use como base para entender cobertura. Para crescer, rode os jobs de enriquecimento (RFB, signals).",
  },
  signals_computados: {
    title: "Signals computados",
    what: "Quantidade total de sinais ativos (financeiros, M&A, web, intent) calculados pelo motor.",
    action: "Volume baixo indica falha em workers de coleta — verifique a Auditoria.",
  },
  scores_calculados: {
    title: "Scores calculados",
    what: "Empresas com score de match na versão atual da fórmula (is_current=true).",
    action: "Se < número de empresas, há scoring pendente. Rode o batch de recálculo.",
  },
  oportunidades_quentes: {
    title: "Oportunidades quentes",
    what: "Empresas com ma_score ≥ 80 — alvos premium prontos para ação imediata.",
    action: "Priorize ligações e envie teaser hoje. Distribua para SDRs/advisors.",
  },
  fila_eventos: {
    title: "Fila de eventos",
    what: "Eventos do motor ainda não processados (matches, scoring, feedback do CRM).",
    action: "Acima de 1.000 indica atraso — reveja workers/edge functions de processamento.",
  },
  eventos_erro: {
    title: "Eventos com erro",
    what: "Eventos que falharam 3 vezes e foram descartados (dead-letter).",
    action: "Abra Auditoria para ver causa-raiz e reprocessar manualmente.",
  },
  tier_strong: {
    title: "Tier strong",
    what: "Empresas com ma_score entre 60 e 79 — qualidade boa, ainda não premium.",
    action: "Use como pipeline secundário para abordagem fria/SDR e nutrição.",
  },
  versao_score: {
    title: "Versão da fórmula de score",
    what: "Versão atualmente ativa do algoritmo de scoring (pesos, features, regras).",
    action: "Mudou recentemente? Compare drift v1↔v2 antes de promover novas decisões.",
  },

  // ───────────────────── Board · Funil semanal
  funil_semanal: {
    title: "Funil semanal · 7 dias",
    what: "Volume de novos itens em cada estágio nos últimos 7 dias: empresas, signals, oportunidades, calls e leads quentes.",
    action: "Quedas grandes entre estágios mostram onde o time está perdendo conversão.",
  },
  top_buyers_premium: {
    title: "Top 10 buyers por matches premium",
    what: "Compradores com mais matches score ≥ 80 vs total de matches.",
    action: "Priorize estes buyers em calls e envio de teasers nesta semana.",
  },

  // ───────────────────── CRM Hub
  total_operacoes: {
    title: "Total de operações",
    what: "Soma de mandatos vendedores + compradores ativos no CRM.",
    action: "Acompanhe a evolução semanal — base para metas comerciais.",
  },
  vendedores: {
    title: "Vendedores",
    what: "Mandatos sellside ativos (empresas que querem vender).",
    action: "Cruze com top buyers no Match Analytics para encontrar fits.",
  },
  compradores: {
    title: "Compradores",
    what: "Buyers ativos com mandato ou tese de aquisição declarada.",
    action: "Mantenha preferências atualizadas para o motor calibrar matches.",
  },
  em_andamento: {
    title: "Em andamento",
    what: "Mandatos atualmente em negociação — ainda sem desfecho.",
    action: "Acompanhe o tempo médio de fase para detectar gargalos.",
  },
  concluidas: {
    title: "Concluídas",
    what: "Mandatos com outcome 'concluído' (deal fechado).",
    action: "Use para análise de win rate e geração de cases.",
  },
  canceladas: {
    title: "Canceladas",
    what: "Mandatos encerrados sem fechamento de deal.",
    action: "Faça post-mortem para alimentar o adaptive loop do motor.",
  },
  carteira_rs: {
    title: "Carteira (R$)",
    what: "Soma do valor estimado/contratado dos mandatos ativos.",
    action: "Mostra o GMV potencial da carteira atual.",
  },
  comissao_vispe: {
    title: "Comissão Vispe",
    what: "Soma de comissões realizadas em mandatos concluídos.",
    action: "Compare com a meta mensal no Dashboard Executivo.",
  },
  proximas_acoes_mari: {
    title: "Próximas ações sugeridas pela Mari",
    what: "Sugestões geradas pelo motor com base em interações recentes, urgência e fit.",
    action: "Clique em 'Abrir' para executar; 'Tarefa' para agendar; 'WhatsApp' para conversar.",
  },
  tarefas_abertas: {
    title: "Tarefas abertas",
    what: "Tarefas criadas manualmente ou pela Mari que ainda não foram concluídas.",
    action: "Marque concluídas para alimentar a aprendizagem do motor.",
  },
  funil_pipeline: {
    title: "Funil de pipeline (mandatos)",
    what: "Distribuição dos mandatos pelos estágios reais do funil M&A — Prospecção → Match → NBO → DD → SPA → Closing → Fechado.",
    action: "Atualizado em tempo real conforme o estágio muda no Pipeline operacional ou Kanban. Estágio inflado vira gargalo — investigue tempo médio e próximos passos.",
  },
  como_motor_aprende: {
    title: "Como o motor está aprendendo",
    what: "Resumo dos pesos revelados (thetas) e mudanças de preferência declaradas pelo buyer.",
    action: "Confirme ou contradite as inferências para acelerar a calibração.",
  },

  // ───────────────────── Dashboard Executivo
  kpi_buyside: {
    title: "Buyside",
    what: "Mandatos onde a Vispe representa o comprador.",
    action: "Acompanhe a proporção buyside/sellside da carteira.",
  },
  kpi_sellside: {
    title: "Sellside",
    what: "Mandatos onde a Vispe representa o vendedor.",
    action: "Tipicamente maior ticket — monitore tempo médio de venda.",
  },
  total_das_operacoes: {
    title: "Total das operações",
    what: "Soma do valor das operações concluídas no período.",
    action: "Indicador chave de GMV. Compare ano vs ano no gráfico abaixo.",
  },
  faturamento_vispe: {
    title: "Faturamento Vispe",
    what: "Soma de comissões recebidas em deals fechados.",
    action: "Compare com a meta — base do P&L da operação.",
  },
  ticket_medio: {
    title: "Ticket médio",
    what: "Valor médio por operação concluída.",
    action: "Subindo? Boa sinalização de upmarket. Caindo? Reveja qualificação.",
  },
  tempo_medio_venda: {
    title: "Tempo médio de venda",
    what: "Tempo médio entre início e conclusão de mandatos sellside.",
    action: "Use como meta de SLA comercial. Acima de 9m exige revisão.",
  },
  tempo_medio_compra: {
    title: "Tempo médio de compra",
    what: "Tempo médio entre início e conclusão de mandatos buyside.",
    action: "Buyers institucionais são mais lentos — segmente por tipo.",
  },
  status_operacoes: {
    title: "Status das operações",
    what: "Distribuição buyside × sellside por status (em andamento / concluído / cancelado).",
    action: "Identifique desbalanceamento entre os dois lados da carteira.",
  },
  evolucao_anual: {
    title: "Evolução anual de novas operações",
    what: "Quantidade de novos mandatos iniciados a cada ano.",
    action: "Mostra crescimento da originação ano a ano.",
  },
  valor_negociado_ano: {
    title: "Valor negociado por ano",
    what: "Soma do valor (R$) das operações por ano de início, separado por buyside/sellside.",
    action: "Use para storytelling com investidores e bancos parceiros.",
  },
  comissao_anual: {
    title: "Comissão anual da Vispe",
    what: "Faturamento de comissões por ano, separado por buyside/sellside.",
    action: "Compare ritmo de receita ano a ano.",
  },
  operacoes_por_tipo: {
    title: "Operações por tipo",
    what: "Distribuição da carteira por tipo de deal (sellside, buyside, capital, etc.).",
    action: "Calibre o foco da equipe conforme a estratégia.",
  },
  operacoes_por_regiao: {
    title: "Operações por região",
    what: "Distribuição geográfica das operações por macrorregião.",
    action: "Identifique regiões sub-exploradas para expansão.",
  },
  exclusividade_donut: {
    title: "Mandatos com exclusividade",
    what: "Proporção de mandatos com cláusula de exclusividade vs não-exclusivos.",
    action: "Exclusivos têm maior taxa de conversão — busque ampliar.",
  },
  fase_sellside: {
    title: "Fase do Sellside",
    what: "Quantidade de mandatos sellside por fase do pipeline (preparação, IM, NDA, LOI, DD, fechamento).",
    action: "Visualize gargalos — fases sem progressão merecem atenção.",
  },
  operacoes_localidade: {
    title: "Operações por localidade",
    what: "Estado/cidade onde as operações foram originadas (stacked).",
    action: "Apoie decisões de hiring e abertura de filiais.",
  },
  operacoes_estado: {
    title: "Operações por estado",
    what: "Top 25 estados por volume de operações.",
    action: "Estados com poucos deals podem ser oportunidade ou desfoco — decida.",
  },
  top_3_operacoes: {
    title: "Top 3 maiores operações",
    what: "As três maiores operações por valor concluído.",
    action: "Use como case e benchmark para precificação de novos mandatos.",
  },
  por_responsavel: {
    title: "Projetos por responsável",
    what: "Distribuição dos projetos por responsável, separados por outcome.",
    action: "Avalie produtividade e taxa de conclusão por advisor.",
  },
  distribuicao_status: {
    title: "Distribuição completa de status",
    what: "Visão consolidada de todos os outcomes possíveis na carteira.",
    action: "Use para health-check geral antes de reuniões de board.",
  },

  // ───────────────────── Match Analytics
  total_mandatos: {
    title: "Total de mandatos",
    what: "Soma de todos os mandatos ativos do CRM (qualquer status).",
    action: "Base para análise de cobertura de oferta.",
  },
  mand_vigente: {
    title: "Vigente",
    what: "Mandatos com contrato ativo, ainda sem negociação iniciada.",
    action: "Priorize matching para acelerar engajamento.",
  },
  mand_em_negociacao: {
    title: "Mandatos em negociação",
    what: "Mandatos com pelo menos um buyer engajado ativamente.",
    action: "Acompanhe pipeline e SLA de resposta.",
  },
  mand_vendemos: {
    title: "Vendemos",
    what: "Mandatos fechados pela Vispe (win).",
    action: "Use para win rate e referências comerciais.",
  },
  mand_vencido: {
    title: "Vencido",
    what: "Mandatos cujo contrato expirou sem fechamento.",
    action: "Renegocie renovação ou libere para o motor reciclar leads.",
  },
  mand_vendeu_sozinho: {
    title: "Vendeu sozinho",
    what: "Cliente fechou venda fora da Vispe (lost without commission).",
    action: "Faça post-mortem — geralmente indica falha de SLA.",
  },
  total_compradores: {
    title: "Total de compradores",
    what: "Buyers ativos no banco do Equity Brain.",
    action: "Mantenha a base limpa — buyers inativos poluem o matching.",
  },
  buy_aguardando: {
    title: "Aguardando",
    what: "Buyers cadastrados sem deal em andamento.",
    action: "Envie teasers quentes para reativar engajamento.",
  },
  buy_em_negociacao: {
    title: "Compradores em negociação",
    what: "Buyers ativamente envolvidos em pelo menos um mandato.",
    action: "Prioridade máxima de SLA para fechar deal.",
  },
  mandatos_exclusivos: {
    title: "Mandatos exclusivos",
    what: "Mandatos com cláusula de exclusividade vs total ativo.",
    action: "Exclusivos têm maior win rate — busque ampliar a proporção.",
  },
  status_mandatos_chart: {
    title: "Status dos mandatos",
    what: "Distribuição da carteira por status comercial.",
    action: "Use para reuniões semanais de pipeline.",
  },
  status_compradores_chart: {
    title: "Status dos compradores",
    what: "Distribuição dos buyers por estágio de engajamento.",
    action: "Identifique buyers parados e reative com signals.",
  },
  match_estado: {
    title: "Match por estado",
    what: "Cruzamento entre mandatos (oferta) e compradores (demanda) por UF.",
    action: "UFs com muita oferta e pouca demanda merecem prospecção de buyers.",
  },
  match_regiao: {
    title: "Match por região",
    what: "Mesmo cruzamento agregado por macrorregião.",
    action: "Decida onde investir em hub/parceiros regionais.",
  },
  match_setor: {
    title: "Match por setor",
    what: "Cruzamento oferta × demanda por setor de atuação.",
    action: "Setores com gap viram alvo de campanhas de captação.",
  },

  // ───────────────────── 360 panels
  matches_panel: {
    title: "Matches sugeridos",
    what: "Compradores recomendados pelo motor com SHAP-explainability dos pesos.",
    action: "Marque interesse/desinteresse — o motor aprende em tempo real.",
  },
  pipeline_financeiro: {
    title: "Pipeline financeiro",
    what: "Valores contratuais, comissões e datas-chave do mandato.",
    action: "Mantenha valores atualizados — alimentam o Dashboard Executivo.",
  },
  documentos_panel: {
    title: "Documentos",
    what: "Arquivos vinculados ao mandato/buyer (NDA, IM, LOI, DD).",
    action: "Mantenha versões atualizadas para o time consultar.",
  },
  whatsapp_panel: {
    title: "WhatsApp",
    what: "Conversa nativa com a contraparte via WhatsApp Web embedado.",
    action: "Cada mensagem alimenta a timeline e o adaptive loop.",
  },
  conversation_summary: {
    title: "Resumo da conversa",
    what: "Síntese gerada pela Mari das últimas mensagens trocadas.",
    action: "Use antes de calls para chegar contextualizado.",
  },
  activity_timeline: {
    title: "Timeline de atividades",
    what: "Histórico cronológico de todos os eventos: calls, emails, WhatsApp, mudanças de status.",
    action: "Use para auditoria e onboarding de novos advisors.",
  },

  // ───────────────────── Match · Features do motor (decomposição SHAP)
  feat_setor: { title: "Setor", what: "Aderência entre o setor da empresa e os setores declarados pelo comprador (1.0 = exato, 0.7 = subsetor próximo).", action: "Setor baixo é o principal motivo de descarte — confirme tese do buyer." },
  feat_geografia: { title: "Geografia", what: "Match entre UF da empresa e UFs preferidas do buyer (1.0 = UF preferida, 0.5 = UF vizinha, 0.6 = buyer sem restrição).", action: "Buyers regionais penalizam fortemente UF distante." },
  feat_densidade_local: { title: "Densidade local", what: "Concentração de buyers do mesmo arquétipo na UF da empresa (proxy de demanda local).", action: "Densidade alta acelera fechamento — sinaliza setor 'quente' regionalmente." },
  feat_tamanho: { title: "Porte / Tamanho", what: "Ajuste entre porte da empresa e portes-alvo do buyer (1.0 = exato, 0.5 = porte adjacente).", action: "Porte fora do range geralmente vira 'rejeitou (size_mismatch)'." },
  feat_timing: { title: "Timing", what: "Probabilidade de mandato ativo confirmado para a empresa (modelo p_active_mandate).", action: "Timing baixo? Faça call de descoberta antes de envolver buyer." },
  feat_financeiro: { title: "Financeiro", what: "Saúde financeira (faturamento, EBITDA, qualidade dos sinais financeiros).", action: "Financeiro baixo derruba p(close) — peça documentação atualizada." },
  feat_tese: { title: "Tese", what: "Quantos signals da tese do buyer (roll-up, plataforma, expansão, etc.) a empresa dispara (≥3 = 0.8; 1–2 = 0.5; 0 = 0.2).", action: "Sem tese acionada, score fica genérico — investigue narrativa." },
  feat_recorrencia: { title: "Recorrência", what: "Receita recorrente / contratual da empresa.", action: "Alta recorrência puxa múltiplo para cima — destaque no teaser." },
  feat_contratos_longos: { title: "Contratos longos", what: "Existência de contratos plurianuais com clientes-âncora.", action: "Reduz risco percebido e justifica ticket maior." },
  feat_verticalizacao: { title: "Verticalização", what: "Grau de integração vertical da operação (cadeia controlada).", action: "Buyers estratégicos pagam prêmio por verticalização." },
  feat_regulatorio: { title: "Regulatório", what: "Maturidade regulatória / barreiras de entrada do setor.", action: "Setores regulados favorecem consolidadores; setores livres favorecem PE." },
  feat_semantic_fit: { title: "Semantic fit", what: "Similaridade semântica (cosseno entre embeddings da empresa e do buyer/tese) — captura sinergia que regras não veem.", action: "Alta similaridade indica fit cultural/estratégico mesmo com geografia/porte fora." },
  feat_seller_intent: { title: "Seller intent", what: "Intenção declarada/inferida do vendedor de transacionar nos próximos 12m.", action: "Intent baixa = priorizar nutrição. Intent alta = abordagem agressiva." },
  feat_wave_pressure: { title: "Wave pressure", what: "Tensão estrutural da célula (setor × UF) — combinação de pressão de venda e demanda.", action: "Alto = mercado aquecido, prazo curto para agir." },
  feat_horizonte: { title: "Horizonte", what: "Horizonte de investimento esperado pelo buyer (curto/médio/longo prazo).", action: "Buyers de horizonte longo aceitam empresas em desenvolvimento." },
  feat_governanca: { title: "Governança", what: "Maturidade de governança (board, controles, compliance).", action: "Governança baixa derruba múltiplo — ofereça consultoria de equity gap." },
  feat_vertical_fit: { title: "Vertical fit", what: "Aderência ao vertical específico da tese (espelha setor em primeira aproximação).", action: "Use junto com semantic_fit para validar fit fino." },
} as const satisfies Record<string, Tip>;

export type EBTipKey = keyof typeof EB_TIPS;
