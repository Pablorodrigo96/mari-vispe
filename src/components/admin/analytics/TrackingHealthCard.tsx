import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, Shield, ShieldOff, Send, AlertTriangle } from "lucide-react";
import { useTrackingHealth, getBrowserTrackingState } from "@/hooks/useTrackingHealth";
import { trackEvent } from "@/lib/analytics";
import { useState } from "react";
import { toast } from "sonner";
import { InfoHint } from "@/components/equity-brain/InfoHint";
import { analyticsTooltips } from "@/lib/analyticsTooltips";

export function TrackingHealthCard() {
  const { data, isLoading, refetch } = useTrackingHealth();
  const [browser, setBrowser] = useState(() => getBrowserTrackingState());
  const [sending, setSending] = useState(false);

  const refresh = () => setBrowser(getBrowserTrackingState());

  const sendTest = async () => {
    setSending(true);
    try {
      await trackEvent("cta_click", { metadata: { cta: "admin-test", source: "admin-analytics" } });
      toast.success("Evento de teste enviado");
      setTimeout(() => refetch(), 1500);
    } catch {
      toast.error("Falha ao enviar evento");
    } finally {
      setSending(false);
    }
  };

  const statusColor = browser.optedOut ? "text-amber-400" : "text-emerald-400";
  const statusLabel = browser.dnt
    ? "Bloqueado por DNT"
    : browser.consent === "rejected"
    ? "Bloqueado por opt-out"
    : browser.consent === "pending"
    ? "Rastreando (consentimento pendente)"
    : "Rastreando";

  const stale = data?.lastEventAgoMin != null && data.lastEventAgoMin > 30;

  return (
    <Card className="p-4 bg-zinc-900/60 border-zinc-800">
      <div className="flex items-center gap-2 mb-3">
        <Activity className="h-4 w-4 text-emerald-400" />
        <div className="text-sm font-semibold">Estado do tracking</div>
        <InfoHint text={analyticsTooltips.trackingHealth} />
        <Button size="sm" variant="ghost" className="ml-auto h-7 text-xs" onClick={() => { refresh(); refetch(); }}>
          atualizar
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Seu navegador */}
        <div className="rounded-md border border-zinc-800 bg-zinc-950/40 p-3 space-y-2">
          <div className="text-[10px] uppercase tracking-wide text-zinc-500">Seu navegador</div>
          <div className="flex items-center gap-2 text-xs">
            {browser.optedOut ? <ShieldOff className="h-3.5 w-3.5 text-amber-400" /> : <Shield className="h-3.5 w-3.5 text-emerald-400" />}
            <span className={statusColor}>{statusLabel}</span>
          </div>
          <div className="flex flex-wrap gap-1.5 text-[10px]">
            <Badge variant="outline" className={browser.dnt ? "border-amber-700 text-amber-300" : "border-zinc-700 text-zinc-400"}>
              DNT: {browser.dnt ? "ativo" : "inativo"}
            </Badge>
            <Badge variant="outline" className={
              browser.consent === "accepted" ? "border-emerald-700 text-emerald-300"
              : browser.consent === "rejected" ? "border-amber-700 text-amber-300"
              : "border-zinc-700 text-zinc-400"
            }>
              Consentimento: {browser.consent === "accepted" ? "aceito" : browser.consent === "rejected" ? "recusado" : "pendente"}
            </Badge>
            <Badge variant="outline" className="border-zinc-700 text-zinc-400 font-mono">
              sess: {browser.sessionKey.slice(0, 8) || "—"}…
            </Badge>
          </div>
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1 mt-1" onClick={sendTest} disabled={sending || browser.optedOut}>
            <Send className="h-3 w-3" /> enviar evento de teste
          </Button>
        </div>

        {/* Plataforma 24h */}
        <div className="rounded-md border border-zinc-800 bg-zinc-950/40 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-[10px] uppercase tracking-wide text-zinc-500">Plataforma · 24h</div>
            {stale && (
              <span className="flex items-center gap-1 text-[10px] text-amber-400">
                <AlertTriangle className="h-3 w-3" /> sem eventos há {data?.lastEventAgoMin}min
              </span>
            )}
          </div>
          {isLoading ? (
            <div className="text-xs text-zinc-500">carregando…</div>
          ) : (
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
              {(["page_view","page_leave","signup","lead","cta_click"] as const).map((t) => (
                <div key={t} className="flex justify-between">
                  <span className="text-zinc-500">{t}</span>
                  <span className="tabular-nums text-zinc-200">{data?.byType[t] ?? 0}</span>
                </div>
              ))}
              <div className="flex justify-between">
                <span className="text-zinc-500">sessões</span>
                <span className="tabular-nums text-zinc-200">{data?.totalSessions ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">% c/ page_leave</span>
                <span className={`tabular-nums ${ (data?.leavePct ?? 0) < 30 ? "text-amber-400" : "text-emerald-300" }`}>{data?.leavePct ?? 0}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">% anônimas</span>
                <span className="tabular-nums text-zinc-200">{data?.anonPct ?? 0}%</span>
              </div>
              <div className="flex justify-between col-span-2">
                <span className="text-zinc-500">último evento</span>
                <span className="tabular-nums text-zinc-300">
                  {data?.lastAt ? new Date(data.lastAt).toLocaleTimeString("pt-BR") : "—"}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
