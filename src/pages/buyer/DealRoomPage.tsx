import { Link, useParams } from "react-router-dom";
import { Loader2, ShieldAlert, ShieldCheck, FileText, ExternalLink, Building2, Calendar, ArrowLeft } from "lucide-react";
import { useDealRoom, useMyDealRooms } from "@/hooks/useBuyerDealAccess";
import { useDealDocuments, getSignedUrl } from "@/hooks/useDealDocuments";
import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { DealQAPanel } from "@/components/equity-brain/crm/DealQAPanel";

/**
 * Sala do comprador para um deal específico.
 * Acesso controlado por buyer_deal_access (concedido por advisor/admin).
 * Identidade só liberada após NDA assinado.
 */
export default function DealRoomPage() {
  const { id } = useParams<{ id: string }>();
  const roomQ = useDealRoom(id);
  const docsQ = useDealDocuments(id ?? "", null);

  const visibleDocs = useMemo(
    () =>
      (docsQ.data ?? []).filter(
        (d) => (d as any).visible_to_buyer && d.status !== "archived",
      ),
    [docsQ.data],
  );

  if (roomQ.isLoading) {
    return (
      <div className="p-12 flex items-center justify-center text-zinc-400 text-sm">
        <Loader2 className="h-5 w-5 animate-spin mr-2 text-[#D9F564]" /> Carregando sala…
      </div>
    );
  }

  const room = roomQ.data;
  if (!room) {
    return (
      <div className="p-12 text-center text-zinc-400 text-sm">
        Sala não encontrada ou acesso revogado.{" "}
        <Link to="/salas" className="text-[#D9F564] hover:underline">Ver minhas salas</Link>
      </div>
    );
  }

  const openDoc = async (path: string | null) => {
    if (!path) return;
    const url = await getSignedUrl(path);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="bg-zinc-950 min-h-full">
      <div className="border-b border-zinc-800 px-6 py-3 flex items-center gap-3">
        <Link to="/salas" className="text-zinc-400 hover:text-zinc-100 inline-flex items-center text-sm">
          <ArrowLeft className="h-4 w-4 mr-1" /> Minhas salas
        </Link>
        <div className="text-[10px] uppercase tracking-wider text-zinc-500">Sala do comprador</div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-6">
        {/* Coluna esquerda — Alvo */}
        <div className="space-y-3">
          <div className="rounded border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="text-[10px] uppercase tracking-wider text-zinc-500 inline-flex items-center gap-1 mb-2">
              <Building2 className="h-3 w-3 text-[#D9F564]" /> Alvo
            </div>
            {room.can_view_identity ? (
              <div>
                <div className="text-sm text-zinc-100 font-medium">CNPJ: {room.cnpj}</div>
                <div className="text-[10px] text-emerald-300 inline-flex items-center gap-1 mt-1">
                  <ShieldCheck className="h-3 w-3" /> Identidade liberada (NDA assinado)
                </div>
              </div>
            ) : (
              <div>
                <div className="text-sm text-zinc-300">Identidade protegida</div>
                <div className="text-[10px] text-amber-300 inline-flex items-center gap-1 mt-1">
                  <ShieldAlert className="h-3 w-3" />
                  {room.nda_signed
                    ? "Aguardando liberação do assessor"
                    : "Assine o NDA para liberar identidade"}
                </div>
              </div>
            )}
            <div className="mt-3 text-[11px] text-muted-foreground inline-flex items-center gap-1">
              <Calendar className="h-3 w-3" /> Acesso desde{" "}
              {new Date(room.granted_at).toLocaleDateString("pt-BR")} · nível{" "}
              <span className="text-zinc-200">{room.access_level}</span>
            </div>
          </div>

          <div className="rounded border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2">Etapa do deal</div>
            <div className="text-lg font-semibold text-[#D9F564] capitalize">{room.stage}</div>
            <div className="text-[10px] text-muted-foreground mt-1">
              Última movimentação:{" "}
              {new Date(room.deal_last_moved_at).toLocaleString("pt-BR")}
            </div>
          </div>
        </div>

        {/* Coluna direita — Documentos */}
        <div className="space-y-3">
          <div className="rounded border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="text-[10px] uppercase tracking-wider text-zinc-500 inline-flex items-center gap-1 mb-2">
              <FileText className="h-3 w-3 text-[#D9F564]" /> Documentos disponíveis
            </div>
            {docsQ.isLoading ? (
              <div className="text-xs text-muted-foreground">Carregando…</div>
            ) : visibleDocs.length === 0 ? (
              <div className="text-xs text-muted-foreground">
                Nenhum documento liberado ainda. O assessor disponibiliza materiais conforme o andamento do deal.
              </div>
            ) : (
              <ul className="space-y-1.5">
                {visibleDocs.map((d) => (
                  <li
                    key={d.id}
                    className={cn(
                      "flex items-center gap-2 rounded border border-zinc-800 bg-zinc-900/30 px-2 py-1.5",
                    )}
                  >
                    <FileText className="size-3 text-zinc-500" />
                    <span className="flex-1 truncate text-[12px] text-zinc-200 break-words">{d.label}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded border bg-zinc-700/40 text-zinc-300 border-zinc-600">
                      {d.status}
                    </span>
                    {d.storage_path && (
                      <button
                        type="button"
                        onClick={() => openDoc(d.storage_path)}
                        className="text-[10px] text-[#D9F564] inline-flex items-center gap-0.5 hover:underline"
                      >
                        abrir <ExternalLink className="size-2.5" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded border border-zinc-800 bg-zinc-900/40 p-4">
            <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">Próximos passos</div>
            <div className="text-[12px] text-zinc-300">
              {room.nda_signed
                ? "Aguarde nova movimentação do deal pelo assessor responsável."
                : "Solicite ao assessor o envio do NDA para liberar identidade e materiais sensíveis."}
            </div>
          </div>

          {id && <DealQAPanel dealId={id} compact />}
        </div>
      </div>
    </div>
  );
}

export function MyDealRoomsPage() {
  const { data, isLoading } = useMyDealRooms();
  if (isLoading) {
    return (
      <div className="p-12 flex items-center justify-center text-zinc-400 text-sm">
        <Loader2 className="h-5 w-5 animate-spin mr-2 text-[#D9F564]" /> Carregando salas…
      </div>
    );
  }
  const rows = data ?? [];
  return (
    <div className="bg-zinc-950 min-h-full p-6">
      <h1 className="text-xl font-semibold text-zinc-100 mb-1">Minhas salas</h1>
      <p className="text-sm text-muted-foreground mb-4">
        Deals para os quais você tem acesso ativo concedido por um assessor.
      </p>
      {rows.length === 0 ? (
        <div className="text-sm text-muted-foreground">Você ainda não tem nenhuma sala ativa.</div>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {rows.map((r) => (
            <li key={r.deal_id}>
              <Link
                to={`/salas/${r.deal_id}`}
                className="block rounded border border-zinc-800 bg-zinc-900/40 p-4 hover:border-[#D9F564]/50 transition-colors"
              >
                <div className="text-sm text-zinc-100 font-medium break-words">
                  {r.can_view_identity ? `CNPJ ${r.cnpj}` : "Empresa confidencial"}
                </div>
                <div className="text-[10px] text-muted-foreground mt-1 inline-flex items-center gap-2">
                  <span className="capitalize">Etapa: {r.stage}</span>
                  <span>·</span>
                  <span>Nível {r.access_level}</span>
                  {r.nda_signed ? (
                    <span className="text-emerald-300 inline-flex items-center gap-0.5">
                      <ShieldCheck className="size-3" /> NDA ok
                    </span>
                  ) : (
                    <span className="text-amber-300 inline-flex items-center gap-0.5">
                      <ShieldAlert className="size-3" /> NDA pendente
                    </span>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
