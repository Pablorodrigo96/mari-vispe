export type MariSuggestion = { label: string; prompt: string };

export function getMariSuggestions(pathname: string): MariSuggestion[] {
  if (pathname.includes("/match-inbox")) {
    return [
      { label: "Quais matches priorizar agora?", prompt: "Analise meus matches Hot atuais e me diga quais 3 priorizar e por quê." },
      { label: "Como ler o tier Hot/Warm?", prompt: "Explica como funciona o tier dinâmico Hot/Warm/morno do Match Inbox." },
      { label: "Por que esse score é baixo?", prompt: "Por que os scores absolutos parecem baixos (30-57)? Como interpretar?" },
    ];
  }
  if (pathname.includes("/pipeline")) {
    return [
      { label: "Deals congelados", prompt: "Quais deals estão fora de SLA agora e como destravar cada um?" },
      { label: "Como acelerar este deal?", prompt: "Me dê 3 táticas para avançar o deal aberto da etapa atual." },
      { label: "Duração média ideal?", prompt: "Qual a duração média esperada por etapa em M&A de PME no Brasil?" },
    ];
  }
  if (pathname.includes("/crm/mandate/")) {
    return [
      { label: "Próxima ação para esse mandato?", prompt: "Olhando esse mandato, qual a próxima ação concreta?" },
      { label: "Quem são os melhores buyers?", prompt: "Liste os 5 melhores buyers para esse mandato e o porquê de cada match." },
      { label: "Como precificar?", prompt: "Que múltiplos e estrutura de deal sugere para essa empresa?" },
    ];
  }
  if (pathname.includes("/crm/buyer/")) {
    return [
      { label: "Tese desse buyer?", prompt: "Resuma a tese desse buyer em 3 linhas e os melhores mandatos para mostrar." },
      { label: "Como abordar?", prompt: "Me dê um script de WhatsApp para o primeiro contato com esse buyer." },
    ];
  }
  if (pathname.includes("/dashboard")) {
    return [
      { label: "Como bater minha meta da semana?", prompt: "Olhando meu pipeline e matches, como bato a meta da semana?" },
      { label: "Onde focar hoje?", prompt: "Onde devo focar minhas próximas 2 horas?" },
      { label: "Diagnóstico do funil", prompt: "Tem gargalo no meu funil? Onde?" },
    ];
  }
  // Default
  return [
    { label: "Como funciona a plataforma?", prompt: "Me dê um tour da plataforma em 5 bullets." },
    { label: "Como funciona o Equity Score?", prompt: "Explica como o Equity Score é calculado e o que preciso preencher." },
    { label: "Playbook NDA→LOI", prompt: "Resuma o playbook de NDA até LOI com prazos típicos." },
    { label: "Quais matches priorizar?", prompt: "Onde encontro os matches mais quentes e como priorizá-los?" },
  ];
}
