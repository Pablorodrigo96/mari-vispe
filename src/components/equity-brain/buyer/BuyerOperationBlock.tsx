import { EditableField } from "../EditableField";
import { useUpdateBuyer } from "@/hooks/useUpdateBuyer";

const TIPO_OPTS = [
  { value: "estrategico", label: "Estratégico" },
  { value: "financeiro", label: "Financeiro" },
  { value: "family_office", label: "Family Office" },
  { value: "fundo", label: "Fundo / PE" },
  { value: "search_fund", label: "Search Fund" },
  { value: "consolidador", label: "Consolidador" },
];

const STATUS_OPTS = [
  { value: "ativo", label: "Ativo" },
  { value: "inativo", label: "Inativo" },
  { value: "observacao", label: "Em observação" },
];

export function BuyerOperationBlock({ buyer }: { buyer: any }) {
  const upd = useUpdateBuyer(buyer.id);
  const save = (field: string, value: any) =>
    upd.mutateAsync({ field, value, oldValue: buyer[field] });

  return (
    <div className="bg-zinc-900/40 border border-zinc-800 rounded p-4">
      <h3 className="text-sm font-bold text-zinc-100 mb-3">Mandato de busca</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
        <div>
          <EditableField label="Tipo" value={buyer.tipo} onSave={(v) => save("tipo", v)} type="select" options={TIPO_OPTS} />
          <EditableField label="Status" value={buyer.status} onSave={(v) => save("status", v)} type="select" options={STATUS_OPTS} />
          <EditableField label="Ticket mínimo (R$)" value={buyer.ticket_min} onSave={(v) => save("ticket_min", v)} type="number" />
          <EditableField label="Ticket máximo (R$)" value={buyer.ticket_max} onSave={(v) => save("ticket_max", v)} type="number" />
        </div>
        <div>
          <EditableField label="UFs de interesse" value={buyer.ufs_interesse} onSave={(v) => save("ufs_interesse", v)} type="multiselect" placeholder="SP, RJ, MG" />
          <EditableField label="Setores de interesse" value={buyer.setores_interesse} onSave={(v) => save("setores_interesse", v)} type="multiselect" />
          <EditableField label="Subsetores de interesse" value={buyer.subsetores_interesse} onSave={(v) => save("subsetores_interesse", v)} type="multiselect" />
          <EditableField label="Municípios de interesse" value={buyer.municipios_interesse} onSave={(v) => save("municipios_interesse", v)} type="multiselect" />
        </div>
      </div>
    </div>
  );
}
