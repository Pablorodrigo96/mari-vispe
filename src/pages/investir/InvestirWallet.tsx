import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { InvestirShell } from "@/components/investir/InvestirShell";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Wallet, ArrowDownToLine, ArrowUpFromLine, Loader2, ArrowRight, Plus } from "lucide-react";
import { toast } from "sonner";

const fmtBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 }).format(n || 0);

export default function InvestirWallet() {
  const navigate = useNavigate();
  const [wallet, setWallet] = useState<any>(null);
  const [ledger, setLedger] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [depositOpen, setDepositOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState("500");
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    const { data: ures } = await supabase.auth.getUser();
    if (!ures.user) {
      navigate("/investir/auth");
      return;
    }
    const uid = ures.user.id;
    const [w, l] = await Promise.all([
      supabase.from("financial_wallets").select("*").eq("user_id", uid).maybeSingle(),
      supabase.from("financial_ledger").select("*").eq("user_id", uid).order("created_at", { ascending: false }).limit(50),
    ]);
    if (!w.data) {
      await supabase.from("financial_wallets").insert({ user_id: uid });
      const { data: w2 } = await supabase.from("financial_wallets").select("*").eq("user_id", uid).single();
      setWallet(w2);
    } else setWallet(w.data);
    setLedger(l.data || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDeposit() {
    const amt = parseFloat(depositAmount.replace(",", "."));
    if (!amt || amt <= 0) return;
    setSubmitting(true);
    try {
      const { data: ures } = await supabase.auth.getUser();
      const uid = ures.user!.id;
      const { data: cur } = await supabase.from("financial_wallets").select("*").eq("user_id", uid).single();
      const newBal = Number(cur!.available_balance) + amt;
      await supabase.from("financial_wallets").update({ available_balance: newBal }).eq("user_id", uid);
      await supabase.from("financial_ledger").insert({
        user_id: uid,
        type: "deposit",
        amount: amt,
        balance_before: Number(cur!.available_balance),
        balance_after: newBal,
        reference_type: "pix_mock",
        description: "Depósito simulado (Pix)",
      });
      toast.success("Depósito creditado!");
      setDepositOpen(false);
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  const available = Number(wallet?.available_balance || 0);
  const blocked = Number(wallet?.blocked_balance || 0);
  const pending = Number(wallet?.pending_settlement_balance || 0);
  const total = available + blocked + pending;

  return (
    <InvestirShell authed>
      <div className="bg-carbon min-h-[calc(100vh-3.5rem)]">
        {/* Hero saldo */}
        <div className="bg-gradient-to-br from-carbon to-graphite/40 border-b border-bone/10">
          <div className="max-w-3xl mx-auto px-5 md:px-6 pt-6 md:pt-10 pb-6">
            <div className="flex items-center gap-2 text-bone/55 text-xs">
              <Wallet className="w-3.5 h-3.5" /> Carteira
            </div>
            <div className="text-bone/45 text-xs mt-3">Saldo total</div>
            <div className="text-[40px] md:text-5xl leading-none font-semibold text-bone tabular-nums mt-1.5">
              {fmtBRL(total)}
            </div>

            <div className="flex gap-2 mt-6">
              <Button
                onClick={() => setDepositOpen(true)}
                className="flex-1 bg-volt hover:bg-volt/90 text-carbon font-semibold py-5 rounded-xl"
              >
                <Plus className="w-4 h-4 mr-1.5" /> Depositar
              </Button>
              <Button
                disabled
                variant="outline"
                className="flex-1 border-bone/20 text-bone bg-transparent py-5 rounded-xl"
              >
                <ArrowUpFromLine className="w-4 h-4 mr-1.5" /> Sacar
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-5">
              <Bal label="Disponível" value={available} primary />
              <Bal label="Reservado" value={blocked} />
              <Bal label="Liquidando" value={pending} />
            </div>
          </div>
        </div>

        {/* Extrato */}
        <div className="max-w-3xl mx-auto px-5 md:px-6 py-6">
          <h2 className="text-lg font-semibold text-bone mb-3">Extrato</h2>
          {loading ? (
            <div className="text-bone/50 text-sm">Carregando...</div>
          ) : ledger.length === 0 ? (
            <div className="border border-dashed border-bone/15 rounded-2xl p-10 text-center">
              <div className="text-bone/70 mb-2">Sem movimentações ainda</div>
              <p className="text-xs text-bone/45 mb-5">Deposite para começar a investir.</p>
              <Link
                to="/investir/empresas"
                className="inline-flex items-center gap-2 text-volt text-sm font-medium hover:underline"
              >
                Ver ofertas <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ) : (
            <div className="bg-graphite/30 border border-bone/10 rounded-2xl divide-y divide-bone/5 overflow-hidden">
              {ledger.map((l) => {
                const neg = l.type.includes("block") || l.type.includes("withdrawal") || l.type === "allocation_debit";
                return (
                  <div key={l.id} className="px-4 py-3.5 flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-full grid place-items-center shrink-0 ${
                        neg ? "bg-amber-500/10 text-amber-400" : "bg-volt/15 text-volt"
                      }`}
                    >
                      {neg ? <ArrowUpFromLine className="w-4 h-4" /> : <ArrowDownToLine className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-bone truncate">{l.description || l.type}</div>
                      <div className="text-[11px] text-bone/45">
                        {new Date(l.created_at).toLocaleDateString("pt-BR")}
                      </div>
                    </div>
                    <div className={`text-sm font-mono tabular-nums shrink-0 ${neg ? "text-amber-400" : "text-volt"}`}>
                      {neg ? "-" : "+"}
                      {fmtBRL(Number(l.amount))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Deposit sheet - bottom no mobile */}
      <Sheet open={depositOpen} onOpenChange={setDepositOpen}>
        <SheetContent
          side="bottom"
          className="!bg-carbon border-t border-bone/10 text-bone p-0 max-h-[80vh] rounded-t-3xl md:max-w-md md:mx-auto"
        >
          <div className="w-12 h-1.5 bg-bone/20 rounded-full mx-auto mt-3 md:hidden" />
          <div className="p-5 md:p-6 space-y-5">
            <div>
              <div className="text-bone font-semibold text-lg">Depositar via Pix</div>
              <div className="text-xs text-bone/50 mt-1">Saldo disponível em segundos.</div>
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider text-bone/50 mb-2 block">Valor</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-bone/50 font-semibold text-lg">R$</span>
                <Input
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value.replace(/[^\d.,]/g, ""))}
                  className="bg-graphite/40 border-bone/10 text-bone text-2xl font-semibold tabular-nums h-16 pl-14 rounded-xl"
                  inputMode="decimal"
                />
              </div>
              <div className="mt-3 grid grid-cols-4 gap-2">
                {[100, 500, 1000, 5000].map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setDepositAmount(String(v))}
                    className="py-2 text-xs bg-bone/5 hover:bg-volt/15 hover:text-volt border border-bone/10 rounded-lg text-bone/75 font-medium"
                  >
                    R${v}
                  </button>
                ))}
              </div>
            </div>
            <div className="text-[11px] text-bone/50 bg-graphite/40 p-3 rounded-lg">
              Versão simulada. Integração Pix real na próxima fase.
            </div>
            <Button
              onClick={handleDeposit}
              disabled={submitting}
              className="w-full bg-volt hover:bg-volt/90 text-carbon font-semibold py-6 rounded-xl text-base"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirmar depósito"}
            </Button>
            <div className="h-[env(safe-area-inset-bottom)]" />
          </div>
        </SheetContent>
      </Sheet>
    </InvestirShell>
  );
}

function Bal({ label, value, primary }: { label: string; value: number; primary?: boolean }) {
  return (
    <div className={`rounded-xl p-3 border ${primary ? "border-volt/40 bg-volt/10" : "border-bone/10 bg-graphite/40"}`}>
      <div className="text-[10px] uppercase tracking-wider text-bone/50">{label}</div>
      <div className={`text-sm md:text-base font-semibold tabular-nums mt-1 truncate ${primary ? "text-volt" : "text-bone"}`}>
        {fmtBRL(value)}
      </div>
    </div>
  );
}
