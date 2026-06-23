import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { InvestirShell } from "@/components/investir/InvestirShell";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { ArrowRight, Loader2, ArrowLeft } from "lucide-react";

export default function InvestirKYC() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [existing, setExisting] = useState<any>(null);
  const [form, setForm] = useState({
    full_name: "", cpf: "", birth_date: "", phone: "",
    address_street: "", address_city: "", address_state: "", address_cep: "",
  });

  useEffect(() => {
    (async () => {
      const { data: ures } = await supabase.auth.getUser();
      if (!ures.user) { navigate("/investir/auth"); return; }
      const { data } = await supabase.from("investor_kyc").select("*").eq("user_id", ures.user.id).maybeSingle();
      if (data) {
        setExisting(data);
        const addr = (data.address as any) || {};
        setForm({
          full_name: data.full_name || "",
          cpf: data.cpf || "",
          birth_date: data.birth_date || "",
          phone: data.phone || "",
          address_street: addr.street || "",
          address_city: addr.city || "",
          address_state: addr.state || "",
          address_cep: addr.cep || "",
        });
      }
    })();
  }, [navigate]);

  async function submit() {
    setLoading(true);
    try {
      const { data: ures } = await supabase.auth.getUser();
      const userId = ures.user!.id;
      const payload = {
        user_id: userId,
        full_name: form.full_name,
        cpf: form.cpf,
        birth_date: form.birth_date || null,
        phone: form.phone,
        address: { street: form.address_street, city: form.address_city, state: form.address_state, cep: form.address_cep },
        status: "in_review",
        submitted_at: new Date().toISOString(),
      };
      const { error } = existing
        ? await supabase.from("investor_kyc").update(payload).eq("user_id", userId)
        : await supabase.from("investor_kyc").insert(payload);
      if (error) throw error;
      toast.success("Dados enviados! Vamos para o próximo passo.");
      navigate("/investir/onboarding/suitability");
    } catch (e: any) {
      toast.error(e.message);
    } finally { setLoading(false); }
  }

  const approved = existing?.status === "approved";

  return (
    <InvestirShell authed>
      <div className="min-h-[calc(100vh-3.5rem)] bg-carbon">
        {/* Stepper */}
        <div className="border-b border-bone/10 bg-carbon/95 sticky top-14 z-30">
          <div className="max-w-3xl mx-auto px-6 py-5">
            <div className="flex items-center justify-center gap-3">
              <div className="w-8 h-8 rounded-full grid place-items-center text-xs font-semibold bg-volt text-carbon ring-4 ring-volt/20">1</div>
              <div className="w-12 h-px bg-bone/15" />
              <div className="w-8 h-8 rounded-full grid place-items-center text-xs font-semibold bg-bone/10 text-bone/40">2</div>
            </div>
            <div className="text-center text-xs text-bone/50 mt-3">
              Passo 1 de 2 · Verificação de identidade
            </div>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-6 py-12 md:py-16">
          <h1 className="text-3xl md:text-5xl font-semibold text-volt tracking-tight text-center leading-tight">
            Precisamos conhecer você melhor
          </h1>
          <p className="mt-5 text-bone/60 text-center max-w-2xl mx-auto leading-relaxed">
            Pra abrir sua conta de investidor, a CVM exige que confirmemos sua identidade.
            Os dados ficam seguros e são usados só pra validar seu cadastro.
          </p>

          {existing && (
            <div className="mt-8 max-w-2xl mx-auto px-5 py-3 rounded-full border border-volt/30 bg-volt/5 text-sm text-bone text-center">
              Status atual: <span className="text-volt font-medium">
                {{ pending: "Pendente", in_review: "Em análise", approved: "Aprovado", rejected: "Rejeitado", expired: "Expirado" }[existing.status as string] || existing.status}
              </span>
              {existing.rejection_reason && <div className="mt-1 text-amber-400 text-xs">Motivo: {existing.rejection_reason}</div>}
            </div>
          )}

          <div className="mt-10 max-w-2xl mx-auto bg-[#FAFAF7] rounded-3xl p-6 md:p-8 space-y-5">
            <Field label="Nome completo">
              <Input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} className="bg-white border-carbon/15 text-carbon h-12 rounded-xl" disabled={approved} />
            </Field>
            <div className="grid md:grid-cols-2 gap-4">
              <Field label="CPF">
                <Input value={form.cpf} onChange={e => setForm({ ...form, cpf: e.target.value })} placeholder="000.000.000-00" className="bg-white border-carbon/15 text-carbon h-12 rounded-xl" disabled={approved} />
              </Field>
              <Field label="Data de nascimento">
                <Input type="date" value={form.birth_date} onChange={e => setForm({ ...form, birth_date: e.target.value })} className="bg-white border-carbon/15 text-carbon h-12 rounded-xl" disabled={approved} />
              </Field>
            </div>
            <Field label="Telefone">
              <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="(11) 99999-9999" className="bg-white border-carbon/15 text-carbon h-12 rounded-xl" disabled={approved} />
            </Field>

            <div className="text-[11px] uppercase tracking-wider text-carbon/40 pt-2">Endereço</div>
            <Field label="Rua e número">
              <Input value={form.address_street} onChange={e => setForm({ ...form, address_street: e.target.value })} className="bg-white border-carbon/15 text-carbon h-12 rounded-xl" disabled={approved} />
            </Field>
            <div className="grid md:grid-cols-3 gap-4">
              <Field label="Cidade">
                <Input value={form.address_city} onChange={e => setForm({ ...form, address_city: e.target.value })} className="bg-white border-carbon/15 text-carbon h-12 rounded-xl" disabled={approved} />
              </Field>
              <Field label="UF">
                <Input value={form.address_state} onChange={e => setForm({ ...form, address_state: e.target.value })} maxLength={2} className="bg-white border-carbon/15 text-carbon h-12 rounded-xl" disabled={approved} />
              </Field>
              <Field label="CEP">
                <Input value={form.address_cep} onChange={e => setForm({ ...form, address_cep: e.target.value })} className="bg-white border-carbon/15 text-carbon h-12 rounded-xl" disabled={approved} />
              </Field>
            </div>

            <div className="text-xs text-carbon/50 pt-2 leading-relaxed">
              💡 Upload de documentos (RG/CNH, comprovante e selfie) será solicitado em breve.
              Por agora, envie os dados básicos — nossa equipe valida e libera sua conta.
            </div>
          </div>

          <div className="mt-10 max-w-2xl mx-auto flex items-center justify-center gap-4">
            <button
              onClick={() => navigate("/investir/painel")}
              className="inline-flex items-center gap-2 border-2 border-bone/20 text-bone hover:bg-bone/5 px-7 py-3.5 rounded-full font-medium transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Mais tarde
            </button>
            <button
              onClick={submit}
              disabled={loading || approved || !form.full_name || !form.cpf}
              className="inline-flex items-center gap-2 bg-volt hover:bg-volt/90 text-carbon disabled:bg-bone/10 disabled:text-bone/30 px-9 py-3.5 rounded-full font-semibold transition-colors"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : approved ? "Já aprovado" : <>Próximo <ArrowRight className="w-4 h-4" /></>}
            </button>
          </div>
        </div>
      </div>
    </InvestirShell>
  );
}

function Field({ label, children }: any) {
  return (
    <div>
      <label className="text-xs text-carbon/60 mb-1.5 block font-medium">{label}</label>
      {children}
    </div>
  );
}
