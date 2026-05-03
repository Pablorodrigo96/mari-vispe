import { EditableField } from "../EditableField";
import { useUpdateBuyer } from "@/hooks/useUpdateBuyer";

export function BuyerIdentityBlock({ buyer }: { buyer: any }) {
  const upd = useUpdateBuyer(buyer.id);
  const save = (field: string, value: any) =>
    upd.mutateAsync({ field, value, oldValue: buyer[field] });

  return (
    <div className="bg-zinc-900/40 border border-zinc-800 rounded p-4">
      <h3 className="text-sm font-bold text-zinc-100 mb-3">Identidade & Contato</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
        <div>
          <EditableField label="Nome" value={buyer.nome} onSave={(v) => save("nome", v)} />
          <EditableField label="CNPJ" value={buyer.cnpj} onSave={(v) => save("cnpj", v)} />
          <EditableField label="Website" value={buyer.website} onSave={(v) => save("website", v)} type="url" />
          <EditableField label="LinkedIn" value={buyer.linkedin_url} onSave={(v) => save("linkedin_url", v)} type="url" />
        </div>
        <div>
          <EditableField label="Email contato" value={buyer.email_contato_principal} onSave={(v) => save("email_contato_principal", v)} type="email" />
          <EditableField label="Telefone" value={buyer.telefone_contato} onSave={(v) => save("telefone_contato", v)} />
          <EditableField label="PE Sponsor" value={buyer.pe_sponsor_name} onSave={(v) => save("pe_sponsor_name", v)} />
          <EditableField label="Vertical principal" value={buyer.vertical_principal} onSave={(v) => save("vertical_principal", v)} />
        </div>
      </div>
    </div>
  );
}
