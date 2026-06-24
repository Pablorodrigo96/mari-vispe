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
    full_name: "",
    cpf: "",
    birth_date: "",
    phone: "",
    address_street: "",
    address_city: "",
    address_state: "",
    address_cep: "",
  });

  useEffect(() => {
    (async () => {
      const { data: ures } = await supabase.auth.getUser();
      if (!ures.user) {
        navigate("/investir/auth");
        return;
      }
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
        address: {
          street: form.address_street,
          city: form.address_city,
          state: form.address_state,
          cep: form.address_cep,
        },
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
    } finally {
      setLoading(false);
    }
  }

  const approved = existing?.status === "approved";
  const canSubmit = !loading && !approved && form.full_name && form.cpf;

  return (
    <InvestirShell authed hideFooter>
      <div className="min-h-[calc(100vh-3.5rem)] bg-carbon pb-28">
        {/* Topbar mobile */}
        <div className="sticky top-14 z-30 bg-carbon/95 backdrop-blur-xl border-b border-bone/10">
          <div className="max-w-3xl mx-auto px-4 md:px-6 py-3 flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="text-bone/70 -ml-2 p-2" aria-label="Voltar">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <div className="text-[10px] uppercase tracking-wider text-bone/45">Passo 1 de 2</div>
              <div className="text-sm text-bone font-medium">Identificação</div>
            </div>
            <div className="text-xs text-volt font-semibold">50%</div>
          </div>
          <div className="h-1 bg-bone/10">
            <div className="h-full bg-volt w-1/2 transition-all" />
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-5 md:px-6 py-8 md:py-12">
          <h1 className="text-2xl md:text-4xl font-semibold text-bone tracking-tight leading-tight">
            Precisamos conhecer você
          </h1>
          <p className="mt-3 text-bone/60 text-sm md:text-base leading-relaxed">
            Pra abrir sua conta de investidor, a CVM exige confirmação de identidade. Seus dados ficam seguros.
          </p>

          {existing && (
            <div className="mt-6 px-4 py-3 rounded-xl border border-volt/30 bg-volt/5 text-sm text-bone">
              Status:{" "}
              <span className="text-volt font-semibold">
                {{ pending: "Pendente", in_review: "Em análise", approved: "Aprovado", rejected: "Rejeitado", expired: "Expirado" }[
                  existing.status as string
                ] || existing.status}
              </span>
              {existing.rejection_reason && (
                <div className="mt-1 text-amber-400 text-xs">Motivo: {existing.rejection_reason}</div>
              )}
            </div>
          )}

          <div className="mt-8 bg-[#FAFAF7] rounded-2xl p-5 md:p-7 space-y-4">
            <Field label="Nome completo">
              <Input
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                className="bg-white border-carbon/15 text-carbon h-12 rounded-xl"
                disabled={approved}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="CPF">
                <Input
                  value={form.cpf}
                  onChange={(e) => setForm({ ...form, cpf: e.target.value })}
                  placeholder="000.000.000-00"
                  className="bg-white border-carbon/15 text-carbon h-12 rounded-xl"
                  inputMode="numeric"
                  disabled={approved}
                />
              </Field>
              <Field label="Nascimento">
                <Input
                  type="date"
                  value={form.birth_date}
                  onChange={(e) => setForm({ ...form, birth_date: e.target.value })}
                  className="bg-white border-carbon/15 text-carbon h-12 rounded-xl"
                  disabled={approved}
                />
              </Field>
            </div>
            <Field label="Telefone">
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="(11) 99999-9999"
                className="bg-white border-carbon/15 text-carbon h-12 rounded-xl"
                inputMode="tel"
                disabled={approved}
              />
            </Field>

            <div className="text-[11px] uppercase tracking-wider text-carbon/40 pt-2">Endereço</div>
            <Field label="Rua e número">
              <Input
                value={form.address_street}
                onChange={(e) => setForm({ ...form, address_street: e.target.value })}
                className="bg-white border-carbon/15 text-carbon h-12 rounded-xl"
                disabled={approved}
              />
            </Field>
            <div className="grid grid-cols-[1fr_70px_110px] gap-2">
              <Field label="Cidade">
                <Input
                  value={form.address_city}
                  onChange={(e) => setForm({ ...form, address_city: e.target.value })}
                  className="bg-white border-carbon/15 text-carbon h-12 rounded-xl"
                  disabled={approved}
                />
              </Field>
              <Field label="UF">
                <Input
                  value={form.address_state}
                  onChange={(e) => setForm({ ...form, address_state: e.target.value })}
                  maxLength={2}
                  className="bg-white border-carbon/15 text-carbon h-12 rounded-xl"
                  disabled={approved}
                />
              </Field>
              <Field label="CEP">
                <Input
                  value={form.address_cep}
                  onChange={(e) => setForm({ ...form, address_cep: e.target.value })}
                  className="bg-white border-carbon/15 text-carbon h-12 rounded-xl"
                  inputMode="numeric"
                  disabled={approved}
                />
              </Field>
            </div>

            <div className="text-xs text-carbon/55 pt-2 leading-relaxed">
              💡 Upload de documentos (RG/CNH, comprovante e selfie) em breve. Por agora, envie os dados básicos.
            </div>
          </div>
        </div>

        {/* Sticky footer CTA */}
        <div className="fixed bottom-0 inset-x-0 z-40 bg-carbon/95 backdrop-blur-xl border-t border-bone/10 pb-[env(safe-area-inset-bottom)]">
          <div className="max-w-2xl mx-auto px-5 md:px-6 py-3 flex items-center gap-2">
            <button
              onClick={() => navigate("/investir/painel")}
              className="px-4 py-3.5 rounded-xl border border-bone/20 text-bone text-sm font-medium hover:bg-bone/5"
            >
              Mais tarde
            </button>
            <button
              onClick={submit}
              disabled={!canSubmit}
              className="flex-1 inline-flex items-center justify-center gap-2 bg-volt hover:bg-volt/90 text-carbon disabled:bg-bone/10 disabled:text-bone/30 px-6 py-3.5 rounded-xl font-semibold transition-colors"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : approved ? "Já aprovado" : <>Continuar <ArrowRight className="w-4 h-4" /></>}
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
