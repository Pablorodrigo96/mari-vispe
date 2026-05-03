import { EditableField } from "../EditableField";
import { useUpdateBuyer } from "@/hooks/useUpdateBuyer";

export function BuyerThesisBlock({ buyer }: { buyer: any }) {
  const upd = useUpdateBuyer(buyer.id);
  const save = (field: string, value: any) =>
    upd.mutateAsync({ field, value, oldValue: buyer[field] });

  return (
    <div className="bg-zinc-900/40 border border-zinc-800 rounded p-4 space-y-2">
      <h3 className="text-sm font-bold text-zinc-100 mb-2">Tese & Setor</h3>
      <EditableField
        label="Tese de investimento"
        value={buyer.tese_text}
        onSave={(v) => save("tese_text", v)}
        type="textarea"
        placeholder="Descreva a tese declarada do comprador…"
      />
      <EditableField
        label="Critérios de exclusão"
        value={buyer.criterios_exclusao}
        onSave={(v) => save("criterios_exclusao", v)}
        type="textarea"
      />
      <EditableField
        label="Notas estratégicas"
        value={buyer.notas_estrategicas}
        onSave={(v) => save("notas_estrategicas", v)}
        type="textarea"
      />
      <EditableField
        label="Sinergias-chave"
        value={buyer.sinergias_chave}
        onSave={(v) => save("sinergias_chave", v)}
        type="multiselect"
        placeholder="cross-sell, captação, footprint…"
      />
      <EditableField
        label="Observações"
        value={buyer.observacoes}
        onSave={(v) => save("observacoes", v)}
        type="textarea"
      />
    </div>
  );
}
