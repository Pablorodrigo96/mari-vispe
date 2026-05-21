import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, Clock, FileSignature } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export function PairSignaturesTimeline({ pairId }: { pairId: string }) {
  const { data: docs = [], isLoading } = useQuery({
    queryKey: ["pair-docs", pairId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deal_documents")
        .select("id, label, template_code, status, signed_at, signed_by, signing_url, created_at")
        .eq("deal_pair_id", pairId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 15000,
  });

  if (isLoading) return null;
  if (!docs.length) {
    return (
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4 text-sm text-zinc-500">
        Nenhum documento gerado para este par ainda. Use <strong>Gerar NBO</strong> no topo.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/40">
      <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2">
        <FileSignature className="h-4 w-4 text-volt" />
        <span className="text-sm font-medium text-zinc-200">Linha do tempo de assinaturas</span>
      </div>
      <ul className="divide-y divide-zinc-800">
        {docs.map((d: any) => {
          const isSigned = d.status === "signed";
          const isPending = d.status === "pending_signature";
          return (
            <li key={d.id} className="px-4 py-3 flex items-start gap-3">
              <div className="mt-0.5">
                {isSigned ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                ) : isPending ? (
                  <Clock className="h-4 w-4 text-amber-400" />
                ) : (
                  <FileSignature className="h-4 w-4 text-zinc-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-zinc-200 break-words">{d.label}</div>
                <div className="text-xs text-zinc-500 mt-0.5">
                  {isSigned && d.signed_at ? (
                    <>Assinado {formatDistanceToNow(new Date(d.signed_at), { addSuffix: true, locale: ptBR })} · {d.signed_by ?? "—"}</>
                  ) : isPending ? (
                    <>Aguardando assinatura</>
                  ) : (
                    <>Rascunho · {d.template_code ?? "doc"}</>
                  )}
                </div>
                {isPending && d.signing_url && (
                  <a
                    href={d.signing_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-volt hover:underline mt-1 inline-block"
                  >
                    Abrir link de assinatura →
                  </a>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
