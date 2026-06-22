import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { InvestirShell } from "@/components/investir/InvestirShell";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Wallet, ArrowDownToLine, ArrowUpFromLine, Loader2 } from "lucide-react";
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
    if (!ures.user) { navigate("/investir/auth"); return; }
    const uid = ures.user.id;
    const [w, l] = await Promise.all([
      supabase.from("financial_wallets").select("*").eq("user_id", uid).maybeSingle(),
      supabase.from("financial_ledger").select("*").eq("user_id", uid).order("created_at", { ascending: false }).limit(50),
    ]);
    if (!w.data) {
      // cria wallet caso ainda não exista
      await supabase.from("financial_wallets").insert({ user_id: uid });
      const { data: w2 } = await supabase.from("financial_wallets").select("*").eq("user_id", uid).single();
      setWallet(w2);
    } else setWallet(w.data);
    setLedger(l.data || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleDeposit() {
    const amt = parseFloat(depositAmount.replace(",","."));
    if (!amt || amt <= 0) return;
    setSubmitting(true);
    try {
      const { data: ures } = await supabase.auth.getUser();
      const uid = ures.user!.id;
      const { data: cur } = await supabase.from("financial_wallets").select("*").eq("user_id", uid).single();
      const newBal = Number(cur!.available_balance) + amt;
      await supabase.from("financial_wallets").update({ available_balance: newBal }).eq("user_id", uid);
      await supabase.from("financial_ledger").insert({
        user_id: uid, type: "deposit", amount: amt,
        balance_before: Number(cur!.available_balance), balance_after: newBal,
        reference_type: "pix_mock", description: "Depósito simulado (Pix)",
      });
      toast.success("Depósito creditado!");
      setDepositOpen(false);
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally { setSubmitting(false); }
  }

  return (
    <InvestirShell authed>
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center gap-3 mb-2">
          <Wallet className="w-6 h-6 text-volt" />
          <h1 className="text-3xl font-semibold text-bone">Carteira financeira</h1>
        </div>
        <p className="text-bone/50 mb-8">Saldo em reais para participar das ofertas.</p>

        <div className="grid md:grid-cols-3 gap-4 mb-8">
          <Bal label="Disponível" value={Number(wallet?.available_balance || 0)} primary />
          <Bal label="Bloqueado (reservas)" value={Number(wallet?.blocked_balance || 0)} />
          <Bal label="Em liquidação" value={Number(wallet?.pending_settlement_balance || 0)} />
        </div>

        <div className="flex gap-3 mb-10">
          <Button onClick={()=>setDepositOpen(true)} className="bg-volt hover:bg-volt/90 text-carbon font-semibold">
            <ArrowDownToLine className="w-4 h-4 mr-2" /> Depositar
          </Button>
          <Button variant="outline" disabled className="border-bone/20 text-bone bg-transparent hover:bg-bone/5">
            <ArrowUpFromLine className="w-4 h-4 mr-2" /> Sacar (manual)
          </Button>
        </div>

        <section>
          <h2 className="text-lg font-semibold text-bone mb-4">Extrato</h2>
          {loading ? (
            <div className="text-bone/50 text-sm">Carregando...</div>
          ) : ledger.length === 0 ? (
            <div className="border border-dashed border-bone/15 rounded-xl p-8 text-center text-bone/50 text-sm">
              Sem movimentações.
            </div>
          ) : (
            <div className="border border-bone/10 rounded-xl overflow-hidden bg-graphite/20">
              <div className="grid grid-cols-[1fr_2fr_1fr_1fr] gap-3 px-5 py-3 text-[10px] uppercase tracking-wider text-bone/40 bg-carbon/40">
                <div>Data</div><div>Descrição</div><div className="text-right">Valor</div><div className="text-right">Saldo após</div>
              </div>
              {ledger.map(l => (
                <div key={l.id} className="grid grid-cols-[1fr_2fr_1fr_1fr] gap-3 px-5 py-3 items-center text-sm border-t border-bone/5">
                  <div className="text-bone/60 text-xs">{new Date(l.created_at).toLocaleString("pt-BR")}</div>
                  <div className="text-bone">{l.description || l.type}</div>
                  <div className={`text-right font-mono tabular-nums ${l.type.includes("block") || l.type.includes("withdrawal") ? "text-amber-400" : "text-volt"}`}>
                    {l.type.includes("block") || l.type.includes("withdrawal") || l.type === "allocation_debit" ? "-" : "+"}{fmtBRL(Number(l.amount))}
                  </div>
                  <div className="text-right font-mono tabular-nums text-bone/60">{fmtBRL(Number(l.balance_after))}</div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <Dialog open={depositOpen} onOpenChange={setDepositOpen}>
        <DialogContent className="!bg-carbon border-bone/10 text-bone">
          <DialogHeader>
            <DialogTitle className="text-bone">Depositar via Pix</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-bone/50 mb-2 block">Valor</label>
              <Input
                value={depositAmount}
                onChange={e=>setDepositAmount(e.target.value.replace(/[^\d.,]/g,""))}
                className="bg-graphite/40 border-bone/10 text-bone text-xl font-mono"
                inputMode="decimal"
              />
            </div>
            <div className="text-xs text-bone/50 bg-graphite/40 p-3 rounded">
              Esta versão simula o depósito instantaneamente. Integração com Pix/Stripe real será habilitada na próxima fase.
            </div>
            <Button onClick={handleDeposit} disabled={submitting} className="w-full bg-volt hover:bg-volt/90 text-carbon font-semibold">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirmar depósito"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </InvestirShell>
  );
}

function Bal({ label, value, primary }: { label: string; value: number; primary?: boolean }) {
  return (
    <div className={`rounded-xl p-5 border ${primary ? "border-volt/40 bg-volt/10" : "border-bone/10 bg-graphite/40"}`}>
      <div className="text-[11px] uppercase tracking-wider text-bone/50">{label}</div>
      <div className={`text-2xl font-semibold tabular-nums mt-1 ${primary ? "text-volt" : "text-bone"}`}>{fmtBRL(value)}</div>
    </div>
  );
}
