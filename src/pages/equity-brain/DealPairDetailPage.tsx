import { useParams, Link } from "react-router-dom";
import { useDealPair, useTransitionDealPair, PAIR_STATUS_LABEL, PAIR_STATUS_COLOR, type DealPairStatus } from "@/hooks/useDealPairs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Building2, User, Handshake, FileText } from "lucide-react";
import { PairSignaturesTimeline } from "@/components/equity-brain/PairSignaturesTimeline";
import { PairClosingEmailsCard } from "@/components/equity-brain/PairClosingEmailsCard";
import { LegalDocsMenu } from "@/components/legal/LegalDocsMenu";

const NEXT_STATUS: Record<DealPairStatus, DealPairStatus[]> = {
  draft: ["active", "lost"],
  active: ["nbo", "lost"],
  nbo: ["signed", "lost"],
  signed: ["closed", "lost"],
  closed: [],
  lost: [],
};

export default function DealPairDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: pair, isLoading } = useDealPair(id);
  const transition = useTransitionDealPair();

  if (isLoading) return <div className="p-8 text-zinc-500">Carregando...</div>;
  if (!pair) return <div className="p-8 text-zinc-500">Par não encontrado.</div>;

  const nexts = NEXT_STATUS[pair.status];
  const buyerLabel = pair.buyer_profile_name || pair.buyer_profile_company || pair.buy_cnpj || "—";

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="border-b border-zinc-800 px-6 py-4 flex items-center gap-3">
        <Button asChild variant="ghost" size="sm" className="text-zinc-300 hover:bg-zinc-800">
          <Link to="/equity-brain/pipeline?tab=pares"><ArrowLeft className="h-4 w-4 mr-1" /> Voltar</Link>
        </Button>
        <h1 className="text-lg font-semibold">Par #{pair.id.slice(0, 8)}</h1>
        <Badge className={PAIR_STATUS_COLOR[pair.status]}>{PAIR_STATUS_LABEL[pair.status]}</Badge>
        <div className="ml-auto flex gap-2">
          <LegalDocsMenu dealId={pair.sell_mandate_id} label="Documentos legais" />
          <Button asChild size="sm" variant="ghost" className="text-zinc-400 hover:text-[#D9F564] hover:bg-zinc-800">
            <Link to={`/equity-brain/par/${pair.id}/nbo`}>
              <FileText className="h-4 w-4 mr-1" /> NBO Wizard
            </Link>
          </Button>
          {nexts.map((ns) => (
            <Button
              key={ns}
              size="sm"
              variant={ns === "lost" ? "outline" : "default"}
              className={ns === "lost"
                ? "bg-transparent border-red-800 text-red-400 hover:bg-red-950"
                : "bg-[#D9F564] text-zinc-900 hover:bg-[#D9F564]/90 font-semibold"}
              onClick={() => {
                const reason = ns === "lost" ? window.prompt("Motivo da perda?") ?? undefined : undefined;
                if (ns === "lost" && !reason) return;
                transition.mutate({ pair_id: pair.id, new_status: ns, reason });
              }}
            >
              Mover para {PAIR_STATUS_LABEL[ns]}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-6">
        {/* Vendedor */}
        <Column icon={<Building2 className="h-4 w-4" />} title="Vendedor">
          <Field label="CNPJ" value={pair.sell_cnpj} />
          <Field label="Setor" value={pair.sell_setor} />
          <Field label="UF" value={pair.sell_uf} />
          <Field label="Stage" value={pair.sell_stage} />
          <Field label="Comissão" value={`${pair.comissao_sell_pct}%`} />
        </Column>

        {/* Pareamento */}
        <Column icon={<Handshake className="h-4 w-4" />} title="Pareamento">
          <Field label="Status" value={PAIR_STATUS_LABEL[pair.status]} />
          <Field label="Responsável" value={pair.responsavel_name} />
          <Field label="Data" value={pair.data_pareamento} />
          {pair.source_match_id && (
            <Field label="Match origem" value={pair.source_match_id.slice(0, 8)} />
          )}
          {pair.lost_reason && <Field label="Motivo perda" value={pair.lost_reason} />}
          {pair.notes && (
            <div className="pt-2 mt-2 border-t border-zinc-800">
              <div className="text-xs text-zinc-500 mb-1">Notas</div>
              <div className="text-sm text-zinc-300 whitespace-pre-wrap break-words">{pair.notes}</div>
            </div>
          )}
        </Column>

        {/* Comprador */}
        <Column icon={<User className="h-4 w-4" />} title="Comprador">
          <Field label={pair.buyer_profile_id ? "Comprador" : "CNPJ"} value={buyerLabel} />
          {pair.buyer_profile_company && <Field label="Empresa" value={pair.buyer_profile_company} />}
          {pair.buy_setor && <Field label="Setor" value={pair.buy_setor} />}
          {pair.buy_uf && <Field label="UF" value={pair.buy_uf} />}
          <Field label="Comissão" value={`${pair.comissao_buy_pct}%`} />
        </Column>
      </div>

      <div className="px-6 pb-8 space-y-4">
        <PairSignaturesTimeline pairId={pair.id} />
        <PairClosingEmailsCard pairId={pair.id} pairStatus={pair.status} />
        <div className="text-xs text-zinc-500">
          Quando o NBO for assinado, o par avança automaticamente para <strong>signed</strong>.
          SPA/closing assinado avança para <strong>closed</strong>. Vendedor, comprador e advisor recebem notificação.
        </div>
      </div>
    </div>
  );
}

function Column({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-zinc-900/60 backdrop-blur-md border border-zinc-800 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3 text-zinc-300 text-sm font-medium">
        {icon} {title}
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="flex justify-between gap-2 text-sm">
      <span className="text-zinc-500">{label}</span>
      <span className="text-zinc-100 text-right truncate max-w-[60%]">{value ?? "—"}</span>
    </div>
  );
}
