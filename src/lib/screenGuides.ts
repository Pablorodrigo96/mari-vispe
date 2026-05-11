/**
 * Catálogo de guias por tela — tom curto e direto, pt-BR.
 * Cada guia tem: pra que serve, o que fazer agora, dica e RISCO de não fazer.
 * Editado em código para revisão fácil via PR.
 */

export type Guide = {
  /** Pra que serve essa tela/bloco. */
  purpose: string;
  /** O que fazer agora (1-3 bullets). */
  doNow: string[];
  /** Dica de uso avançado (opcional). */
  tip?: string;
  /** Consequência negativa de NÃO fazer ou preencher errado. */
  risk?: string;
};

/* ============================================================================
 *  PAGE_GUIDES — chave por rota/área
 * ========================================================================== */
export const PAGE_GUIDES: Record<string, Guide> = {
  // ===== Onda 1 — Crítico advisor =====
  "painel": {
    purpose: "Seu cockpit. Mostra valor da empresa, melhor janela de venda e o que fazer essa semana.",
    doNow: [
      "Olhe os 5 cards do topo: janela, compradores, próximo passo.",
      "Clique no card amarelo da Mari para abrir a sugestão do dia.",
    ],
    tip: "Atualiza sozinho. Não precisa recarregar.",
    risk: "Sem olhar o painel você perde a melhor janela de venda e age fora de hora.",
  },
  "eb.hoje": {
    purpose: "Sua lista do dia: quem ligar, quem cobrar, o que a Mari priorizou.",
    doNow: [
      "Comece pelos cards vermelhos (urgência).",
      "Use o botão WhatsApp para registrar contato automático.",
    ],
    tip: "A Mari recalcula a fila a cada 4 horas.",
    risk: "Ignorar cards vermelhos = SLA estoura, deal esfria e comprador some.",
  },
  "eb.diario": {
    purpose: "Seu diário de bordo. Escreva o plano do dia, veja o que rolou e o insight da Mari.",
    doNow: [
      "Comece escrevendo 1 linha do que importa hoje.",
      "Use @ para mencionar mandato, comprador ou empresa.",
    ],
    tip: "Salva sozinho a cada 2 segundos.",
    risk: "Sem diário a Mari não aprende seu padrão e as sugestões ficam genéricas.",
  },
  "eb.crm": {
    purpose: "Hub central do CRM. Vê mandatos, compradores, pipeline e atividades num lugar só.",
    doNow: [
      "Use os filtros do topo para focar num setor ou estágio.",
      "Clique em um mandato/comprador para abrir o 360.",
    ],
    tip: "Os números atualizam em tempo real.",
    risk: "Não usar os filtros = você se perde no volume e atende sempre os mesmos.",
  },
  "eb.mandato": {
    purpose: "Visão 360 do mandato (lado vendedor): documentos, matches, atividades, pipeline.",
    doNow: [
      "Confira os matches sugeridos pela Mari na aba Matches.",
      "Suba documentos faltantes para acelerar o deal.",
    ],
    tip: "Toda nota e atividade aqui alimenta o aprendizado da Mari.",
    risk: "Mandato sem documentos completos não aparece para os top buyers.",
  },
  "eb.buyer": {
    purpose: "Visão 360 do comprador: tese, histórico, matches recomendados.",
    doNow: [
      "Veja a tese declarada e os SHAP do match.",
      "Registre o contato no WhatsApp Bridge para a Mari aprender.",
    ],
    tip: "Quanto mais você marca like/skip nos matches, melhor a Mari fica.",
    risk: "Sem registrar contato a Mari recomenda os mesmos buyers que já recusaram.",
  },
  "eb.deal": {
    purpose: "Visão unificada do deal: vendedor à esquerda, match no meio, comprador à direita.",
    doNow: [
      "Leia o card 'Por quê esse match' (modo simples ou técnico).",
      "Mova o deal no pipeline conforme avança.",
    ],
    tip: "Mudar de estágio dispara aprendizado automático.",
    risk: "Deal parado em estágio errado distorce previsões de fechamento de todo o pipeline.",
  },
  "eb.pipeline": {
    purpose: "Kanban do pipeline de M&A. Onde cada deal está e há quanto tempo está parado.",
    doNow: [
      "Arraste cards entre colunas para atualizar o estágio.",
      "Cards com SLA estourado ficam destacados.",
    ],
    tip: "Tempo médio em cada estágio fica no topo da coluna.",
    risk: "Pipeline desatualizado = comitê vê números errados e cobra deal que já fechou.",
  },
  "eb.matches": {
    purpose: "Inbox de matches gerados pela Mari. Aprovados aqui viram propostas.",
    doNow: [
      "Filtre por score mínimo (recomendado: 70+).",
      "Aprove, recuse ou peça mais info — a Mari aprende com cada ação.",
    ],
    tip: "Use Ctrl+J/K para navegar rápido na lista.",
    risk: "Deixar match parado = comprador esfria e a Mari não consegue calibrar o modelo.",
  },
  "eb.exec": {
    purpose: "Dashboard executivo: faturamento, ticket médio, exclusividade, evolução anual.",
    doNow: [
      "Compare evolução mensal para ver tendência.",
      "Exporte para apresentação de comitê.",
    ],
    tip: "Os números são de M&A só. Captação tem dashboard próprio.",
    risk: "Sem olhar tendência você descobre tarde que o funil secou.",
  },
  "eb.match.analytics": {
    purpose: "Como a Mari está acertando. Conversão por origem, drift do modelo, top razões.",
    doNow: [
      "Veja taxa de conversão por estágio.",
      "Se o drift estiver alto, peça retreino ao admin.",
    ],
    tip: "Use isso semanalmente para validar a qualidade dos matches.",
    risk: "Drift alto sem retreino = matches começam a errar e ninguém percebe.",
  },
  "eb.imports": {
    purpose: "Suba .xlsx ou .csv para popular empresas, mandatos, compradores e atividades em lote.",
    doNow: [
      "Baixe o modelo, preencha e arraste para cá.",
      "Aguarde o processamento — pode levar até 2 min.",
    ],
    tip: "Erros aparecem linha a linha; corrija e suba de novo só as falhas.",
    risk: "Arquivo fora do modelo = todas as linhas falham e nada é importado.",
  },

  // ===== Onda 2 — EB restante =====
  "eb.calls": {
    purpose: "Histórico de chamadas registradas pelo WhatsApp Bridge.",
    doNow: ["Filtre por comprador ou mandato para encontrar uma conversa específica."],
    tip: "Calls feitos do WhatsApp Web ficam aqui automaticamente.",
    risk: "Sem registrar a call você perde rastro do que foi combinado.",
  },
  "eb.note-search": {
    purpose: "Busca em todas as notas que você escreveu (diário + entidades).",
    doNow: ["Digite uma palavra-chave ou nome de empresa."],
    tip: "Ranking por relevância textual em português.",
    risk: "Sem buscar antes você refaz contato repetido e parece amador.",
  },
  "eb.compradores": {
    purpose: "Lista completa de compradores ativos no banco.",
    doNow: ["Use filtros por setor, ticket e UF para encontrar quem importa."],
    risk: "Sem filtrar você liga para buyer fora de tese e queima o lead.",
  },
  "eb.mapa": {
    purpose: "Mapa visual de empresas e compradores no Brasil.",
    doNow: ["Use o painel lateral para filtrar por categoria/região.", "Clique no marcador para abrir a empresa."],
    tip: "Marcadores duplos = empresa e comprador no mesmo ponto.",
    risk: "Sem o mapa você perde oportunidades de cluster regional.",
  },
  "eb.grafo": {
    purpose: "Grafo de relacionamentos: empresas, compradores, mandatos e suas ligações.",
    doNow: ["Clique em um nó para destacar conexões."],
    tip: "Útil para descobrir compradores indiretos.",
    risk: "Sem o grafo você só vê o óbvio e ignora ligações de segundo grau.",
  },
  "eb.grafo.jarvis": {
    purpose: "Versão IA do grafo: a Mari sugere ligações ocultas entre empresas.",
    doNow: ["Aceite ou recuse cada sugestão. A Mari aprende com cada decisão."],
    risk: "Ignorar sugestões = a IA não evolui e continua oferecendo o mesmo.",
  },
  "eb.grafo.guia": {
    purpose: "Tutorial completo do grafo. Útil na primeira vez.",
    doNow: ["Leia uma vez, depois volte para o grafo principal."],
    risk: "Pular o guia = você usa o grafo só superficialmente.",
  },
  "eb.isp.import": {
    purpose: "Importar base ANATEL de ISPs (provedores de internet) para análise fria.",
    doNow: ["Suba o CSV oficial da ANATEL.", "Aguarde estatísticas serem calculadas."],
    tip: "Só admin/advisor sênior.",
    risk: "Arquivo errado = base ISP fica vazia e o mapa de mercado quebra.",
  },
  "eb.isp.market": {
    purpose: "Mapa de mercado de ISPs: concentração por cidade, UF e empresa.",
    doNow: ["Compare UFs para identificar oportunidades de consolidação."],
    risk: "Sem essa análise você não enxerga onde fazer roll-up.",
  },
  "eb.isp.suggestions": {
    purpose: "Sugestões da Mari para promover ISPs frios em mandatos quentes.",
    doNow: ["Aceite as sugestões boas; elas viram leads no CRM."],
    risk: "Ignorar = base ISP fica fria e o investimento ANATEL se perde.",
  },
  "eb.mandates-table": {
    purpose: "Tabela completa de mandatos. Ordenação, filtro e busca.",
    doNow: ["Clique no mandato para abrir o 360."],
    risk: "Sem ordenar por SLA você atende fora de prioridade.",
  },
  "eb.match-inbox": {
    purpose: "Inbox unificado de matches pendentes de revisão.",
    doNow: ["Trate em lote ou um a um."],
    risk: "Caixa cheia = matches envelhecem e perdem relevância.",
  },
  "eb.match-detail": {
    purpose: "Detalhe técnico de 1 match: SHAP, score, histórico.",
    doNow: ["Use o toggle simples/técnico conforme público."],
    risk: "Sem ler os SHAP você não justifica o match para o comprador.",
  },
  "eb.exports": {
    purpose: "Exportar dados (mandatos, compradores, atividades) em .xlsx ou .csv.",
    doNow: ["Escolha o tipo e clique em Exportar."],
    risk: "Exportar sem filtrar gera planilha gigante que ninguém analisa.",
  },
  "eb.disclosures": {
    purpose: "Histórico de revelações de identidade (LGPD). Toda vez que um teaser cego vira identificado.",
    doNow: ["Audite ações suspeitas."],
    tip: "Logs aqui são imutáveis para compliance.",
    risk: "Não auditar = vazamento de identidade passa em branco e vira problema legal.",
  },
  "eb.permissions": {
    purpose: "Gerencia papéis e permissões dos usuários do CRM.",
    doNow: ["Atribua role (admin, advisor, etc) e clique em salvar."],
    risk: "Role errada dá acesso a dado sensível para quem não devia.",
  },
  "eb.health": {
    purpose: "Saúde técnica do sistema: edge functions, latência, erros recentes.",
    doNow: ["Monitore semanalmente.", "Se ver vermelho, chame o time técnico."],
    risk: "Ignorar alertas = sistema cai sem aviso em horário crítico.",
  },
  "eb.coverage": {
    purpose: "Cobertura de dados por região/setor. Onde o banco está fraco.",
    doNow: ["Identifique gaps e priorize aquisição de dados."],
    risk: "Sem cobrir gaps você oferece deals fracos em região mal coberta.",
  },
  "eb.shadow": {
    purpose: "Operação shadow: comparar v1 vs v2 do motor de matches em paralelo.",
    doNow: ["Avalie convergência antes de promover v2."],
    tip: "Só admin.",
    risk: "Promover v2 sem shadow = quebra de matches em produção.",
  },
  "eb.tag": {
    purpose: "Gerenciar tags de empresas, compradores e mandatos.",
    doNow: ["Crie tag, atribua, use no filtro do CRM."],
    risk: "Sem tags você não consegue segmentar campanhas no futuro.",
  },
  "eb.teses": {
    purpose: "Teses de investimento cadastradas dos compradores.",
    doNow: ["Edite uma tese para refinar matches dela."],
    risk: "Tese desatualizada = Mari sugere deals fora do apetite atual do buyer.",
  },
  "eb.news": {
    purpose: "Feed de notícias setoriais relevantes para os mandatos abertos.",
    doNow: ["Use como gatilho de contato com o comprador."],
    risk: "Ignorar = você perde momento de mercado para abrir conversa.",
  },
  "eb.propostas": {
    purpose: "Propostas formais enviadas: status, valor, retorno.",
    doNow: ["Atualize status quando o cliente responder."],
    risk: "Status não atualizado = forecast do comitê vira fantasia.",
  },
  "eb.quick-fill": {
    purpose: "Cadastro rápido de empresa via CNPJ. Mari preenche o resto.",
    doNow: ["Cole o CNPJ e confira os dados antes de salvar."],
    risk: "Salvar sem conferir traz CNAE errado e mata os matches dessa empresa.",
  },
  "eb.my-companies": {
    purpose: "Empresas atribuídas a você como advisor responsável.",
    doNow: ["Priorize as com SLA vencendo."],
    risk: "SLA vencido = empresa muda de mãos ou perde exclusividade.",
  },
  "eb.buyers-list": {
    purpose: "Lista de buyers (área M&A pesada).",
    doNow: ["Use busca + filtros de tese."],
    risk: "Sem filtrar você abre conversa com buyer fora de mandato.",
  },
  "eb.mandate-form": {
    purpose: "Criar ou editar mandato (lado vendedor).",
    doNow: ["Preencha setor, ticket e drivers. Salve.", "Documentos sobem em outra tela."],
    risk: "Mandato com campos vagos não aparece em match nenhum.",
  },
  "eb.crm-assignments": {
    purpose: "Atribuir mandatos/compradores a advisors específicos.",
    doNow: ["Arraste ou clique em 'Atribuir'."],
    risk: "Sem dono = lead fica órfão e ninguém liga.",
  },
  "eb.crm-audit": {
    purpose: "Log de alterações do CRM (quem mudou o quê e quando).",
    doNow: ["Use em caso de dúvida ou auditoria."],
    risk: "Sem auditar você não rastreia mudanças suspeitas.",
  },
  "eb.access-audit": {
    purpose: "Log de acessos a dados sensíveis (identidade revelada, docs baixados).",
    doNow: ["Use para compliance LGPD."],
    risk: "Acesso indevido não detectado = multa LGPD.",
  },
  "eb.dedupe": {
    purpose: "Mesclar duplicatas de empresa/comprador.",
    doNow: ["Confirme o par de duplicatas e mescle."],
    tip: "Operação é irreversível.",
    risk: "Duplicatas = matches divididos, score baixo e dois advisors falando com o mesmo buyer.",
  },
  "eb.oportunidades": {
    purpose: "Lista de oportunidades quentes (com score acima do threshold).",
    doNow: ["Atue nas top 5 do dia."],
    risk: "Oportunidade quente esfria em 48h se ninguém liga.",
  },
  "eb.oportunidades-andamento": {
    purpose: "Oportunidades já em negociação.",
    doNow: ["Acompanhe SLA e próximo passo."],
    risk: "Sem acompanhar = deal trava no meio do funil.",
  },
  "eb.pipeline-history": {
    purpose: "Histórico de transições de pipeline: tempo em cada estágio.",
    doNow: ["Use para identificar gargalos no funil."],
    risk: "Sem olhar histórico você não enxerga onde o funil está furando.",
  },
  "eb.anatel.cruzamento": {
    purpose: "Cruzamento entre base ANATEL e CRM para identificar oportunidades de M&A em ISPs.",
    doNow: ["Veja ISPs com fit alto e promova para mandato."],
    risk: "Sem cruzar você desperdiça base ANATEL paga.",
  },

  // ===== Onda 3 — Seller + Admin =====
  "vender": {
    purpose: "Wizard de cadastro do seu negócio em 4 passos. Em 10 minutos seu anúncio fica pronto.",
    doNow: [
      "Preencha cada passo. Pode salvar e voltar depois.",
      "Use codinome — seu nome não aparece para visitantes.",
    ],
    tip: "Anúncio Master tem 20 fotos, vídeo e destaque na home.",
    risk: "Wizard incompleto = anúncio não publica e fica fora dos matches.",
  },
  "meus-anuncios": {
    purpose: "Seus anúncios ativos: status, visualizações, interessados.",
    doNow: [
      "Clique em um anúncio para ver detalhes e editar.",
      "Anúncios com 0 visualizações pedem melhorias.",
    ],
    risk: "Anúncio sem revisão semanal perde posição na vitrine.",
  },
  "meus-anuncios.detalhe": {
    purpose: "Cockpit do seu anúncio: visualizações, leads, documentos, matches.",
    doNow: [
      "Suba os documentos pedidos no checklist.",
      "Quanto mais completo, mais cedo aparece nos matches.",
    ],
    risk: "Checklist incompleto = comprador sério não avança no contato.",
  },
  "matching": {
    purpose: "Compradores compatíveis com seu negócio.",
    doNow: [
      "Veja os 3 primeiros — são os mais aderentes.",
      "Clique para ver tese e enviar mensagem.",
    ],
    risk: "Não responder em 48h = comprador procura outro do setor.",
  },
  "captacao": {
    purpose: "Captação de capital: dívida, equity ou misto.",
    doNow: [
      "Use a calculadora para estimar aprovação e taxa.",
      "Preencha o pedido para receber propostas.",
    ],
    risk: "Pedido com dados vagos = banco recusa antes de analisar.",
  },
  "perfil": {
    purpose: "Seus dados, selos, missões e nível na plataforma.",
    doNow: [
      "Complete as 4 missões para subir de nível.",
      "Ative MFA na seção de segurança.",
    ],
    risk: "Perfil incompleto reduz confiança do comprador e bloqueia recursos premium.",
  },
  "valuation": {
    purpose: "Calcule o valor do seu negócio. Múltiplos, DCF e diagnóstico True Value.",
    doNow: [
      "Escolha o método que melhor encaixa.",
      "Salva no histórico — pode comparar versões.",
    ],
    risk: "Valuation errado faz você pedir caro demais (não vende) ou barato demais (perde grana).",
  },
  "mari": {
    purpose: "Calculadora pública: digite o CNPJ e veja a melhor janela de venda em 12 meses.",
    doNow: ["Cole o CNPJ, clique em Calcular."],
    tip: "Gera análise sem precisar cadastro.",
    risk: "Sem checar a janela você vende fora do melhor momento de mercado.",
  },
  "admin.aprovacoes": {
    purpose: "Aprovar pedidos pendentes de advisor e franchisee.",
    doNow: [
      "Confira documentação anexada.",
      "Aprove ou recuse com justificativa.",
    ],
    risk: "Aprovar sem checar = vira problema legal e de comissionamento.",
  },
  "admin.usuarios": {
    purpose: "Gerenciar todos os usuários, roles e status.",
    doNow: ["Use a busca para encontrar e edite a role."],
    risk: "Role errada concede acesso indevido a dados sensíveis.",
  },
  "admin.listings": {
    purpose: "Moderação de anúncios: aprovar, pausar, remover.",
    doNow: ["Trate primeiro os pendentes."],
    risk: "Anúncio pendente parado = vendedor desiste e some.",
  },
  "admin.integrations": {
    purpose: "Configurar integrações externas (WhatsApp, BrasilAPI, Stripe).",
    doNow: ["Veja status e clique em reconectar se vermelho."],
    risk: "Integração caída = features quebram silenciosamente.",
  },
  "admin.health": {
    purpose: "Saúde geral: edge functions, fila de jobs, erros.",
    doNow: ["Olhe semanalmente."],
    risk: "Sem monitorar = problema vira incêndio.",
  },
  "admin.api-costs": {
    purpose: "Custos de API por provedor (OpenAI, Gemini, BrasilAPI).",
    doNow: ["Compare custo por feature para otimizar."],
    risk: "Custo descontrolado consome margem.",
  },
  "admin.franchisees": {
    purpose: "Gestão de franqueados: região, comissão, performance.",
    doNow: ["Aprove pedidos e defina região-livre."],
    risk: "Região mal definida gera conflito de comissão.",
  },
  "admin.partners": {
    purpose: "Parceiros contábeis e seus indicados.",
    doNow: ["Veja métricas de origem e comissão devida."],
    risk: "Comissão não paga = parceiro para de indicar.",
  },

  // ===== Adicionais Seller =====
  "marketplace": {
    purpose: "Vitrine pública de negócios à venda.",
    doNow: ["Use os filtros para achar setor/região/ticket."],
    risk: "Sem filtrar você se perde em centenas de anúncios.",
  },
  "listing-detail": {
    purpose: "Página do anúncio: fotos, KPIs, contato.",
    doNow: ["Leia o teaser inteiro antes de clicar em 'Tenho interesse'."],
    risk: "Manifestar interesse sem ler gera lead frio que vendedor recusa.",
  },
  "blind-teaser": {
    purpose: "Teaser cego: KPIs do negócio sem revelar identidade.",
    doNow: ["Solicite identidade via formulário; advisor aprova manualmente."],
    risk: "Pedir sem qualificar = advisor recusa o disclosure.",
  },
  "matching-buyers": {
    purpose: "Buyers compatíveis com o seu negócio (lado seller).",
    doNow: ["Aceite contatar e mande mensagem."],
    risk: "Não responder = match expira em 7 dias.",
  },
  "register-buyer": {
    purpose: "Cadastro como comprador: tese, ticket, setores.",
    doNow: ["Preencha a tese com clareza. Quanto mais específico, melhor o match."],
    risk: "Tese vaga = Mari manda deals fora do apetite.",
  },
  "my-valuations": {
    purpose: "Histórico dos seus valuations.",
    doNow: ["Compare versões para ver evolução."],
    risk: "Sem revisitar você perde o argumento numérico na negociação.",
  },
  "valuation-multiplos": {
    purpose: "Valuation por múltiplos setoriais.",
    doNow: ["Preencha EBITDA e faturamento reais."],
    risk: "Dados chutados geram valor irreal e quebram a negociação.",
  },
  "valuation-dcf": {
    purpose: "Valuation por DCF (fluxo de caixa descontado).",
    doNow: ["Projete 5 anos com premissas conservadoras."],
    risk: "Premissa otimista demais = comprador desconfia e abandona.",
  },
  "valuation-certifier": {
    purpose: "Audita um valuation feito por terceiros.",
    doNow: ["Cole os números recebidos e veja a divergência."],
    risk: "Aceitar valuation de terceiro sem auditar = você vende abaixo do valor justo.",
  },
  "capital": {
    purpose: "Hub de captação: simulação, propostas, casos.",
    doNow: ["Comece pela calculadora para entender taxa esperada."],
    risk: "Pedir sem simular = você aceita taxa pior do que o mercado dá.",
  },
  "capital-request-detail": {
    purpose: "Pedido de captação ativo: propostas recebidas, status.",
    doNow: ["Compare as propostas antes de aceitar."],
    risk: "Aceitar a primeira = perde melhor taxa de quem propôs depois.",
  },
  "my-capital-requests": {
    purpose: "Seus pedidos de captação ativos.",
    doNow: ["Veja status de cada um."],
    risk: "Pedido parado sem atualização = banco descarta.",
  },
  "partner-dashboard": {
    purpose: "Painel do parceiro contábil/financeiro.",
    doNow: ["Veja indicados e comissão acumulada."],
    risk: "Indicado sem follow-up = você não recebe comissão.",
  },
  "portfolio-potential": {
    purpose: "Potencial de receita consolidando sua carteira.",
    doNow: ["Use para definir oferta de consultoria."],
    risk: "Sem usar você não enxerga o tamanho real da carteira.",
  },
  "investors": {
    purpose: "Landing page de investidores.",
    doNow: ["Use para apresentar o produto."],
  },
  "mapview": {
    purpose: "Mapa público de empresas à venda.",
    doNow: ["Filtre por categoria e clique no marcador."],
    risk: "Sem filtrar a região, o mapa fica poluído.",
  },
  "edit-listing": {
    purpose: "Editar anúncio existente.",
    doNow: ["Atualize KPIs trimestralmente."],
    risk: "Anúncio com dado velho perde credibilidade.",
  },
  "listing-cockpit": {
    purpose: "Cockpit do anúncio: tudo num só lugar.",
    doNow: ["Suba documentos, responda leads, veja analytics."],
    risk: "Cockpit ignorado = anúncio vira fantasma.",
  },
  "matching-results": {
    purpose: "Resultados da busca de matching.",
    doNow: ["Veja top 3, leia a tese, contate."],
    risk: "Não contatar = match expira sem nenhuma conversa.",
  },
  "awaiting-approval": {
    purpose: "Você cadastrou advisor/franchisee e está aguardando aprovação do admin.",
    doNow: ["Aguarde o e-mail de confirmação. Em 24h normalmente sai."],
    risk: "Sem documentos completos a aprovação demora ou é recusada.",
  },
  "reset-password": {
    purpose: "Definir nova senha após receber e-mail de recuperação.",
    doNow: ["Use senha forte (10+ caracteres, números e símbolos)."],
    risk: "Senha fraca = conta invadida e dados expostos.",
  },
  "payment-success": {
    purpose: "Pagamento confirmado.",
    doNow: ["Aguarde 1 min para o plano ativar."],
  },
};

