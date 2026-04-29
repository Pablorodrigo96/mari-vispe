import { useState } from "react";
import { ChevronDown, ChevronUp, Unlock, ShieldCheck } from "lucide-react";
import { useIdentityVisibility } from "@/hooks/useIdentityVisibility";
import { useTeaserAccessLog } from "@/hooks/useTeaserAccessLog";

interface Props {
  entityType: "mandate" | "buyer";
  entityId: string;
  cnpj?: string | null;
  razaoSocial?: string | null;
  nomeFantasia?: string | null;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
  uf?: string | null;
  extras?: Record<string, string | number | null | undefined>;
}

function formatCnpj(c?: string | null) {
  const d = (c ?? "").replace(/\D/g, "");
  if (d.length !== 14) return c ?? "—";
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

/**
 * Card de Identidade Real — só renderiza quando o usuário atual é
 * advisor/admin (eb_can_view_identity = true). Cada expansão é registrada
 * em equity_brain.access_logs para auditoria LGPD.
 */
export function IdentityRevealCard({
  entityType,
  entityId,
  cnpj,
  razaoSocial,
  nomeFantasia,
  email,
  phone,
  city,
  uf,
  extras,
}: Props) {
  const { data: canSee } = useIdentityVisibility({ cnpj });
  const { log } = useTeaserAccessLog();
  const [open, setOpen] = useState(false);

  if (!canSee) return null;

  const handleToggle = () => {
    const next = !open;
    setOpen(next);
    if (next) {
      log("identity_reveal", { entityType, entityId });
    }
  };

  return (
    <div className="rounded border border-[#D9F564]/30 bg-[#D9F564]/5">
      <button
        onClick={handleToggle}
        className="w-full flex items-center justify-between gap-3 p-3 text-left hover:bg-[#D9F564]/10 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Unlock className="h-4 w-4 text-[#D9F564]" />
          <span className="text-xs font-bold text-[#D9F564] uppercase tracking-wide">
            Identidade real
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] text-zinc-400 ml-2">
            <ShieldCheck className="h-3 w-3" /> Visível para advisor/admin
          </span>
        </div>
        {open ? (
          <ChevronUp className="h-4 w-4 text-zinc-400" />
        ) : (
          <ChevronDown className="h-4 w-4 text-zinc-400" />
        )}
      </button>

      {open && (
        <div className="px-4 pb-4 pt-0 grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-xs">
          <Field label="Razão social" value={razaoSocial} />
          <Field label="Nome fantasia" value={nomeFantasia} />
          <Field label="CNPJ" value={formatCnpj(cnpj)} />
          <Field label="E-mail" value={email} />
          <Field label="Telefone" value={phone} />
          <Field label="Cidade/UF" value={[city, uf].filter(Boolean).join(" / ") || null} />
          {extras &&
            Object.entries(extras).map(([k, v]) => (
              <Field key={k} label={k} value={v == null ? null : String(v)} />
            ))}
          <div className="md:col-span-2 mt-2 text-[10px] text-zinc-500">
            Este acesso foi registrado em log de auditoria (LGPD).
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="min-w-0">
      <div className="text-[10px] uppercase text-zinc-500 tracking-wide">{label}</div>
      <div className="text-zinc-100 break-words">{value || "—"}</div>
    </div>
  );
}
