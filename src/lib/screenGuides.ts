/**
 * Catálogo de guias por tela — tom curto e direto, pt-BR.
 * Cada guia tem: pra que serve, o que fazer agora, dica.
 * Editado em código para revisão fácil via PR.
 */

export type Guide = {
  purpose: string;
  doNow: string[];
  tip?: string;
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
  },
  "eb.hoje": {
    purpose: "Sua lista do dia: quem ligar, quem cobrar, o que a Mari priorizou.",
    doNow: [
      "Comece pelos cards vermelhos (urgência).",
      "Use o botão WhatsApp para registrar contato automático.",
    ],
    tip: "A Mari recalcula a fila a cada 4 horas.",
  },
  "eb.diario": {
    purpose: "Seu diário de bordo. Escreva o plano do dia, veja o que rolou e o insight da Mari.",
    doNow: [
      "Comece escrevendo 1 linha do que importa hoje.",
      "Use @ para mencionar mandato, comprador ou empresa.",
    ],
    tip: "Salva sozinho a cada 2 segundos.",
  },
  "eb.crm": {
    purpose: "Hub central do CRM. Vê mandatos, compradores, pipeline e atividades num lugar só.",
    doNow: [
      "Use os filtros do topo para focar num setor ou estágio.",
      "Clique em um mandato/comprador para abrir o 360.",
    ],
    tip: "Os números atualizam em tempo real.",
  },
  "eb.mandato": {
    purpose: "Visão 360 do mandato (lado vendedor): documentos, matches, atividades, pipeline.",
    doNow: [
      "Confira os matches sugeridos pela Mari na aba Matches.",
      "Suba documentos faltantes para acelerar o deal.",
    ],
    tip: "Toda nota e atividade aqui alimenta o aprendizado da Mari.",
  },
  "eb.buyer": {
    purpose: "Visão 360 do comprador: tese, histórico, matches recomendados.",
    doNow: [
      "Veja a tese declarada e os SHAP do match.",
      "Registre o contato no WhatsApp Bridge para a Mari aprender.",
    ],
    tip: "Quanto mais você marca like/skip nos matches, melhor a Mari fica.",
  },
  "eb.deal": {
    purpose: "Visão unificada do deal: vendedor à esquerda, match no meio, comprador à direita.",
    doNow: [
      "Leia o card 'Por quê esse match' (modo simples ou técnico).",
      "Mova o deal no pipeline conforme avança.",
    ],
    tip: "Mudar de estágio dispara aprendizado automático.",
  },
  "eb.pipeline": {
    purpose: "Kanban do pipeline de M&A. Onde cada deal está e há quanto tempo está parado.",
    doNow: [
      "Arraste cards entre colunas para atualizar o estágio.",
      "Cards com SLA estourado ficam destacados.",
    ],
    tip: "Tempo médio em cada estágio fica no topo da coluna.",
  },
  "eb.matches": {
    purpose: "Inbox de matches gerados pela Mari. Aprovados aqui viram propostas.",
    doNow: [
      "Filtre por score mínimo (recomendado: 70+).",
      "Aprove, recuse ou peça mais info — a Mari aprende com cada ação.",
    ],
    tip: "Use Ctrl+J/K para navegar rápido na lista.",
  },
  "eb.exec": {
    purpose: "Dashboard executivo: faturamento, ticket médio, exclusividade, evolução anual.",
    doNow: [
      "Compare evolução mensal para ver tendência.",
      "Exporte para apresentação de comitê.",
    ],
    tip: "Os números são de M&A só. Captação tem dashboard próprio.",
  },
  "eb.match.analytics": {
    purpose: "Como a Mari está acertando. Conversão por origem, drift do modelo, top razões.",
    doNow: [
      "Veja taxa de conversão por estágio.",
      "Se o drift estiver alto, peça retreino ao admin.",
    ],
    tip: "Use isso semanalmente para validar a qualidade dos matches.",
  },
  "eb.imports": {
    purpose: "Suba .xlsx ou .csv para popular empresas, mandatos, compradores e atividades em lote.",
    doNow: [
      "Baixe o modelo, preencha e arraste para cá.",
      "Aguarde o processamento — pode levar até 2 min.",
    ],
    tip: "Erros aparecem linha a linha; corrija e suba de novo só as falhas.",
  },

  // ===== Onda 2 — EB restante =====
  "eb.calls": {
    purpose: "Histórico de chamadas registradas pelo WhatsApp Bridge.",
    doNow: ["Filtre por comprador ou mandato para encontrar uma conversa específica."],
    tip: "Calls feitos do WhatsApp Web ficam aqui automaticamente.",
  },
  "eb.note-search": {
    purpose: "Busca em todas as notas que você escreveu (diário + entidades).",
    doNow: ["Digite uma palavra-chave ou nome de empresa."],
    tip: "Ranking por relevância textual em português.",
  },
  "eb.compradores": {
    purpose: "Lista completa de compradores ativos no banco.",
    doNow: ["Use filtros por setor, ticket e UF para encontrar quem importa."],
  },
  "eb.mapa": {
    purpose: "Mapa visual de empresas e compradores no Brasil.",
    doNow: ["Use o painel lateral para filtrar por categoria/região.", "Clique no marcador para abrir a empresa."],
    tip: "Marcadores duplos = empresa e comprador no mesmo ponto.",
  },
  "eb.grafo": {
    purpose: "Grafo de relacionamentos: empresas, compradores, mandatos e suas ligações.",
    doNow: ["Clique em um nó para destacar conexões."],
    tip: "Útil para descobrir compradores indiretos.",
  },
  "eb.grafo.jarvis": {
    purpose: "Versão IA do grafo: a Mari sugere ligações ocultas entre empresas.",
    doNow: ["Aceite ou recuse cada sugestão. A Mari aprende com cada decisão."],
  },
  "eb.grafo.guia": {
    purpose: "Tutorial completo do grafo. Útil na primeira vez.",
    doNow: ["Leia uma vez, depois volte para o grafo principal."],
  },
  "eb.isp.import": {
    purpose: "Importar base ANATEL de ISPs (provedores de internet) para análise fria.",
    doNow: ["Suba o CSV oficial da ANATEL.", "Aguarde estatísticas serem calculadas."],
    tip: "Só admin/advisor sênior.",
  },
  "eb.isp.market": {
    purpose: "Mapa de mercado de ISPs: concentração por cidade, UF e empresa.",
    doNow: ["Compare UFs para identificar oportunidades de consolidação."],
  },
  "eb.isp.suggestions": {
    purpose: "Sugestões da Mari para promover ISPs frios em mandatos quentes.",
    doNow: ["Aceite as sugestões boas; elas viram leads no CRM."],
  },
  "eb.mandates-table": {
    purpose: "Tabela completa de mandatos. Ordenação, filtro e busca.",
    doNow: ["Clique no mandato para abrir o 360."],
  },
  "eb.match-inbox": {
    purpose: "Inbox unificado de matches pendentes de revisão.",
    doNow: ["Trate em lote ou um a um."],
  },
  "eb.match-detail": {
    purpose: "Detalhe técnico de 1 match: SHAP, score, histórico.",
    doNow: ["Use o toggle simples/técnico conforme público."],
  },
  "eb.exports": {
    purpose: "Exportar dados (mandatos, compradores, atividades) em .xlsx ou .csv.",
    doNow: ["Escolha o tipo e clique em Exportar."],
  },
  "eb.disclosures": {
    purpose: "Histórico de revelações de identidade (LGPD). Toda vez que um teaser cego vira identificado.",
    doNow: ["Audite ações suspeitas."],
    tip: "Logs aqui são imutáveis para compliance.",
  },
  "eb.permissions": {
    purpose: "Gerencia papéis e permissões dos usuários do CRM.",
    doNow: ["Atribua role (admin, advisor, etc) e clique em salvar."],
  },
  "eb.health": {
    purpose: "Saúde técnica do sistema: edge functions, latência, erros recentes.",
    doNow: ["Monitore semanalmente.", "Se ver vermelho, chame o time técnico."],
  },
  "eb.coverage": {
    purpose: "Cobertura de dados por região/setor. Onde o banco está fraco.",
    doNow: ["Identifique gaps e priorize aquisição de dados."],
  },
  "eb.shadow": {
    purpose: "Operação shadow: comparar v1 vs v2 do motor de matches em paralelo.",
    doNow: ["Avalie convergência antes de promover v2."],
    tip: "Só admin.",
  },
  "eb.tag": {
    purpose: "Gerenciar tags de empresas, compradores e mandatos.",
    doNow: ["Crie tag, atribua, use no filtro do CRM."],
  },
  "eb.teses": {
    purpose: "Teses de investimento cadastradas dos compradores.",
    doNow: ["Edite uma tese para refinar matches dela."],
  },
  "eb.news": {
    purpose: "Feed de notícias setoriais relevantes para os mandatos abertos.",
    doNow: ["Use como gatilho de contato com o comprador."],
  },
  "eb.propostas": {
    purpose: "Propostas formais enviadas: status, valor, retorno.",
    doNow: ["Atualize status quando o cliente responder."],
  },
  "eb.quick-fill": {
    purpose: "Cadastro rápido de empresa via CNPJ. Mari preenche o resto.",
    doNow: ["Cole o CNPJ e confira os dados antes de salvar."],
  },
  "eb.my-companies": {
    purpose: "Empresas atribuídas a você como advisor responsável.",
    doNow: ["Priorize as com SLA vencendo."],
  },
  "eb.buyers-list": {
    purpose: "Lista de buyers (área M&A pesada).",
    doNow: ["Use busca + filtros de tese."],
  },
  "eb.mandate-form": {
    purpose: "Criar ou editar mandato (lado vendedor).",
    doNow: ["Preencha setor, ticket e drivers. Salve.", "Documentos sobem em outra tela."],
  },
  "eb.crm-assignments": {
    purpose: "Atribuir mandatos/compradores a advisors específicos.",
    doNow: ["Arraste ou clique em 'Atribuir'."],
  },
  "eb.crm-audit": {
    purpose: "Log de alterações do CRM (quem mudou o quê e quando).",
    doNow: ["Use em caso de dúvida ou auditoria."],
  },
  "eb.access-audit": {
    purpose: "Log de acessos a dados sensíveis (identidade revelada, docs baixados).",
    doNow: ["Use para compliance LGPD."],
  },
  "eb.dedupe": {
    purpose: "Mesclar duplicatas de empresa/comprador.",
    doNow: ["Confirme o par de duplicatas e mescle."],
    tip: "Operação é irreversível.",
  },
  "eb.oportunidades": {
    purpose: "Lista de oportunidades quentes (com score acima do threshold).",
    doNow: ["Atue nas top 5 do dia."],
  },
  "eb.oportunidades-andamento": {
    purpose: "Oportunidades já em negociação.",
    doNow: ["Acompanhe SLA e próximo passo."],
  },
  "eb.pipeline-history": {
    purpose: "Histórico de transições de pipeline: tempo em cada estágio.",
    doNow: ["Use para identificar gargalos no funil."],
  },

  // ===== Onda 3 — Seller + Admin =====
  "vender": {
    purpose: "Wizard de cadastro do seu negócio em 4 passos. Em 10 minutos seu anúncio fica pronto.",
    doNow: [
      "Preencha cada passo. Pode salvar e voltar depois.",
      "Use codinome — seu nome não aparece para visitantes.",
    ],
    tip: "Anúncio Master tem 20 fotos, vídeo e destaque na home.",
  },
  "meus-anuncios": {
    purpose: "Seus anúncios ativos: status, visualizações, interessados.",
    doNow: [
      "Clique em um anúncio para ver detalhes e editar.",
      "Anúncios com 0 visualizações pedem melhorias.",
    ],
  },
  "meus-anuncios.detalhe": {
    purpose: "Cockpit do seu anúncio: visualizações, leads, documentos, matches.",
    doNow: [
      "Suba os documentos pedidos no checklist.",
      "Quanto mais completo, mais cedo aparece nos matches.",
    ],
  },
  "matching": {
    purpose: "Compradores compatíveis com seu negócio.",
    doNow: [
      "Veja os 3 primeiros — são os mais aderentes.",
      "Clique para ver tese e enviar mensagem.",
    ],
  },
  "captacao": {
    purpose: "Captação de capital: dívida, equity ou misto.",
    doNow: [
      "Use a calculadora para estimar aprovação e taxa.",
      "Preencha o pedido para receber propostas.",
    ],
  },
  "perfil": {
    purpose: "Seus dados, selos, missões e nível na plataforma.",
    doNow: [
      "Complete as 4 missões para subir de nível.",
      "Ative MFA na seção de segurança.",
    ],
  },
  "valuation": {
    purpose: "Calcule o valor do seu negócio. Múltiplos, DCF e diagnóstico True Value.",
    doNow: [
      "Escolha o método que melhor encaixa.",
      "Salva no histórico — pode comparar versões.",
    ],
  },
  "mari": {
    purpose: "Calculadora pública: digite o CNPJ e veja a melhor janela de venda em 12 meses.",
    doNow: ["Cole o CNPJ, clique em Calcular."],
    tip: "Gera análise sem precisar cadastro.",
  },
  "admin.aprovacoes": {
    purpose: "Aprovar pedidos pendentes de advisor e franchisee.",
    doNow: [
      "Confira documentação anexada.",
      "Aprove ou recuse com justificativa.",
    ],
  },
  "admin.usuarios": {
    purpose: "Gerenciar todos os usuários, roles e status.",
    doNow: ["Use a busca para encontrar e edite a role."],
  },
  "admin.listings": {
    purpose: "Moderação de anúncios: aprovar, pausar, remover.",
    doNow: ["Trate primeiro os pendentes."],
  },
  "admin.integrations": {
    purpose: "Configurar integrações externas (WhatsApp, BrasilAPI, Stripe).",
    doNow: ["Veja status e clique em reconectar se vermelho."],
  },
  "admin.health": {
    purpose: "Saúde geral: edge functions, fila de jobs, erros.",
    doNow: ["Olhe semanalmente."],
  },
  "admin.api-costs": {
    purpose: "Custos de API por provedor (OpenAI, Gemini, BrasilAPI).",
    doNow: ["Compare custo por feature para otimizar."],
  },
  "admin.franchisees": {
    purpose: "Gestão de franqueados: região, comissão, performance.",
    doNow: ["Aprove pedidos e defina região-livre."],
  },
  "admin.partners": {
    purpose: "Parceiros contábeis e seus indicados.",
    doNow: ["Veja métricas de origem e comissão devida."],
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
  },
  "painel.executive-report": {
    purpose: "Tri-card de valuation (hoje · 2027 · delta) + projeção setorial 5 anos.",
    doNow: ["Compare hoje vs 2027 para definir o timing."],
  },
  // Hoje
  "eb.hoje.feed": {
    purpose: "Lista de até 7 cards ordenados pela Mari.",
    doNow: ["Trate de cima pra baixo."],
  },
  "eb.hoje.bridge": {
    purpose: "Botão que abre o WhatsApp já com o contato certo e registra a atividade.",
    doNow: ["Clique, mande mensagem, volte. Pronto."],
  },
  // Diário
  "eb.diario.mari": {
    purpose: "O insight do dia da Mari. Gerado todo dia às 06h.",
    doNow: ["Leia antes de começar o dia."],
  },
  "eb.diario.atividades": {
    purpose: "Tudo que você (e seu time) fez hoje: ligações, mensagens, notas.",
    doNow: ["Use para revisar o dia."],
  },
  "eb.diario.notas": {
    purpose: "Notas que você criou em outras entidades hoje.",
    doNow: ["Clique para abrir a entidade."],
  },
  "eb.diario.deals": {
    purpose: "Deals que mudaram de estágio hoje.",
    doNow: ["Confira se a movimentação está correta."],
  },
  "eb.diario.ai": {
    purpose: "Runs da Mari executados hoje: o que processou, o que falhou.",
    doNow: ["Se ver erros, reporte ao time técnico."],
  },
  // Deal unificado
  "eb.deal.seller": {
    purpose: "Tudo sobre o vendedor: empresa, drivers, documentos.",
    doNow: ["Atualize informações faltantes."],
  },
  "eb.deal.match": {
    purpose: "Por quê esse buyer combina com esse seller (modo simples ou técnico).",
    doNow: ["Use o toggle simples/técnico conforme público."],
  },
  "eb.deal.buyer": {
    purpose: "Tudo sobre o comprador: tese, histórico, contatos.",
    doNow: ["Registre toda interação."],
  },
  // Pipeline
  "eb.pipeline.column": {
    purpose: "Cada coluna é um estágio. Topo mostra tempo médio e qtd.",
    doNow: ["Arraste card para mover de estágio."],
  },
  // Match Inbox
  "eb.matches.filters": {
    purpose: "Filtra por score mínimo, setor, UF e status.",
    doNow: ["Comece com score 70+, depois afine."],
  },
  // Imports
  "eb.imports.upload": {
    purpose: "Arraste .xlsx ou .csv aqui.",
    doNow: ["Use o modelo correto para evitar erro de coluna."],
  },
  "eb.imports.status": {
    purpose: "Status de cada upload: processando, ok, com erros.",
    doNow: ["Clique em erros para ver linhas problemáticas."],
  },
  // ISP
  "eb.isp.import.zone": {
    purpose: "Upload do CSV ANATEL.",
    doNow: ["Use só o arquivo oficial da ANATEL."],
  },
  // Wizard /vender
  "vender.step1": {
    purpose: "Sobre o negócio: setor, ano, descrição.",
    doNow: ["Seja específico no setor para melhor match."],
  },
  "vender.step2": {
    purpose: "Financeiro: faturamento, lucro, valor pedido.",
    doNow: ["Dados reais; vendedor sério convence."],
  },
  "vender.step3": {
    purpose: "Localização e imagens.",
    doNow: ["Master = 20 fotos. Basic = 5."],
  },
  "vender.step4": {
    purpose: "Revisar e publicar.",
    doNow: ["Confira o codinome — é o que aparece público."],
  },
  // Captação
  "captacao.lead-score": {
    purpose: "Score de aprovação estimado: 0–100.",
    doNow: ["Acima de 70 = boa chance de aprovação."],
  },
  // Admin aprovações
  "admin.aprovacoes.pending": {
    purpose: "Pedidos aguardando sua decisão.",
    doNow: ["Trate em ordem de antiguidade."],
  },
  "admin.aprovacoes.history": {
    purpose: "Histórico de aprovações/recusas.",
    doNow: ["Útil para auditoria."],
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
