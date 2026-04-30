// Templates XLSX por entidade — espelham as views de export
import * as XLSX from "xlsx";

type Entity = "companies" | "mandates" | "buyers" | "contacts" | "activities" | "bundle";

const TEMPLATES: Record<Exclude<Entity, "bundle">, { headers: string[]; example: any[]; instructions: string[] }> = {
  companies: {
    headers: ["cnpj", "razao_social", "nome_fantasia", "cnae_principal", "cnae_descricao", "porte", "uf", "municipio", "capital_social", "faturamento_estimado", "setor_ma", "subsetor_ma"],
    example: ["12345678000190", "Padaria Premium SP Ltda", "Padaria Premium", "1091102", "Fabricação de produtos de panificação", "MEDIO", "SP", "São Paulo", 500000, 1200000, "alimentos", "panificação"],
    instructions: [
      "cnpj: 14 dígitos. Se vier sem CNPJ, o sistema cria um placeholder e marca needs_cnpj_enrichment=true (você completa pelo CRM depois).",
      "Se vier com 13 dígitos (Excel comeu o zero), o sistema preenche automaticamente.",
      "uf: sigla 2 letras. porte: ME, EPP, MEDIO, GRANDE.",
      "Importadas entram com qualification_status=qualified.",
    ],
  },
  buyers: {
    headers: ["nome", "tipo", "cnpj", "website", "ticket_min", "ticket_max", "porte_alvo", "setores_interesse", "ufs_interesse", "municipios_interesse", "sinergias_chave", "status", "observacoes"],
    example: ["Fundo XYZ Capital", "financeiro", "98765432000110", "https://xyzcap.com", 5000000, 50000000, "MEDIO|GRANDE", "tecnologia|saude", "SP|RJ|MG", "São Paulo|Rio", "consolidação|expansão", "ativo", "Tese: SaaS B2B"],
    instructions: [
      "tipo: estrategico | financeiro | family_office.",
      "Se você colocar um setor em 'tipo' (ex: 'Telecomunicações', 'Alimentação'), o sistema entende como buyer 'estrategico' E coloca o setor em setores_interesse automaticamente.",
      "Listas (porte_alvo, setores_interesse, ufs_interesse): separar por | (pipe), vírgula ou ponto-e-vírgula.",
      "ticket_min/ticket_max em reais.",
    ],
  },
  mandates: {
    headers: ["company_cnpj", "razao_social", "uf", "municipio", "setor_ma", "valor_pedido", "comissao_pct", "data_assinatura", "data_vencimento", "deal_type", "pipeline_stage", "status", "exclusividade", "contato_nome", "contato_telefone", "contato_email", "observacoes"],
    example: ["12345678000190", "Padaria Premium SP Ltda", "SP", "São Paulo", "alimentos", 8000000, 5, "2026-01-15", "2026-12-31", "sellside", "match", "vigente", "sim", "Maria Silva", "+5511999990000", "maria@padaria.com.br", "Vendedor motivado"],
    instructions: [
      "company_cnpj: obrigatório (13 ou 14 dígitos — sistema corrige zero à esquerda). Cria empresa stub se não existir.",
      "valor_pedido: opcional (mandates em originação podem entrar sem valor).",
      "comissao_pct em %. Ex: 5 = 5%.",
      "deal_type: sellside | buyside | spa | due_diligence | nbo | match (aceita sell_side / sell-side e converte).",
      "pipeline_stage: match | nbo | due_diligence | spa | closing | closed (aceita originacao/qualificacao/mandato_assinado/marketing/ofertas/fechamento e converte).",
      "status: vigente | em_negociacao | vendemos | vendeu_sozinho | vencido | cancelado (aceita 'ativo' e converte para 'vigente').",
      "exclusividade: sim/não (texto). Default = não.",
    ],
  },
  contacts: {
    headers: ["entity_type", "entity_id", "nome", "email", "telefone", "cargo", "is_primary"],
    example: ["mandate", "12345678000190", "João Sócio", "joao@empresa.com", "+5511988887777", "CEO", "sim"],
    instructions: [
      "entity_type: mandate | buyer | company (aceita plural também).",
      "entity_id pode ser: UUID da entidade, OU o CNPJ (para mandate/company), OU o NOME exato do buyer.",
      "Sistema resolve o vínculo automaticamente — primeiro busca dentro do bundle (mesma planilha), depois no banco.",
      "Email OU telefone recomendado (não obrigatório — vai com warning).",
    ],
  },
  activities: {
    headers: ["entity_type", "entity_id", "kind", "note", "created_at"],
    example: ["mandate", "uuid-do-mandato", "call", "Conversa inicial — vendedor topa avançar", "2026-04-29 14:30"],
    instructions: ["kind: call, email, whatsapp, meeting, note, stage_change", "created_at: aceita yyyy-mm-dd hh:mm ou dd/mm/aaaa"],
  },
};

export function downloadTemplate(entity: Entity) {
  const wb = XLSX.utils.book_new();

  if (entity === "bundle") {
    (Object.keys(TEMPLATES) as Array<keyof typeof TEMPLATES>).forEach((k) => {
      const t = TEMPLATES[k];
      const ws = XLSX.utils.aoa_to_sheet([t.headers, t.example]);
      ws["!cols"] = t.headers.map((h) => ({ wch: Math.max(h.length + 2, 18) }));
      XLSX.utils.book_append_sheet(wb, ws, k);
    });
    const inst = XLSX.utils.aoa_to_sheet([
      ["Pacote multi-aba — uma aba por entidade"],
      ["Ordem de processamento: companies → buyers → mandates → contacts → activities"],
      ["Cada aba segue o mesmo formato dos modelos individuais"],
    ]);
    XLSX.utils.book_append_sheet(wb, inst, "_instrucoes");
    XLSX.writeFile(wb, "modelo_eb_pacote_completo.xlsx");
    return;
  }

  const t = TEMPLATES[entity];
  const ws = XLSX.utils.aoa_to_sheet([t.headers, t.example]);
  ws["!cols"] = t.headers.map((h) => ({ wch: Math.max(h.length + 2, 18) }));
  XLSX.utils.book_append_sheet(wb, ws, entity);

  const inst = XLSX.utils.aoa_to_sheet([["Instruções"], ...t.instructions.map((i) => [i])]);
  XLSX.utils.book_append_sheet(wb, inst, "_instrucoes");

  XLSX.writeFile(wb, `modelo_eb_${entity}.xlsx`);
}

export function parseFile(file: File): Promise<{ entity: Entity; rows?: any[]; bundle?: Record<string, any[]> }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: "binary", cellDates: true });
        const sheetNames = wb.SheetNames;
        const isBundle = sheetNames.some((n) => Object.keys(TEMPLATES).includes(n as any));
        if (isBundle && sheetNames.length > 1) {
          const bundle: Record<string, any[]> = {};
          sheetNames.forEach((name) => {
            if (Object.keys(TEMPLATES).includes(name)) {
              bundle[name] = XLSX.utils.sheet_to_json(wb.Sheets[name]);
            }
          });
          resolve({ entity: "bundle", bundle });
        } else {
          const rows = XLSX.utils.sheet_to_json<any>(wb.Sheets[sheetNames[0]]);
          resolve({ entity: "single" as any, rows });
        }
      } catch (err) { reject(err); }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsBinaryString(file);
  });
}

export const ENTITY_LABELS: Record<Exclude<Entity, "bundle">, string> = {
  companies: "Empresas",
  mandates: "Mandatos / Deals",
  buyers: "Buyers",
  contacts: "Contatos",
  activities: "Atividades CRM",
};
