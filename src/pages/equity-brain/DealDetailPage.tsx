import { useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { ArrowLeft, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DealCard } from "@/components/equity-brain/DealCard";
import { useCompanyResolver } from "@/hooks/useCompanyResolver";

export default function DealDetailPage() {
  // Route still mounted as /equity-brain/empresa/:cnpj — but we accept any id.
  const params = useParams<{ cnpj?: string; idOrCode?: string }>();
  const idOrCode = params.cnpj ?? params.idOrCode ?? "";
  const navigate = useNavigate();
  const { data: resolved, isLoading, isError } = useCompanyResolver(idOrCode);

  // Canonical-URL redirect: if user landed via codename/listing/ticker, replace url with the CNPJ form.
  useEffect(() => {
    if (resolved?.cnpj && resolved.source !== "cnpj" && resolved.source !== "not_found") {
      navigate(`/equity-brain/empresa/${resolved.cnpj}`, { replace: true });
    }
  }, [resolved, navigate]);

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
        <div className="p-12 text-center max-w-lg mx-auto">
          <AlertCircle className="h-10 w-10 mx-auto text-amber-400 mb-3" />
          <div className="text-sm text-zinc-100 font-semibold mb-1">Empresa não encontrada</div>
          <div className="text-xs text-zinc-400 mb-4 break-words">
            Não consegui localizar nenhum registro na base do Equity Brain para
            <span className="font-mono text-zinc-300"> "{idOrCode}"</span>.
            Pode ser um codename antigo, um ticker de listing inválido ou uma empresa que ainda não foi enriquecida.
          </div>
          <Link to="/equity-brain/match-inbox" className="text-[11px] text-[#D9F564] hover:underline">
            Voltar para o Match Inbox
          </Link>
        </div>
      ) : (
        <DealCard cnpj={resolved.cnpj} mode="page" />
      )}
    </div>
  );
}
