import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { InvestirShell } from "@/components/investir/InvestirShell";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Loader2, CheckCircle2, ArrowRight } from "lucide-react";
import { photos } from "@/lib/investirPhotos";

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
      <div className="grid lg:grid-cols-2 min-h-[calc(100vh-3.5rem)]">
        {/* Lado esquerdo — Carbon motivacional */}
        <div className="relative bg-carbon overflow-hidden hidden lg:block">
          <img
            src={photos.heroJovemCelular}
            alt=""
            className="absolute inset-0 w-full h-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-carbon via-carbon/85 to-carbon/60" />
          <div className="relative h-full flex flex-col justify-between p-12">
            <Link to="/investir" className="flex items-center gap-2 text-bone">
              <div className="w-8 h-8 rounded-md bg-volt grid place-items-center">
                <span className="text-carbon font-black text-sm">m</span>
              </div>
              <span className="font-semibold">mari<span className="text-volt">.</span>invest</span>
            </Link>

            <div>
              <h2 className="text-4xl xl:text-5xl font-semibold text-bone leading-tight">
                Vire sócio de empresas <span className="text-volt">brasileiras de verdade.</span>
              </h2>
              <p className="mt-5 text-bone/70 text-lg max-w-md">
                Cadastro grátis em 1 minuto. Comece a investir a partir de R$ 100.
              </p>

              <ul className="mt-8 space-y-3 text-bone/80 text-sm">
                {[
                  "Sem taxa de abertura ou mensalidade",
                  "Aprovação de cadastro em até 1 dia útil",
                  "Pix instantâneo pra começar a investir",
                  "Acompanhamento da sua carteira em tempo real",
                ].map(t => (
                  <li key={t} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-volt grid place-items-center shrink-0">
                      <CheckCircle2 className="w-3 h-3 text-carbon" strokeWidth={3} />
                    </div>
                    {t}
                  </li>
                ))}
              </ul>
            </div>

            <div className="text-[11px] text-bone/40">
              Investimentos em empresas privadas envolvem risco. Leia os documentos antes de investir.
            </div>
          </div>
        </div>

        {/* Lado direito — Bone formulário */}
        <div className="bg-[#FAFAF7] flex items-center justify-center p-6 md:p-12">
          <div className="w-full max-w-md">
            <div className="flex justify-end gap-1 text-xs mb-8">
              <button
                onClick={() => setMode("signin")}
                className={`px-4 py-2 rounded-full transition-colors ${mode === "signin" ? "bg-carbon text-bone" : "text-carbon/60 hover:bg-carbon/5"}`}
              >
                Entrar
              </button>
              <button
                onClick={() => setMode("signup")}
                className={`px-4 py-2 rounded-full transition-colors ${mode === "signup" ? "bg-carbon text-bone" : "text-carbon/60 hover:bg-carbon/5"}`}
              >
                Criar conta
              </button>
            </div>

            <h1 className="text-3xl md:text-4xl font-semibold text-carbon tracking-tight">
              {mode === "signup" ? "Crie sua conta grátis" : "Bem-vindo de volta"}
            </h1>
            <p className="mt-2 text-carbon/60 text-sm">
              {mode === "signup" ? "Em menos de 1 minuto você está dentro." : "Acesse sua carteira e oportunidades."}
            </p>

            <div className="space-y-3 mt-8">
              {mode === "signup" && (
                <Input placeholder="Seu nome completo" value={fullName} onChange={e=>setFullName(e.target.value)} className="bg-white border-carbon/15 text-carbon h-12 rounded-xl" />
              )}
              <Input type="email" placeholder="E-mail" value={email} onChange={e=>setEmail(e.target.value)} className="bg-white border-carbon/15 text-carbon h-12 rounded-xl" />
              <Input type="password" placeholder="Senha" value={password} onChange={e=>setPassword(e.target.value)} className="bg-white border-carbon/15 text-carbon h-12 rounded-xl" />
              <Button onClick={handle} disabled={loading || !email || !password} className="w-full bg-volt hover:bg-volt/90 text-carbon font-semibold h-14 rounded-full text-base">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                  <span className="inline-flex items-center gap-2">
                    {mode === "signup" ? "Criar minha conta" : "Entrar"} <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </Button>
            </div>

            {mode === "signin" && (
              <div className="mt-4 text-center">
                <Link to="/reset-password" className="text-xs text-carbon/60 hover:text-volt underline">
                  Esqueci minha senha
                </Link>
              </div>
            )}

            <div className="mt-8 text-[11px] text-carbon/50 text-center leading-relaxed">
              Ao continuar você aceita os <Link to="/terms" className="underline">Termos</Link> e
              confirma estar ciente dos <Link to="/investir/riscos" className="underline">riscos do investimento</Link> em ativos privados.
            </div>
          </div>
        </div>
      </div>
    </InvestirShell>
  );
}
