import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { InvestirShell } from "@/components/investir/InvestirShell";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { ClipboardList, ArrowRight, ChevronRight } from "lucide-react";

const fmtBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 }).format(n || 0);

const STATUS: Record<string, { label: string; cls: string }> = {
  pending_payment: { label: "Aguardando", cls: "text-amber-400 bg-amber-500/10" },
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
      if (!ures.user) {
        navigate("/investir/auth");
        return;
      }
      const { data } = await supabase
        .from("primary_reservations")
        .select("*, tokens(symbol,name,instrument_type)")
        .eq("user_id", ures.user.id)
        .order("created_at", { ascending: false });
      setList(data || []);
      setLoading(false);
    })();
  }, [navigate]);

  return (
    <InvestirShell authed>
      <div className="bg-carbon min-h-[calc(100vh-3.5rem)]">
        <div className="bg-gradient-to-br from-carbon to-graphite/30 border-b border-bone/10">
          <div className="max-w-3xl mx-auto px-5 md:px-6 py-6 md:py-10">
            <div className="flex items-center gap-2 text-bone/55 text-xs mb-2">
              <ClipboardList className="w-3.5 h-3.5" /> Reservas
            </div>
            <h1 className="text-2xl md:text-3xl font-semibold text-bone">Minhas reservas</h1>
            <p className="text-bone/55 text-sm mt-1.5">Histórico das suas reservas em ofertas.</p>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-5 md:px-6 py-6">
          {loading ? (
            <Skeleton className="h-32 bg-graphite/40 rounded-2xl" />
          ) : list.length === 0 ? (
            <div className="border border-dashed border-bone/15 rounded-2xl p-10 text-center">
              <div className="text-bone/85 mb-2 text-base">Nenhuma reserva ainda</div>
              <p className="text-xs text-bone/55 mb-5">Comece investindo em uma empresa.</p>
              <Link
                to="/investir/empresas"
                className="inline-flex items-center gap-2 bg-volt hover:bg-volt/90 text-carbon font-semibold px-5 py-2.5 rounded-full text-sm"
              >
                Ver oportunidades <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <div className="bg-graphite/30 border border-bone/10 rounded-2xl divide-y divide-bone/5 overflow-hidden">
              {list.map((r) => {
                const st = STATUS[r.status] || { label: r.status, cls: "text-bone/40 bg-bone/5" };
                return (
                  <Link
                    key={r.id}
                    to={`/investir/ativo/${r.tokens?.symbol}`}
                    className="flex items-center gap-3 px-4 py-3.5 hover:bg-bone/5 active:bg-bone/10 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-lg bg-volt/15 text-volt grid place-items-center font-mono text-[11px] font-semibold shrink-0">
                      {r.tokens?.symbol?.slice(0, 3)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-bone truncate">{r.tokens?.name}</div>
                      <div className="text-[11px] text-bone/45 flex items-center gap-2">
                        <span>{new Date(r.created_at).toLocaleDateString("pt-BR")}</span>
                        <span className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded ${st.cls}`}>
                          {st.label}
                        </span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-semibold text-bone font-mono tabular-nums">
                        {fmtBRL(Number(r.total_amount))}
                      </div>
                      <div className="text-[11px] text-bone/45 tabular-nums">
                        {Number(r.quantity).toFixed(2)} cotas
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-bone/30 shrink-0" />
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </InvestirShell>
  );
}
