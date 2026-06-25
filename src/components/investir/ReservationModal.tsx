import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  ShieldCheck,
  AlertCircle,
  Loader2,
  ArrowLeft,
  ArrowRight,
  Check,
  Wallet,
  X,
} from "lucide-react";

const fmtBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 2 }).format(n || 0);

type Status = "loading" | "not_authed" | "needs_kyc" | "needs_suit" | "kyc_pending" | "ready";

function useIsMobile() {
  const [m, setM] = useState(typeof window !== "undefined" ? window.innerWidth < 768 : true);
  useEffect(() => {
    const onR = () => setM(window.innerWidth < 768);
    window.addEventListener("resize", onR);
    return () => window.removeEventListener("resize", onR);
  }, []);
  return m;
}

export function ReservationModal({ open, onClose, token, initialAmount }: { open: boolean; onClose: () => void; token: any; initialAmount?: number }) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const minTicket = token?.min_ticket || 0;
  const price = token?.initial_price || 1;

  const [amount, setAmount] = useState<number>(initialAmount || minTicket || 100);
  const [step, setStep] = useState<1 | 2>(1);
  const [accepted, setAccepted] = useState(false);
  const [status, setStatus] = useState<Status>("loading");
  const [wallet, setWallet] = useState<{ available_balance: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setAccepted(false);
    setAmount(minTicket || 100);
    (async () => {
      setStatus("loading");
      const { data: ures } = await supabase.auth.getUser();
      const user = ures?.user;
      if (!user) {
        setStatus("not_authed");
        return;
      }
      const [{ data: kyc }, { data: suit }, { data: w }] = await Promise.all([
        supabase.from("investor_kyc").select("status").eq("user_id", user.id).maybeSingle(),
        supabase.from("investor_suitability").select("id").eq("user_id", user.id).maybeSingle(),
        supabase.from("financial_wallets").select("available_balance").eq("user_id", user.id).maybeSingle(),
      ]);
      setWallet(w ? { available_balance: Number(w.available_balance) } : { available_balance: 0 });
      if (!kyc || kyc.status === "rejected") {
        setStatus("needs_kyc");
        return;
      }
      if (kyc.status !== "approved") {
        setStatus("kyc_pending");
        return;
      }
      if (!suit) {
        setStatus("needs_suit");
        return;
      }
      setStatus("ready");
    })();
  }, [open, minTicket]);

  const qty = useMemo(() => (price ? amount / price : 0), [amount, price]);
  const available = wallet?.available_balance || 0;
  const insufficient = amount > available;
  const belowMin = amount < minTicket;
  const canContinue = !insufficient && !belowMin && qty > 0;

  async function handleReserve() {
    setSubmitting(true);
    try {
      const { data: ures } = await supabase.auth.getUser();
      const userId = ures.user!.id;

      const { data: check } = await supabase
        .from("compliance_checks")
        .insert({ user_id: userId, check_type: "eligibility", status: "passed", entity_type: "token", entity_id: token.id })
        .select("id")
        .single();

      const { data: cur, error: curErr } = await supabase.from("financial_wallets").select("*").eq("user_id", userId).single();
      if (curErr || !cur) throw curErr || new Error("Carteira não encontrada");

      const { error: wErr } = await supabase.from("financial_wallets").update({
        available_balance: Number((Number(cur.available_balance) - amount).toFixed(2)),
        blocked_balance: Number((Number(cur.blocked_balance) + amount).toFixed(2)),
      }).eq("user_id", userId);
      if (wErr) throw wErr;

      await supabase.from("financial_ledger").insert({
        user_id: userId,
        type: "reservation_block",
        amount,
        balance_before: Number(cur.available_balance),
        balance_after: Number(cur.available_balance) - amount,
        reference_type: "token",
        reference_id: token.id,
        description: `Reserva ${token.symbol}`,
      });

      const { error: rErr } = await supabase.from("primary_reservations").insert({
        user_id: userId,
        token_id: token.id,
        quantity: qty,
        unit_price: price,
        total_amount: amount,
        status: "confirmed",
        compliance_check_id: check?.id,
      });
      if (rErr) throw rErr;

      toast.success("Reserva confirmada!");
      onClose();
      navigate("/investir/reservas");
    } catch (e: any) {
      toast.error(e.message || "Falha ao reservar");
    } finally {
      setSubmitting(false);
    }
  }

  const Body = (
    <>
      {/* HEADER */}
      <div className="px-5 md:px-6 pt-5 pb-4 border-b border-bone/10 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-wider text-bone/40">Você está comprando</div>
          <div className="text-base md:text-lg font-semibold text-bone mt-0.5 break-words leading-tight">
            {token?.name || token?.symbol}
          </div>
        </div>
        <button onClick={onClose} className="text-bone/50 hover:text-bone shrink-0 p-1 -mr-1" aria-label="Fechar">
          <X className="w-5 h-5" />
        </button>
      </div>

      {status === "loading" && (
        <div className="py-14 text-center text-bone/60 text-sm">
          <Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Carregando…
        </div>
      )}

      {status === "not_authed" && (
        <Gate
          title="Entre para investir"
          desc="Crie sua conta gratuita em 2 minutos."
          cta="Criar conta"
          onClick={() => navigate("/investir/auth?mode=signup")}
        />
      )}
      {status === "needs_kyc" && (
        <Gate
          title="Confirme sua identidade"
          desc="Precisamos de um documento com foto antes da sua primeira reserva."
          cta="Confirmar agora"
          onClick={() => navigate("/investir/onboarding/kyc")}
        />
      )}
      {status === "kyc_pending" && (
        <Gate
          icon={<Loader2 className="animate-spin" />}
          title="Estamos analisando"
          desc="Seus documentos estão em revisão. Avisaremos por e-mail quando liberar."
          cta="Entendi"
          onClick={onClose}
        />
      )}
      {status === "needs_suit" && (
        <Gate
          title="Defina seu perfil de investidor"
          desc="Um questionário rápido pra recomendar ofertas adequadas a você."
          cta="Responder (2 min)"
          onClick={() => navigate("/investir/onboarding/suitability")}
        />
      )}

      {status === "ready" && step === 1 && (
        <div className="p-5 md:p-6 space-y-4">
          {/* Saldo */}
          <div className="flex items-center justify-between bg-graphite/50 border border-bone/10 rounded-xl px-4 py-3">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-bone/40">Saldo disponível</div>
              <div className="text-base font-semibold text-bone tabular-nums">{fmtBRL(available)}</div>
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
                navigate("/investir/carteira");
              }}
              className="text-xs text-volt hover:underline flex items-center gap-1"
            >
              <Wallet className="w-3.5 h-3.5" /> Adicionar
            </button>
          </div>

          {/* Valor — GRANDE estilo boleta */}
          <div>
            <label className="text-xs uppercase tracking-wider text-bone/50 mb-2 block">Quanto quero investir</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-bone/50 font-semibold text-lg">R$</span>
              <input
                type="text"
                inputMode="decimal"
                value={amount.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^\d]/g, "");
                  setAmount(raw ? Number(raw) / 100 : 0);
                }}
                className="w-full bg-graphite/40 border border-bone/10 rounded-xl py-5 pl-14 pr-4 text-3xl md:text-2xl font-semibold text-bone tabular-nums focus:border-volt/50 focus:outline-none"
              />
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2">
              {[100, 500, 1000].map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setAmount((a) => a + v)}
                  className="py-2 text-xs bg-bone/5 hover:bg-volt/15 hover:text-volt border border-bone/10 rounded-lg text-bone/75 transition-colors font-medium"
                >
                  +R${v}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setAmount(available)}
                className="py-2 text-xs bg-bone/5 hover:bg-volt/15 hover:text-volt border border-bone/10 rounded-lg text-bone/75 transition-colors font-medium"
              >
                Tudo
              </button>
            </div>
          </div>

          {/* Resumo */}
          <div className="bg-volt/5 border border-volt/20 rounded-xl p-4">
            <div className="text-xs text-bone/70">Você recebe</div>
            <div className="text-xl md:text-2xl font-semibold text-bone tabular-nums mt-1">
              {qty.toLocaleString("pt-BR", { maximumFractionDigits: 4 })}{" "}
              <span className="text-sm text-bone/60 font-normal">cotas</span>
            </div>
            <div className="text-xs text-bone/50 mt-1">a {fmtBRL(price)} por cota</div>
          </div>

          {belowMin && (
            <Alert>O mínimo desta oferta é {fmtBRL(minTicket)}.</Alert>
          )}
          {insufficient && (
            <Alert>
              Saldo insuficiente.{" "}
              <button
                onClick={() => {
                  onClose();
                  navigate("/investir/carteira");
                }}
                className="underline font-medium"
              >
                Adicionar saldo
              </button>
            </Alert>
          )}

          <Button
            onClick={() => setStep(2)}
            disabled={!canContinue}
            className="w-full bg-volt hover:bg-volt/90 text-carbon font-semibold py-6 rounded-xl text-base"
          >
            Continuar <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      )}

      {status === "ready" && step === 2 && (
        <div className="p-5 md:p-6 space-y-4">
          <button onClick={() => setStep(1)} className="text-xs text-bone/50 hover:text-bone flex items-center gap-1">
            <ArrowLeft className="w-3 h-3" /> Voltar
          </button>

          <div className="bg-graphite/40 border border-bone/10 rounded-xl divide-y divide-bone/10">
            <SumRow k="Empresa" v={token?.name || token?.symbol} />
            <SumRow k="Valor" v={fmtBRL(amount)} highlight />
            <SumRow k="Cotas" v={qty.toLocaleString("pt-BR", { maximumFractionDigits: 4 })} />
            <SumRow k="Preço por cota" v={fmtBRL(price)} />
          </div>

          <label className="flex items-start gap-3 text-xs text-bone/65 cursor-pointer">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="mt-0.5 accent-volt w-4 h-4 shrink-0"
            />
            <span>
              Li e concordo com os <a href="#" className="text-volt hover:underline">documentos da oferta</a> e entendo
              que investimentos em empresas privadas envolvem risco de perda.
            </span>
          </label>

          <Button
            onClick={handleReserve}
            disabled={!accepted || submitting}
            className="w-full bg-volt hover:bg-volt/90 text-carbon font-semibold py-6 rounded-xl text-base"
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" /> Confirmar reserva
              </>
            )}
          </Button>

          <div className="text-[10px] text-bone/40 leading-relaxed text-center">
            Ao confirmar, {fmtBRL(amount)} fica reservado na sua carteira até a liquidação da oferta.
          </div>
        </div>
      )}
    </>
  );

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
        <SheetContent
          side="bottom"
          className="!bg-carbon border-t border-bone/10 text-bone p-0 max-h-[92vh] overflow-y-auto rounded-t-3xl [&>button]:hidden"
        >
          <div className="w-12 h-1.5 bg-bone/20 rounded-full mx-auto mt-3" aria-hidden />
          {Body}
          <div className="h-[env(safe-area-inset-bottom)]" />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="!bg-carbon border-bone/10 text-bone max-w-md p-0 overflow-hidden gap-0 [&>button]:hidden">
        {Body}
      </DialogContent>
    </Dialog>
  );
}

function Alert({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 p-3 rounded-lg">
      <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
      <div>{children}</div>
    </div>
  );
}

function SumRow({ k, v, highlight }: { k: string; v: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-xs uppercase tracking-wider text-bone/40">{k}</span>
      <span className={`tabular-nums text-right ${highlight ? "text-volt text-lg font-semibold" : "text-bone font-medium"}`}>
        {v}
      </span>
    </div>
  );
}

function Gate({ icon, title, desc, cta, onClick }: { icon?: React.ReactNode; title: string; desc: string; cta: string; onClick: () => void }) {
  return (
    <div className="text-center px-6 py-10 space-y-4">
      <div className="w-14 h-14 rounded-full bg-volt/15 text-volt grid place-items-center mx-auto">
        {icon || <ShieldCheck className="w-6 h-6" />}
      </div>
      <div>
        <div className="text-bone font-semibold text-lg">{title}</div>
        <div className="text-sm text-bone/60 mt-1.5 max-w-xs mx-auto leading-relaxed">{desc}</div>
      </div>
      <Button onClick={onClick} className="bg-volt hover:bg-volt/90 text-carbon font-semibold py-5 px-6 rounded-xl w-full">
        {cta}
      </Button>
    </div>
  );
}
