import { Link } from "react-router-dom";
import { ArrowLeft, Upload, FileSpreadsheet, Briefcase, Target, Activity, Building2, Users, Package } from "lucide-react";
import { useState } from "react";
import { ImportDialog } from "@/components/equity-brain/crm/ImportDialog";

type Entity = "companies" | "mandates" | "buyers" | "contacts" | "activities" | "bundle";

export default function ImportsPage() {
  const [openEntity, setOpenEntity] = useState<Entity | null>(null);

  const cards: { key: Entity; title: string; desc: string; Icon: any }[] = [
    { key: "companies",  title: "Empresas",          desc: "Cadastre empresas-alvo (CNPJ, razão social, setor, porte). Entram qualificadas e disparam scoring.", Icon: Building2 },
    { key: "mandates",   title: "Mandatos / Deals",  desc: "Mesma estrutura do CSV de exports. Cria empresa stub se CNPJ não existe e dispara matches automáticos.", Icon: Briefcase },
    { key: "buyers",     title: "Buyers",            desc: "Importe lista de compradores com tese, ticket, setores e regiões. Recalcula matches em background.", Icon: Target },
    { key: "contacts",   title: "Contatos",          desc: "Vincule contatos a mandatos, buyers ou empresas (nome, email, telefone, cargo).", Icon: Users },
    { key: "activities", title: "Atividades CRM",    desc: "Histórico de calls, emails, reuniões. Append-only, alimenta timeline 360.", Icon: Activity },
    { key: "bundle",     title: "Pacote completo",   desc: "Um único .xlsx com várias abas (companies, buyers, mandates, contacts, activities). Processado na ordem correta.", Icon: Package },
  ];

  return (
    <div className="p-6 space-y-5 bg-zinc-950 min-h-full">
      <Link to="/equity-brain/crm" className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-100">
        <ArrowLeft className="h-3 w-3" /> Voltar ao CRM
      </Link>

      <header className="border-b border-zinc-800 pb-4 flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Imports</h1>
          <p className="text-[11px] text-zinc-500 mt-1">
            Suba planilhas (.xlsx ou .csv) e o sistema popula tudo: tabelas, gráficos do CRM, dashboards executivos, matches e market waves recalculam sozinhos.
          </p>
        </div>
        <Link to="/equity-brain/crm/exports" className="text-[11px] inline-flex items-center gap-1 px-3 py-1.5 rounded border border-zinc-800 text-zinc-300 hover:text-zinc-100 hover:border-zinc-700">
          <FileSpreadsheet className="h-3 w-3" /> Ver Exports
        </Link>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {cards.map(({ key, title, desc, Icon }) => (
          <div key={key} className="rounded border border-zinc-800 bg-zinc-900/40 p-4 flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded bg-zinc-800/60 text-[#D9F564]">
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="text-sm text-zinc-100 font-medium">{title}</div>
                <p className="text-[11px] text-zinc-400 mt-1 break-words">{desc}</p>
              </div>
            </div>
            <button
              onClick={() => setOpenEntity(key)}
              className="self-end inline-flex items-center gap-2 px-3 py-1.5 rounded border border-[#D9F564]/40 text-[#D9F564] hover:bg-[#D9F564]/10 text-xs"
            >
              <Upload className="h-3 w-3" /> Importar
            </button>
          </div>
        ))}
      </div>

      <div className="rounded border border-zinc-800 bg-zinc-900/30 p-4 text-[11px] text-zinc-400 break-words">
        <div className="text-zinc-300 font-medium mb-1">Como funciona</div>
        <ul className="list-disc ml-4 space-y-1">
          <li>Use <strong>Dry-run</strong> primeiro para validar sem gravar.</li>
          <li>Cabeçalhos das planilhas devem bater com os dos modelos (mesmos nomes do export).</li>
          <li>CNPJs duplicados fazem upsert (atualizam o registro), nunca duplicam.</li>
          <li>Após import, o backend dispara <code>match-batch</code>, <code>calculate-scores</code>, <code>compute-market-waves</code> e <code>compute-mandate-active-proba</code>. Dashboards, gráficos e Match Analytics atualizam em ~1-2 min.</li>
          <li>Cada import vira um evento <code>bulk_import</code> em <code>deal_events</code> — auditável.</li>
        </ul>
      </div>

      {openEntity && (
        <ImportDialog
          open={!!openEntity}
          onOpenChange={(o) => !o && setOpenEntity(null)}
          entity={openEntity}
        />
      )}
    </div>
  );
}
