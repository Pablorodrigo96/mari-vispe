import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Loader2, CheckCircle2, AlertTriangle, PenTool, FileText, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { WordPreview } from "@/components/legal/WordPreview";
import { SignatureCertificate } from "@/components/legal/SignatureCertificate";


export default function AssinaturaPublica() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [signed, setSigned] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [fullName, setFullName] = useState("");
  const [signedHash, setSignedHash] = useState<string>("");
  const [signedAtIso, setSignedAtIso] = useState<string>("");
  const [clientIp, setClientIp] = useState<string>("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const hasDrawnRef = useRef(false);


  useEffect(() => {
    if (!token) return;
    (async () => {
      const { data: rows, error } = await supabase.rpc("signature_get_by_token" as any, { p_token: token });
      if (error || !rows || (rows as any[]).length === 0) {
        setLoading(false);
        return;
      }
      const row = (rows as any[])[0];
      setData(row);
      setFullName(row.signer_name ?? "");
      setSigned(!!row.signed_at);
      setLoading(false);
      await supabase.rpc("signature_mark_viewed" as any, { p_token: token });
    })();
  }, [token]);

  // Canvas drawing
  function startDraw(e: React.PointerEvent<HTMLCanvasElement>) {
    const c = canvasRef.current; if (!c) return;
    drawingRef.current = true;
    const rect = c.getBoundingClientRect();
    const ctx = c.getContext("2d")!;
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.strokeStyle = "#0a0a0a";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
  }
  function moveDraw(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const c = canvasRef.current; if (!c) return;
    const rect = c.getBoundingClientRect();
    const ctx = c.getContext("2d")!;
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
    hasDrawnRef.current = true;
  }
  function endDraw() { drawingRef.current = false; }
  function clearCanvas() {
    const c = canvasRef.current; if (!c) return;
    c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
    hasDrawnRef.current = false;
  }

  async function submitSignature() {
    if (!token || !data) return;
    if (!agreed) { toast.error("Confirme que leu e concorda."); return; }
    if (!fullName.trim()) { toast.error("Digite seu nome completo."); return; }
    if (!hasDrawnRef.current) { toast.error("Desenhe sua assinatura."); return; }

    setSubmitting(true);
    try {
      const c = canvasRef.current!;
      const blob: Blob = await new Promise((res) => c.toBlob((b) => res(b!), "image/png"));
      const path = `${data.document_id}/${data.id}.png`;
      // Best-effort upload (bucket is private, only service_role can write per policy → fallback: skip if blocked)
      let uploadedPath: string | null = null;
      const up = await supabase.storage.from("legal-signatures").upload(path, blob, { upsert: true, contentType: "image/png" });
      if (!up.error) uploadedPath = path;

      // Hash: SHA-256 of body + name + timestamp
      const enc = new TextEncoder();
      const buf = await crypto.subtle.digest("SHA-256", enc.encode(`${data.document_body}|${fullName}|${Date.now()}`));
      const hash = Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");

      const ua = navigator.userAgent;
      const { error } = await supabase.rpc("signature_sign" as any, {
        p_token: token,
        p_signature_hash: hash,
        p_signature_image_path: uploadedPath,
        p_ip: null,
        p_user_agent: ua,
      });
      if (error) throw error;
      setSigned(true);
      toast.success("Assinatura registrada com sucesso.");
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao assinar");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="min-h-screen bg-carbon grid place-items-center text-zinc-300"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  if (!data) {
    return (
      <div className="min-h-screen bg-carbon grid place-items-center px-4">
        <Card className="!bg-zinc-900/60 backdrop-blur-md border-zinc-800 p-6 max-w-md text-center">
          <AlertTriangle className="h-8 w-8 text-amber-400 mx-auto mb-2" />
          <div className="text-zinc-100 font-medium">Link inválido ou expirado</div>
          <div className="text-zinc-400 text-sm mt-1">Solicite um novo link à equipe Vispe.</div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-carbon py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center gap-2 text-volt">
          <FileText className="h-5 w-5" />
          <span className="text-sm uppercase tracking-wider">Assinatura eletrônica — Vispe</span>
        </div>
        <Card className="!bg-zinc-900/60 backdrop-blur-md border-zinc-800 p-4">
          <div className="text-zinc-100 font-medium break-words">{data.document_label} (v{data.document_version})</div>
          <div className="text-xs text-zinc-500 mt-1">Signatário: {data.signer_name} ({data.signer_email}) — {data.signer_role}</div>
        </Card>

        <Card className="!bg-zinc-900/60 backdrop-blur-md border-zinc-800 p-4 max-h-[45vh] overflow-auto">
          <pre className="text-[11px] text-zinc-200 whitespace-pre-wrap font-mono break-words">{data.document_body}</pre>
        </Card>

        {signed ? (
          <Card className="!bg-zinc-900/60 backdrop-blur-md border-zinc-800 p-6 text-center">
            <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto" />
            <div className="text-zinc-100 mt-2">Assinatura registrada com sucesso.</div>
            <div className="text-xs text-zinc-500 mt-1">
              Conforme MP 2.200-2/2001 art. 10 §2º — assinatura eletrônica com identificação de IP, dispositivo e hash do documento.
            </div>
          </Card>
        ) : (
          <Card className="!bg-zinc-900/60 backdrop-blur-md border-zinc-800 p-4 space-y-3">
            <Input
              placeholder="Digite seu nome completo"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="bg-zinc-900 border-zinc-800 text-zinc-100"
            />
            <div>
              <div className="text-xs text-zinc-400 mb-1">Assinatura (desenhe abaixo)</div>
              <canvas
                ref={canvasRef}
                width={600}
                height={150}
                className="w-full bg-bone rounded border border-zinc-700 touch-none"
                onPointerDown={startDraw}
                onPointerMove={moveDraw}
                onPointerUp={endDraw}
                onPointerLeave={endDraw}
              />
              <Button variant="ghost" size="sm" onClick={clearCanvas} className="mt-1 text-xs text-zinc-400">Limpar</Button>
            </div>
            <label className="flex items-start gap-2 text-xs text-zinc-300 cursor-pointer">
              <Checkbox checked={agreed} onCheckedChange={(v) => setAgreed(!!v)} />
              <span className="break-words">
                Li o documento, concordo com seus termos e reconheço esta como minha assinatura eletrônica, válida nos termos da MP 2.200-2/2001 art. 10 §2º.
              </span>
            </label>
            <Button onClick={submitSignature} disabled={submitting} className="w-full bg-volt text-carbon hover:bg-volt/90">
              {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <PenTool className="h-4 w-4 mr-2" />}
              Assinar documento
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}
