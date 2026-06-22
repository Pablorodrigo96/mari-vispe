import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { InvestirShell } from "@/components/investir/InvestirShell";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, ShieldCheck } from "lucide-react";

export default function InvestirAuth() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">(params.get("mode") === "signup" ? "signup" : "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  async function handle() {
    setLoading(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: `${window.location.origin}/investir/painel`, data: { full_name: fullName } },
        });
        if (error) throw error;
        if (data.user) {
          await supabase.from("user_roles").insert({ user_id: data.user.id, role: "investor" as any }).then(()=>{}, ()=>{});
        }
        toast.success("Conta criada! Complete o onboarding.");
        navigate("/investir/onboarding/kyc");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate("/investir/painel");
      }
    } catch (e: any) {
      toast.error(e.message || "Erro");
    } finally {
      setLoading(false);
    }
  }

  return (
    <InvestirShell>
      <div className="max-w-md mx-auto px-6 py-20">
        <div className="bg-graphite/40 border border-bone/10 rounded-2xl p-8">
          <div className="w-12 h-12 rounded-full bg-volt/15 grid place-items-center mx-auto mb-4">
            <ShieldCheck className="w-5 h-5 text-volt" />
          </div>
          <h1 className="text-2xl font-semibold text-bone text-center mb-1">
            {mode === "signup" ? "Criar conta de investidor" : "Entrar"}
          </h1>
          <p className="text-center text-bone/50 text-sm mb-6">
            {mode === "signup" ? "Comece o cadastro em menos de 1 minuto." : "Acesse sua carteira e ofertas."}
          </p>

          <div className="space-y-3">
            {mode === "signup" && (
              <Input placeholder="Nome completo" value={fullName} onChange={e=>setFullName(e.target.value)} className="bg-carbon border-bone/10 text-bone" />
            )}
            <Input type="email" placeholder="E-mail" value={email} onChange={e=>setEmail(e.target.value)} className="bg-carbon border-bone/10 text-bone" />
            <Input type="password" placeholder="Senha" value={password} onChange={e=>setPassword(e.target.value)} className="bg-carbon border-bone/10 text-bone" />
            <Button onClick={handle} disabled={loading || !email || !password} className="w-full bg-volt hover:bg-volt/90 text-carbon font-semibold py-6">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (mode==="signup" ? "Criar conta" : "Entrar")}
            </Button>
          </div>

          <div className="mt-6 text-center text-sm text-bone/50">
            {mode==="signup" ? "Já tem conta?" : "Ainda não tem conta?"}{" "}
            <button onClick={()=>setMode(mode==="signup"?"signin":"signup")} className="text-volt hover:underline">
              {mode==="signup" ? "Entrar" : "Criar agora"}
            </button>
          </div>

          <div className="mt-6 text-[10px] text-bone/40 text-center leading-relaxed">
            Ao continuar você aceita os <Link to="/terms" className="underline">Termos</Link> e
            confirma estar ciente dos riscos do investimento em ativos privados.
          </div>
        </div>
      </div>
    </InvestirShell>
  );
}
