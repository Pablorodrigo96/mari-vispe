import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Wallet, ShieldCheck, AlertCircle, Loader2 } from "lucide-react";

const fmtBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 }).format(n || 0);

type Status = "loading" | "not_authed" | "needs_kyc" | "needs_suit" | "kyc_pending" | "ready";

export function ReservationModal({ open, onClose, token }: { open: boolean; onClose: () => void; token: any }) {
  const navigate = useNavigate();
  const [amount, setAmount] = useState<string>(String(token?.min_ticket || 100));
  const [status, setStatus] = useState<Status>("loading");
  const [wallet, setWallet] = useState<{ available_balance: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    (async () => {
      setStatus("loading");
      const { data: ures } = await supabase.auth.getUser();
      const user = ures?.user;
      if (!user) { setStatus("not_authed"); return; }

      const [{ data: kyc }, { data: suit }, { data: w }] = await Promise.all([
        supabase.from("investor_kyc").select("status").eq("user_id", user.id).maybeSingle(),
        supabase.from("investor_suitability").select("id").eq("user_id", user.id).maybeSingle(),
        supabase.from("financial_wallets").select("available_balance").eq("user_id", user.id).maybeSingle(),
      ]);

      setWallet(w || { available_balance: 0 });
      if (!kyc || kyc.status === "rejected") { setStatus("needs_kyc"); return; }
      if (kyc.status !== "approved") { setStatus("kyc_pending"); return; }
      if (!suit) { setStatus("needs_suit"); return; }
      setStatus("ready");
    })();
  }, [open]);

  const amountNum = parseFloat(amount.replace(",", ".")) || 0;
  const qty = token?.initial_price ? amountNum / token.initial_price : 0;
  const minTicket = token?.min_ticket || 0;
  const insufficient = wallet ? amountNum > wallet.available_balance : false;
  const belowMin = amountNum < minTicket;
  const canSubmit = status === "ready" && !insufficient && !belowMin && qty > 0;

  async function handleReserve() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const { data: ures } = await supabase.auth.getUser();
      const userId = ures.user!.id;

      // 1. log compliance check
      const { data: check } = await supabase
        .from("compliance_checks")
        .insert({ user_id: userId, check_type: "eligibility", status: "passed", entity_type: "token", entity_id: token.id })
        .select("id")
        .single();

      // 2. block balance in wallet
      const newAvailable = (wallet!.available_balance - amountNum).toFixed(2);
      const { error: wErr } = await supabase
        .from("financial_wallets")
        .update({ available_balance: Number(newAvailable), blocked_balance: undefined })
        .eq("user_id", userId);
      // Para atualizar blocked usamos RPC-style com select+update — simplificado: faz dois updates
      await supabase.rpc as any;

      // Fallback: leitura atual e update completo
      const { data: cur } = await supabase.from("financial_wallets").select("*").eq("user_id", userId).single();
      await supabase.from("financial_wallets").update({
        available_balance: Number((cur!.available_balance - amountNum).toFixed(2)),
        blocked_balance: Number((cur!.blocked_balance + amountNum).toFixed(2)),
      }).eq("user_id", userId);

      // 3. ledger
      await supabase.from("financial_ledger").insert({
        user_id: userId,
        type: "reservation_block",
        amount: amountNum,
        balance_before: cur!.available_balance,
        balance_after: cur!.available_balance - amountNum,
        reference_type: "token",
        reference_id: token.id,
        description: `Reserva ${token.symbol}`,
      });

      // 4. create reservation
      const { error: rErr } = await supabase.from("primary_reservations").insert({
        user_id: userId,
        token_id: token.id,
        quantity: qty,
        unit_price: token.initial_price,
        total_amount: amountNum,
        status: "confirmed",
        compliance_check_id: check?.id,
      });
      if (rErr) throw rErr;

      toast.success("Reserva confirmada! Aguarde aprovação para alocação.");
      onClose();
      navigate("/investir/reservas");
    } catch (e: any) {
      toast.error(e.message || "Falha ao reservar");
      if (wErr) console.error(wErr);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="!bg-carbon border-bone/10 text-bone max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-bone">Reservar {token?.symbol}</DialogTitle>
          <DialogDescription className="text-bone/60">
            {token?.name} · {fmtBRL(token?.initial_price || 0)}/token · mínimo {fmtBRL(token?.min_ticket || 0)}
          </DialogDescription>
        </DialogHeader>

        {status === "loading" && (
          <div className="py-8 text-center text-bone/60 text-sm">
            <Loader2 className="w-5 h-5 animate-spin inline" /> Validando elegibilidade...
          </div>
        )}

        {status === "not_authed" && (
          <Gate
            icon={<ShieldCheck />}
            title="Você precisa entrar"
            desc="Crie sua conta de investidor ou faça login para reservar."
            cta="Entrar"
            onClick={() => navigate("/investir/auth?mode=signup")}
          />
        )}
        {status === "needs_kyc" && (
          <Gate icon={<ShieldCheck />} title="Complete seu KYC" desc="Precisamos confirmar sua identidade antes da reserva." cta="Fazer KYC" onClick={()=>navigate("/investir/onboarding/kyc")} />
        )}
        {status === "kyc_pending" && (
          <Gate icon={<Loader2 className="animate-spin" />} title="KYC em análise" desc="Estamos revisando seus documentos. Você será notificado quando aprovado." cta="OK" onClick={onClose} />
        )}
        {status === "needs_suit" && (
          <Gate icon={<ShieldCheck />} title="Defina seu perfil" desc="Faça o questionário de suitability para liberar a reserva." cta="Responder agora" onClick={()=>navigate("/investir/onboarding/suitability")} />
        )}

        {status === "ready" && (
          <div className="space-y-5">
            <div>
              <label className="text-xs uppercase tracking-wider text-bone/50 mb-2 block">Valor a reservar (R$)</label>
              <Input
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g,""))}
                className="bg-graphite/40 border-bone/10 text-bone text-xl font-mono tabular-nums"
              />
              <div className="mt-2 text-xs text-bone/50 flex justify-between">
                <span>Saldo disponível: <span className="font-mono text-bone">{fmtBRL(wallet?.available_balance || 0)}</span></span>
                <button
                  type="button"
                  onClick={()=>setAmount(String(wallet?.available_balance || 0))}
                  className="text-volt hover:underline"
                >
                  Usar tudo
                </button>
              </div>
            </div>

            <div className="bg-graphite/30 border border-bone/10 rounded-lg p-4 space-y-2 text-sm">
              <Row k="Quantidade de tokens" v={qty.toFixed(4)} />
              <Row k="Preço unitário" v={fmtBRL(token?.initial_price || 0)} />
              <div className="h-px bg-bone/10 my-2" />
              <Row k="Total a bloquear" v={fmtBRL(amountNum)} strong />
            </div>

            {belowMin && (
              <div className="flex items-start gap-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 p-3 rounded">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> Valor abaixo do ticket mínimo de {fmtBRL(minTicket)}.
              </div>
            )}
            {insufficient && (
              <div className="flex items-start gap-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 p-3 rounded">
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> Saldo insuficiente. <button onClick={()=>{onClose(); navigate("/investir/carteira");}} className="underline">Depositar agora</button>
              </div>
            )}

            <Button
              onClick={handleReserve}
              disabled={!canSubmit || submitting}
              className="w-full bg-volt hover:bg-volt/90 text-carbon font-semibold py-6"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Wallet className="w-4 h-4 mr-2" /> Confirmar reserva</>}
            </Button>

            <p className="text-[10px] text-bone/40 leading-relaxed">
              Ao confirmar, o valor é bloqueado na sua carteira interna até a alocação pela equipe de compliance.
              Você pode cancelar enquanto a reserva estiver em status "confirmed".
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-bone/60">{k}</span>
      <span className={`font-mono tabular-nums ${strong ? "text-volt text-lg font-semibold" : "text-bone"}`}>{v}</span>
    </div>
  );
}

function Gate({ icon, title, desc, cta, onClick }: any) {
  return (
    <div className="text-center py-6 space-y-4">
      <div className="w-12 h-12 rounded-full bg-volt/15 text-volt grid place-items-center mx-auto">{icon}</div>
      <div>
        <div className="text-bone font-medium">{title}</div>
        <div className="text-sm text-bone/60 mt-1">{desc}</div>
      </div>
      <Button onClick={onClick} className="bg-volt hover:bg-volt/90 text-carbon font-medium">{cta}</Button>
    </div>
  );
}
