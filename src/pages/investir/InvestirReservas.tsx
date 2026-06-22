import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { InvestirShell } from "@/components/investir/InvestirShell";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

const fmtBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 }).format(n || 0);

const STATUS: Record<string, { label: string; cls: string }> = {
  pending_payment: { label: "Aguardando pagamento", cls: "text-amber-400 bg-amber-500/10" },
  confirmed: { label: "Confirmada", cls: "text-volt bg-volt/10" },
  allocated: { label: "Alocada", cls: "text-emerald-400 bg-emerald-500/10" },
  refunded: { label: "Estornada", cls: "text-bone/60 bg-bone/5" },
  cancelled: { label: "Cancelada", cls: "text-bone/40 bg-bone/5" },
};

export default function InvestirReservas() {
  const navigate = useNavigate();
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: ures } = await supabase.auth.getUser();
      if (!ures.user) { navigate("/investir/auth"); return; }
      const { data } = await supabase.from("primary_reservations")
        .select("*, tokens(symbol,name,instrument_type)")
        .eq("user_id", ures.user.id)
        .order("created_at", { ascending: false });
      setList(data || []);
      setLoading(false);
    })();
  }, [navigate]);

  return (
    <InvestirShell authed>
      <div className="max-w-5xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-semibold text-bone mb-2">Minhas reservas</h1>
        <p className="text-bone/50 mb-8">Histórico de reservas em ofertas primárias.</p>

        {loading ? <Skeleton className="h-40 bg-graphite/40" /> :
          list.length === 0 ? (
            <div className="border border-dashed border-bone/15 rounded-xl p-12 text-center">
              <div className="text-bone/60 mb-3">Você ainda não fez nenhuma reserva.</div>
              <Link to="/investir/empresas" className="text-volt hover:underline text-sm">Explorar ofertas →</Link>
            </div>
          ) : (
            <div className="border border-bone/10 rounded-xl overflow-hidden bg-graphite/20">
              <div className="grid grid-cols-[1.5fr_0.8fr_1fr_1fr_1fr_1fr] gap-3 px-5 py-3 text-[10px] uppercase tracking-wider text-bone/40 bg-carbon/40">
                <div>Ativo</div><div className="text-right">Qtd</div><div className="text-right">Preço</div><div className="text-right">Total</div><div>Data</div><div className="text-right">Status</div>
              </div>
              {list.map(r => (
                <div key={r.id} className="grid grid-cols-[1.5fr_0.8fr_1fr_1fr_1fr_1fr] gap-3 px-5 py-4 items-center text-sm border-t border-bone/5">
                  <div>
                    <div className="text-bone">{r.tokens?.name}</div>
                    <div className="text-[11px] font-mono text-bone/40">{r.tokens?.symbol}</div>
                  </div>
                  <div className="text-right font-mono tabular-nums text-bone">{Number(r.quantity).toFixed(4)}</div>
                  <div className="text-right font-mono tabular-nums text-bone/70">{fmtBRL(Number(r.unit_price))}</div>
                  <div className="text-right font-mono tabular-nums text-bone font-semibold">{fmtBRL(Number(r.total_amount))}</div>
                  <div className="text-bone/60 text-xs">{new Date(r.created_at).toLocaleDateString("pt-BR")}</div>
                  <div className="text-right">
                    <span className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded ${STATUS[r.status]?.cls || "text-bone/40 bg-bone/5"}`}>
                      {STATUS[r.status]?.label || r.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )
        }
      </div>
    </InvestirShell>
  );
}