/* ============================================================================
 *  SECTION_GUIDES — chave por bloco interno (pageKey + . + bloco)
 * ========================================================================== */
export const SECTION_GUIDES: Record<string, Guide> = {
  // Painel
  "painel.cockpit": {
    purpose: "Resumo da semana em 5 cards: janela, compradores, próximo passo, insight Mari, mercado.",
    doNow: ["Comece pela esquerda. Cada card tem uma ação."],
    risk: "Ignorar os cards = você opera no escuro essa semana.",
  },
  "painel.executive-report": {
    purpose: "Tri-card de valuation (hoje · 2027 · delta) + projeção setorial 5 anos.",
    doNow: ["Compare hoje vs 2027 para definir o timing."],
    risk: "Sem comparar você vende em pico errado e deixa dinheiro na mesa.",
  },
  // Hoje
  "eb.hoje.feed": {
    purpose: "Lista de até 7 cards ordenados pela Mari.",
    doNow: ["Trate de cima pra baixo."],
    risk: "Pular a ordem = você atende o fácil e ignora o urgente.",
  },
  "eb.hoje.bridge": {
    purpose: "Botão que abre o WhatsApp já com o contato certo e registra a atividade.",
    doNow: ["Clique, mande mensagem, volte. Pronto."],
    risk: "Mandar pelo WhatsApp normal = atividade não registra e Mari não aprende.",
  },
  // Diário
  "eb.diario.mari": {
    purpose: "O insight do dia da Mari. Gerado todo dia às 06h.",
    doNow: ["Leia antes de começar o dia."],
    risk: "Sem ler o insight você ignora a melhor janela do dia.",
  },
  "eb.diario.atividades": {
    purpose: "Tudo que você (e seu time) fez hoje: ligações, mensagens, notas.",
    doNow: ["Use para revisar o dia."],
    risk: "Sem revisar = perde compromisso prometido em call.",
  },
  "eb.diario.notas": {
    purpose: "Notas que você criou em outras entidades hoje.",
    doNow: ["Clique para abrir a entidade."],
    risk: "Nota perdida = você esquece o que combinou.",
  },
  "eb.diario.deals": {
    purpose: "Deals que mudaram de estágio hoje.",
    doNow: ["Confira se a movimentação está correta."],
    risk: "Estágio errado quebra o forecast.",
  },
  "eb.diario.ai": {
    purpose: "Runs da Mari executados hoje: o que processou, o que falhou.",
    doNow: ["Se ver erros, reporte ao time técnico."],
    risk: "Ignorar erros = Mari para de gerar matches sem aviso.",
  },
  // Deal unificado
  "eb.deal.seller": {
    purpose: "Tudo sobre o vendedor: empresa, drivers, documentos.",
    doNow: ["Atualize informações faltantes."],
    risk: "Vendedor incompleto = comprador desiste no due diligence.",
  },
  "eb.deal.match": {
    purpose: "Por quê esse buyer combina com esse seller (modo simples ou técnico).",
    doNow: ["Use o toggle simples/técnico conforme público."],
    risk: "Sem entender o match você não defende o deal no comitê.",
  },
  "eb.deal.buyer": {
    purpose: "Tudo sobre o comprador: tese, histórico, contatos.",
    doNow: ["Registre toda interação."],
    risk: "Sem registro = Mari não aprende e sugere o mesmo de novo.",
  },
  // Pipeline
  "eb.pipeline.column": {
    purpose: "Cada coluna é um estágio. Topo mostra tempo médio e qtd.",
    doNow: ["Arraste card para mover de estágio."],
    risk: "Coluna parada = gargalo invisível no funil.",
  },
  // Match Inbox
  "eb.matches.filters": {
    purpose: "Filtra por score mínimo, setor, UF e status.",
    doNow: ["Comece com score 70+, depois afine."],
    risk: "Sem filtro você trata match fraco e perde tempo.",
  },
  // Imports
  "eb.imports.upload": {
    purpose: "Arraste .xlsx ou .csv aqui.",
    doNow: ["Use o modelo correto para evitar erro de coluna."],
    risk: "Modelo errado = 100% das linhas falham.",
  },
  "eb.imports.status": {
    purpose: "Status de cada upload: processando, ok, com erros.",
    doNow: ["Clique em erros para ver linhas problemáticas."],
    risk: "Sem corrigir erros = base fica parcial e matches saem incompletos.",
  },
  // ISP
  "eb.isp.import.zone": {
    purpose: "Upload do CSV ANATEL.",
    doNow: ["Use só o arquivo oficial da ANATEL."],
    risk: "Arquivo modificado = parser quebra silenciosamente.",
  },
  // Wizard /vender
  "vender.step1": {
    purpose: "Sobre o negócio: setor, ano, descrição.",
    doNow: ["Seja específico no setor para melhor match."],
    risk: "Setor genérico = anúncio cai em buyers fora do apetite.",
  },
  "vender.step2": {
    purpose: "Financeiro: faturamento, lucro, valor pedido.",
    doNow: ["Dados reais; vendedor sério convence."],
    risk: "Número inflado = comprador descobre no DD e desiste.",
  },
  "vender.step3": {
    purpose: "Localização e imagens.",
    doNow: ["Master = 20 fotos. Basic = 5."],
    risk: "Poucas fotos = anúncio tem 60% menos visualização.",
  },
  "vender.step4": {
    purpose: "Revisar e publicar.",
    doNow: ["Confira o codinome — é o que aparece público."],
    risk: "Publicar com dado errado = você fica exposto no marketplace.",
  },
  // Captação
  "captacao.lead-score": {
    purpose: "Score de aprovação estimado: 0–100.",
    doNow: ["Acima de 70 = boa chance de aprovação."],
    risk: "Score baixo sem ajustar dados = banco recusa direto.",
  },
  // Admin aprovações
  "admin.aprovacoes.pending": {
    purpose: "Pedidos aguardando sua decisão.",
    doNow: ["Trate em ordem de antiguidade."],
    risk: "Pedido antigo parado = candidato desiste.",
  },
  "admin.aprovacoes.history": {
    purpose: "Histórico de aprovações/recusas.",
    doNow: ["Útil para auditoria."],
    risk: "Sem histórico documentado = recusa pode ser contestada.",
  },
};

export function getPageGuide(key?: string): Guide | undefined {
  if (!key) return undefined;
  return PAGE_GUIDES[key];
}

export function getSectionGuide(key?: string): Guide | undefined {
  if (!key) return undefined;
  return SECTION_GUIDES[key];
}
