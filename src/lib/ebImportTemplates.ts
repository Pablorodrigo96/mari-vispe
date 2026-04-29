// Templates XLSX por entidade — espelham as views de export
import * as XLSX from "xlsx";

type Entity = "companies" | "mandates" | "buyers" | "contacts" | "activities" | "bundle";

const TEMPLATES: Record<Exclude<Entity, "bundle">, { headers: string[]; example: any[]; instructions: string[] }> = {
  companies: {
    headers: ["cnpj", "razao_social", "nome_fantasia", "cnae_principal", "cnae_descricao", "porte", "uf", "municipio", "capital_social", "faturamento_estimado", "setor_ma", "subsetor_ma"],
    example: ["12345678000190", "Padaria Premium SP Ltda", "Padaria Premium", "1091102", "Fabricação de produtos de panificação", "MEDIO", "SP", "São Paulo", 500000, 1200000, "alimentos", "panificação"],
    instructions: ["cnpj: 14 dígitos (obrigatório)", "uf: sigla 2 letras", "porte: ME, EPP, MEDIO, GRANDE", "Empresas importadas entram com qualification_status=qualified"],
  },
  buyers: {
    headers: ["nome", "tipo", "cnpj", "website", "ticket_min", "ticket_max", "porte_alvo", "setores_interesse", "ufs_interesse", "municipios_interesse", "sinergias_chave", "status", "observacoes"],
    example: ["Fundo XYZ Capital", "financeiro", "98765432000110", "https://xyzcap.com", 5000000, 50000000, "MEDIO|GRANDE", "tecnologia|saude", "SP|RJ|MG", "São Paulo|Rio", "consolidação|expansão", "ativo", "Tese: SaaS B2B"],
    instructions: ["tipo: estrategico, financeiro, family_office", "Listas (porte_alvo, setores_interesse, ufs_interesse): separar por | (pipe), vírgula ou ponto-e-vírgula", "ticket_min/ticket_max em reais"],
  },
  mandates: {
    headers: ["company_cnpj", "razao_social", "uf", "municipio", "setor_ma", "valor_pedido", "comissao_pct", "data_assinatura", "data_vencimento", "deal_type", "pipeline_stage", "status", "exclusividade", "contato_nome", "contato_telefone", "contato_email", "observacoes"],
    example: ["12345678000190", "Padaria Premium SP Ltda", "SP", "São Paulo", "alimentos", 8000000, 5, "2026-01-15", "2026-12-31", "sell_side", "originacao", "ativo", "sim", "Maria Silva", "+5511999990000", "maria@padaria.com.br", "Vendedor motivado"],
    instructions: ["company_cnpj: obrigatório (cria empresa stub se não existir)", "valor_pedido em reais", "comissao_pct em % (ex: 5 = 5%)", "deal_type: sell_side, buy_side, capital_raise", "pipeline_stage: originacao, qualificacao, mandato_assinado, marketing, ofertas, due_diligence, fechamento"],
  },
  contacts: {
    headers: ["entity_type", "entity_id", "nome", "email", "telefone", "cargo", "is_primary"],
    example: ["mandate", "uuid-do-mandato", "João Sócio", "joao@empresa.com", "+5511988887777", "CEO", "sim"],
    instructions: ["entity_type: mandate, buyer ou company", "entity_id: UUID da entidade (ou CNPJ para company)", "Pelo menos email OU telefone obrigatório"],
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
