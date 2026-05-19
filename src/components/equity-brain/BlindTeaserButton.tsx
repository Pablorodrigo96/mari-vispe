import { useState } from "react";
import { Eye, Copy, MessageCircle, ExternalLink, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { useCompanyListing } from "@/hooks/useCompanyListing";
import { useTeaserAccessLog } from "@/hooks/useTeaserAccessLog";
import { useLogIdentityAccess } from "@/hooks/useLogIdentityAccess";
import { getWhatsAppLink } from "@/lib/whatsapp";

interface Props {
  cnpj?: string | null;
  entityType?: "mandate" | "buyer";
  entityId?: string;
}

/**
 * Botão "Ver Blind Teaser" que aparece no header do 360 (mandate/buyer).
 * Resolve a listing pelo CNPJ; se houver ticker, exibe ações:
 *   - Abrir teaser (nova aba) + log teaser_view
 *   - Copiar link público + log teaser_share_copy
 *   - Compartilhar via WhatsApp + log teaser_share_whatsapp
 *
 * Sem listing/ticker → renderiza estado desabilitado com tooltip.
 */
export function BlindTeaserButton({ cnpj, entityType, entityId }: Props) {
  const { data: listing, isLoading } = useCompanyListing(cnpj);
  const { log } = useTeaserAccessLog();
  const { log: logIdentity } = useLogIdentityAccess();
  const [open, setOpen] = useState(false);

  const ticker = listing?.ticker;
  const baseOrigin =
    typeof window !== "undefined" ? window.location.origin : "https://pmeb3.lovable.app";
  const url = ticker ? `${baseOrigin}/teaser/${ticker}` : null;

  if (isLoading) {
    return (
      <span className="text-[11px] inline-flex items-center gap-1 px-3 py-1.5 rounded border border-zinc-800 text-zinc-500 bg-transparent">
        <Eye className="h-3 w-3" /> Verificando teaser…
      </span>
    );
  }

  if (!url) {
    return (
      <span
        title={
          cnpj
            ? "Esta empresa ainda não possui listing/ticker no marketplace."
            : "Mandato sem CNPJ — não é possível resolver o teaser."
        }
        className="text-[11px] inline-flex items-center gap-1 px-3 py-1.5 rounded border border-zinc-800 text-zinc-500 bg-transparent cursor-not-allowed"
      >
        <Eye className="h-3 w-3" /> Sem Blind Teaser
      </span>
    );
  }

  const handleOpen = () => {
    log("teaser_view", { entityType, entityId, listingId: listing!.id, ticker });
    window.open(url, "_blank", "noopener,noreferrer");
    setOpen(false);
  };
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link do teaser copiado");
      log("teaser_share_copy", { entityType, entityId, listingId: listing!.id, ticker });
    } catch {
      toast.error("Não foi possível copiar");
    }
    setOpen(false);
  };
  const handleWhatsapp = () => {
    const msg = `Confira esta oportunidade (Blind Teaser): ${url}`;
    const link = getWhatsAppLink(msg);
    log("teaser_share_whatsapp", { entityType, entityId, listingId: listing!.id, ticker });
    window.open(link, "_blank", "noopener,noreferrer");
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-[11px] inline-flex items-center gap-1 px-3 py-1.5 rounded border border-[#D9F564]/40 text-[#D9F564] hover:bg-[#D9F564]/10 bg-transparent font-medium"
      >
        <Eye className="h-3 w-3" /> Ver Blind Teaser
        <ChevronDown className="h-3 w-3" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 z-50 w-56 rounded border border-zinc-800 bg-zinc-950 shadow-lg overflow-hidden">
            <MenuItem icon={ExternalLink} label="Abrir teaser" onClick={handleOpen} />
            <MenuItem icon={Copy} label="Copiar link público" onClick={handleCopy} />
            <MenuItem icon={MessageCircle} label="Compartilhar no WhatsApp" onClick={handleWhatsapp} />
            <div className="px-3 py-2 text-[10px] text-zinc-500 border-t border-zinc-800">
              Cada acesso é registrado em log LGPD.
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
}: {
  icon: any;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-100 hover:bg-zinc-900 text-left"
    >
      <Icon className="h-3.5 w-3.5 text-zinc-400" />
      {label}
    </button>
  );
}
