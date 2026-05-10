import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Loader2, AlertCircle, Building2, Activity, StickyNote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DealCard } from "@/components/equity-brain/DealCard";
import { useCompanyResolver } from "@/hooks/useCompanyResolver";
import { EntityNotes } from "@/components/equity-brain/notes/EntityNotes";
import { CompanyEnrichedHeader } from "@/components/equity-brain/company/CompanyEnrichedHeader";
import { cn } from "@/lib/utils";

type Tab = "overview" | "notes";

export default function DealDetailPage() {
  const params = useParams<{ cnpj?: string; idOrCode?: string }>();
  const idOrCode = params.cnpj ?? params.idOrCode ?? "";
  const navigate = useNavigate();
  const { data: resolved, isLoading } = useCompanyResolver(idOrCode);
  const [tab, setTab] = useState<Tab>("overview");

  // Canonical-URL redirect: only when we resolve via codename/uuid/ticker/uuid_partial AND the cnpj differs from URL
  useEffect(() => {
    if (
      resolved?.cnpj &&
      resolved.source !== "cnpj" &&
      resolved.source !== "synthetic" &&
      resolved.source !== "not_found" &&
      resolved.cnpj !== idOrCode
    ) {
      navigate(`/equity-brain/empresa/${resolved.cnpj}`, { replace: true });
    }
  }, [resolved, navigate, idOrCode]);

  return (
    <div>
      <div className="border-b border-zinc-800 px-6 py-3 flex items-center gap-2">
        <Button size="sm" variant="ghost" onClick={() => navigate(-1)}
          className="text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800">
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>
        {resolved?.codename && (
          <span className="ml-2 text-[11px] font-mono text-amber-300">{resolved.codename}</span>
        )}
      </div>

      {isLoading ? (
        <div className="p-12 flex items-center justify-center text-zinc-400 text-sm">
          <Loader2 className="h-5 w-5 animate-spin mr-2 text-[#D9F564]" /> Resolvendo empresa…
        </div>
      ) : !resolved?.cnpj ? (
        <div className="p-12 max-w-lg mx-auto text-center">
          <AlertCircle className="h-10 w-10 mx-auto text-amber-400 mb-3" />
          <div className="text-sm text-zinc-100 font-semibold mb-1">Empresa não encontrada</div>
          <div className="text-xs text-zinc-400 mb-4 break-words">
            Não consegui localizar nenhum registro na base do Equity Brain para
            <span className="font-mono text-zinc-300"> "{idOrCode}"</span>.
          </div>

          {resolved?.candidates && resolved.candidates.length > 0 && (
            <div className="text-left mb-4">
              <div className="text-[11px] uppercase tracking-wider text-zinc-500 mb-2">Você quis dizer:</div>
              <div className="space-y-1.5">
                {resolved.candidates.map((c) => (
                  <Link
                    key={c.cnpj}
                    to={`/equity-brain/empresa/${c.cnpj}`}
                    className="flex items-center gap-2 p-2 rounded border border-zinc-800 hover:border-[#D9F564]/40 hover:bg-zinc-900 text-xs text-zinc-200"
                  >
                    <Building2 className="h-3.5 w-3.5 text-[#D9F564] shrink-0" />
                    <span className="font-mono text-amber-300 shrink-0">{c.codename ?? "—"}</span>
                    <span className="truncate break-words">{c.razao_social ?? c.cnpj}</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <Link to="/equity-brain/match-inbox" className="text-[11px] text-[#D9F564] hover:underline">
            Voltar para o Match Inbox
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="px-6 pt-3">
            <CompanyEnrichedHeader cnpj={resolved.cnpj} />
          </div>
          <div className="flex items-center gap-1 border-b border-zinc-800 px-6">
            {([
              { key: "overview" as Tab, label: "Visão geral", Icon: Activity },
              { key: "notes" as Tab, label: "Notas", Icon: StickyNote },
            ]).map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 text-xs border-b-2 -mb-px transition-colors",
                  tab === t.key
                    ? "border-emerald-500 text-emerald-300"
                    : "border-transparent text-zinc-400 hover:text-zinc-100",
                )}
              >
                <t.Icon className="h-3.5 w-3.5" /> {t.label}
              </button>
            ))}
          </div>
          {tab === "overview" && <DealCard cnpj={resolved.cnpj} mode="page" />}
          {tab === "notes" && (
            <div className="px-6 py-4">
              <EntityNotes entityType="company" entityId={resolved.cnpj} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
