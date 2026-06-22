import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { InvestirShell } from "@/components/investir/InvestirShell";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ShieldCheck, Loader2 } from "lucide-react";

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
      toast.success("KYC enviado para análise.");
      navigate("/investir/onboarding/suitability");
    } catch (e: any) {
      toast.error(e.message);
    } finally { setLoading(false); }
  }

  const approved = existing?.status === "approved";

  return (
    <InvestirShell authed>
      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-full bg-volt/15 grid place-items-center">
            <ShieldCheck className="w-5 h-5 text-volt" />
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-volt/80">Passo 1 de 2</div>
            <h1 className="text-2xl font-semibold text-bone">Verificação de identidade (KYC)</h1>
          </div>
        </div>

        {existing && (
          <div className="mb-6 mt-4 px-4 py-3 rounded-lg border border-bone/10 bg-graphite/40 text-sm">
            Status atual:{" "}
            <span className="text-volt font-medium">
              {{ pending:"Pendente", in_review:"Em análise", approved:"Aprovado", rejected:"Rejeitado", expired:"Expirado" }[existing.status as string] || existing.status}
            </span>
            {existing.rejection_reason && <div className="mt-1 text-amber-400 text-xs">Motivo: {existing.rejection_reason}</div>}
          </div>
        )}

        <div className="bg-graphite/40 border border-bone/10 rounded-2xl p-6 space-y-4">
          <Field label="Nome completo"><Input value={form.full_name} onChange={e=>setForm({...form,full_name:e.target.value})} className="bg-carbon border-bone/10 text-bone" disabled={approved} /></Field>
          <div className="grid md:grid-cols-2 gap-4">
            <Field label="CPF"><Input value={form.cpf} onChange={e=>setForm({...form,cpf:e.target.value})} placeholder="000.000.000-00" className="bg-carbon border-bone/10 text-bone" disabled={approved} /></Field>
            <Field label="Data de nascimento"><Input type="date" value={form.birth_date} onChange={e=>setForm({...form,birth_date:e.target.value})} className="bg-carbon border-bone/10 text-bone" disabled={approved} /></Field>
          </div>
          <Field label="Telefone"><Input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="(11) 99999-9999" className="bg-carbon border-bone/10 text-bone" disabled={approved} /></Field>
          <div className="text-[11px] uppercase tracking-wider text-bone/40 pt-2">Endereço</div>
          <Field label="Rua"><Input value={form.address_street} onChange={e=>setForm({...form,address_street:e.target.value})} className="bg-carbon border-bone/10 text-bone" disabled={approved} /></Field>
          <div className="grid md:grid-cols-3 gap-4">
            <Field label="Cidade"><Input value={form.address_city} onChange={e=>setForm({...form,address_city:e.target.value})} className="bg-carbon border-bone/10 text-bone" disabled={approved} /></Field>
            <Field label="UF"><Input value={form.address_state} onChange={e=>setForm({...form,address_state:e.target.value})} maxLength={2} className="bg-carbon border-bone/10 text-bone" disabled={approved} /></Field>
            <Field label="CEP"><Input value={form.address_cep} onChange={e=>setForm({...form,address_cep:e.target.value})} className="bg-carbon border-bone/10 text-bone" disabled={approved} /></Field>
          </div>
          <div className="text-xs text-bone/40 pt-2">
            Upload de documentos (RG/CNH, comprovante e selfie) será adicionado em breve. Por ora envie os dados básicos — nossa equipe entrará em contato.
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <Button onClick={()=>navigate("/investir/painel")} variant="outline" className="border-bone/20 text-bone bg-transparent hover:bg-bone/5">Mais tarde</Button>
          <Button onClick={submit} disabled={loading || approved} className="flex-1 bg-volt hover:bg-volt/90 text-carbon font-semibold">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : approved ? "Já aprovado" : "Enviar para análise"}
          </Button>
        </div>
      </div>
    </InvestirShell>
  );
}

function Field({ label, children }: any) {
  return (
    <div>
      <label className="text-xs text-bone/50 mb-1.5 block">{label}</label>
      {children}
    </div>
  );
}
