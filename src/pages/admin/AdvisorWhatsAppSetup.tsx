import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Loader2, MessageSquare, AlertCircle, Phone } from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminRoute } from "@/components/admin/AdminRoute";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Step = "loading" | "idle" | "registering" | "awaiting_sms" | "confirming" | "active" | "error";

export default function AdvisorWhatsAppSetup() {
  const { advisorId = "" } = useParams<{ advisorId: string }>();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>("loading");
  const [advisorName, setAdvisorName] = useState<string>("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [mockHint, setMockHint] = useState<string | null>(null);
  const [activeConfig, setActiveConfig] = useState<{
    phone_number: string;
    is_mock: boolean;
    last_message_received_at: string | null;
    total_messages_captured: number;
  } | null>(null);

  useEffect(() => {
    void loadAdvisor();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [advisorId]);

  async function loadAdvisor() {
    setStep("loading");
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, phone")
      .eq("user_id", advisorId)
      .maybeSingle();
    setAdvisorName(profile?.full_name ?? "Sem nome");
    if (profile?.phone && !phone) setPhone(profile.phone);

    const { data: cfg } = await supabase
      .from("advisor_whatsapp_config" as any)
      .select("phone_number, is_mock, status, last_message_received_at, total_messages_captured")
      .eq("advisor_id", advisorId)
      .maybeSingle();
    if (cfg && (cfg as any).status === "active") {
      setActiveConfig({
        phone_number: (cfg as any).phone_number,
        is_mock: (cfg as any).is_mock,
        last_message_received_at: (cfg as any).last_message_received_at,
        total_messages_captured: (cfg as any).total_messages_captured ?? 0,
      });
      setStep("active");
      return;
    }

    const { data: pend } = await supabase
      .from("advisor_whatsapp_setup_pending" as any)
      .select("phone_number, is_mock")
      .eq("advisor_id", advisorId)
      .maybeSingle();
    if (pend) {
      setPhone((pend as any).phone_number);
      setMockHint((pend as any).is_mock ? "Modo simulado: digite 123456" : null);
      setStep("awaiting_sms");
      return;
    }
    setStep("idle");
  }

  async function handleRegister() {
    setStep("registering");
    setErrMsg(null);
    const { data, error } = await supabase.functions.invoke("setup-advisor-whatsapp", {
      body: { advisor_id: advisorId, phone_number: phone },
    });
    if (error || (data as any)?.error) {
      setErrMsg((data as any)?.error ?? error?.message ?? "Erro");
      setStep("error");
      return;
    }
    setMockHint((data as any)?.mock_hint ?? null);
    toast.success("SMS enviado");
    setStep("awaiting_sms");
  }

  async function handleConfirm() {
    setStep("confirming");
    setErrMsg(null);
    const { data, error } = await supabase.functions.invoke("confirm-advisor-whatsapp", {
      body: { advisor_id: advisorId, sms_code: code.trim() },
    });
    if (error || (data as any)?.error) {
      setErrMsg((data as any)?.error ?? error?.message ?? "Erro");
      setStep("error");
      return;
    }
    toast.success("Advisor conectado!");
    setCode("");
    await loadAdvisor();
  }

  async function handleReset() {
    if (!confirm("Remover configuração WhatsApp deste advisor?")) return;
    await supabase.from("advisor_whatsapp_config" as any).delete().eq("advisor_id", advisorId);
    await supabase.from("advisor_whatsapp_setup_pending" as any).delete().eq("advisor_id", advisorId);
    setActiveConfig(null);
    setStep("idle");
    toast.success("Reset feito. Pode reconectar.");
  }

  return (
    <AdminRoute>
      <AdminLayout>
        <div className="space-y-6 max-w-2xl">
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin/users")} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Voltar para usuários
          </Button>

          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <MessageSquare className="h-7 w-7 text-primary" />
              WhatsApp do Advisor
            </h1>
            <p className="text-muted-foreground mt-1">
              {advisorName} · <span className="font-mono text-xs">{advisorId.slice(0, 8)}…</span>
            </p>
          </div>

          {step === "loading" && (
            <Card><CardContent className="p-8 flex justify-center">
              <Loader2 className="h-6 w-6 animate-spin" />
            </CardContent></Card>
          )}

          {step === "idle" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5" /> Registrar número
                </CardTitle>
                <CardDescription>
                  O número receberá um SMS para validar a conexão com a Meta.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Número WhatsApp (Brasil)</label>
                  <Input
                    placeholder="(11) 99999-1111"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Ex.: <code>+5511999991111</code> ou <code>11 99999-1111</code>
                  </p>
                </div>
                <Button onClick={handleRegister} disabled={!phone.replace(/\D/g, "")}>
                  Registrar e enviar SMS
                </Button>
              </CardContent>
            </Card>
          )}

          {step === "registering" && (
            <Card><CardContent className="p-8 flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Registrando número na Meta…</span>
            </CardContent></Card>
          )}

          {step === "awaiting_sms" && (
            <Card>
              <CardHeader>
                <CardTitle>Confirmar código SMS</CardTitle>
                <CardDescription>
                  Número: <span className="font-mono">{phone}</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {mockHint && (
                  <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
                    <Badge variant="outline" className="mr-2 border-amber-500 text-amber-600">MOCK</Badge>
                    {mockHint}
                  </div>
                )}
                <Input
                  placeholder="Código de 6 dígitos"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  maxLength={6}
                  inputMode="numeric"
                />
                <div className="flex gap-2">
                  <Button onClick={handleConfirm} disabled={code.length !== 6}>
                    Confirmar
                  </Button>
                  <Button variant="outline" onClick={handleReset}>
                    Cancelar
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {step === "confirming" && (
            <Card><CardContent className="p-8 flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Confirmando código, gerando token e configurando webhook…</span>
            </CardContent></Card>
          )}

          {step === "active" && activeConfig && (
            <Card className="border-green-500/40">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="h-5 w-5" /> Operacional
                  {activeConfig.is_mock && (
                    <Badge variant="outline" className="border-amber-500 text-amber-600 ml-2">MOCK</Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Advisor capturando mensagens via webhook próprio.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div><span className="text-muted-foreground">Número:</span> <span className="font-mono">{activeConfig.phone_number}</span></div>
                <div><span className="text-muted-foreground">Mensagens capturadas:</span> {activeConfig.total_messages_captured}</div>
                <div><span className="text-muted-foreground">Última mensagem:</span> {activeConfig.last_message_received_at ? new Date(activeConfig.last_message_received_at).toLocaleString("pt-BR") : "—"}</div>
                <div className="pt-3">
                  <Button variant="outline" onClick={handleReset}>
                    Resetar conexão
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {step === "error" && (
            <Card className="border-destructive/40">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="h-5 w-5" /> Erro
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm break-words">{errMsg}</p>
                <Button variant="outline" onClick={() => setStep("idle")}>Tentar novamente</Button>
              </CardContent>
            </Card>
          )}
        </div>
      </AdminLayout>
    </AdminRoute>
  );
}
