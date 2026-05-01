import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  MessageSquare,
  Loader2,
  Search,
  Download,
  X,
} from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface WAMessage {
  id: string;
  advisor_id: string;
  contact_id: string | null;
  mandate_id: string | null;
  direction: "inbound" | "outbound";
  phone_from: string;
  phone_to: string;
  message_type: string;
  content_text: string | null;
  status: string;
  sentiment: string | null;
  intent: string | null;
  received_at: string;
  meta_message_id: string | null;
}

interface Filters {
  q: string;
  advisor_id: string; // "all" or uuid
  direction: string; // "all" | "inbound" | "outbound"
  status: string; // "all" | ...
  sentiment: string; // "all" | "none" | ...
  intent: string; // "all" | "none" | ...
  date_from: string; // YYYY-MM-DD
  date_to: string; // YYYY-MM-DD
}

const STORAGE_KEY = "wa_monitor_filters_v1";

const sentimentColor: Record<string, string> = {
  positive: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  neutral: "bg-slate-500/15 text-slate-300 border-slate-500/30",
  negative: "bg-rose-500/15 text-rose-400 border-rose-500/30",
  urgent: "bg-amber-500/15 text-amber-400 border-amber-500/30",
};

const STATUS_OPTIONS = [
  "received",
  "processed",
  "failed",
  "sent",
  "delivered",
  "read",
];
const SENTIMENT_OPTIONS = ["positive", "neutral", "negative", "urgent"];

function defaultFilters(): Filters {
  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(today.getDate() - 7);
  return {
    q: "",
    advisor_id: "all",
    direction: "all",
    status: "all",
    sentiment: "all",
    intent: "all",
    date_from: weekAgo.toISOString().slice(0, 10),
    date_to: today.toISOString().slice(0, 10),
  };
}

function loadStoredFilters(): Filters {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultFilters();
    const parsed = JSON.parse(raw);
    return { ...defaultFilters(), ...parsed };
  } catch {
    return defaultFilters();
  }
}

function csvEscape(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v).replace(/"/g, '""');
  return `"${s}"`;
}

function AdminWhatsAppMonitorInner() {
  const [rows, setRows] = useState<WAMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [reprocessing, setReprocessing] = useState(false);
  const [filters, setFilters] = useState<Filters>(() => loadStoredFilters());
  const [advisorMap, setAdvisorMap] = useState<Record<string, string>>({});
  const [intentOptions, setIntentOptions] = useState<string[]>([]);
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  // Load advisor list once
  useEffect(() => {
    (async () => {
      const { data: configs } = await supabase
        .from("advisor_whatsapp_config" as any)
        .select("advisor_id");
      const ids = Array.from(
        new Set(((configs ?? []) as any[]).map((c) => c.advisor_id)),
      );
      if (ids.length === 0) return;
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", ids);
      const map: Record<string, string> = {};
      (profs ?? []).forEach((p: any) => {
        map[p.user_id] = p.full_name ?? p.user_id.slice(0, 8);
      });
      ids.forEach((id) => {
        if (!map[id]) map[id] = id.slice(0, 8);
      });
      setAdvisorMap(map);
    })();
  }, []);

  // Load distinct intents for the dropdown
  const refreshIntents = async () => {
    const { data } = await supabase
      .from("whatsapp_messages" as any)
      .select("intent")
      .not("intent", "is", null)
      .order("received_at", { ascending: false })
      .limit(500);
    const set = new Set<string>();
    ((data ?? []) as any[]).forEach((r) => {
      if (r.intent) set.add(r.intent);
    });
    setIntentOptions(Array.from(set).sort());
  };

  // Persist filters
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
    } catch {
      /* noop */
    }
  }, [filters]);

  const matchesActiveFilters = (r: WAMessage): boolean => {
    const f = filtersRef.current;
    if (f.advisor_id !== "all" && r.advisor_id !== f.advisor_id) return false;
    if (f.direction !== "all" && r.direction !== f.direction) return false;
    if (f.status !== "all" && r.status !== f.status) return false;
    if (f.sentiment !== "all") {
      if (f.sentiment === "none" && r.sentiment) return false;
      if (f.sentiment !== "none" && r.sentiment !== f.sentiment) return false;
    }
    if (f.intent !== "all") {
      if (f.intent === "none" && r.intent) return false;
      if (f.intent !== "none" && r.intent !== f.intent) return false;
    }
    if (f.q) {
      const q = f.q.toLowerCase();
      const hay =
        `${r.content_text ?? ""} ${r.phone_from} ${r.phone_to} ${r.meta_message_id ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  };

  const load = async () => {
    setLoading(true);
    let query = supabase
      .from("whatsapp_messages" as any)
      .select(
        "id, advisor_id, contact_id, mandate_id, direction, phone_from, phone_to, message_type, content_text, status, sentiment, intent, received_at, meta_message_id",
      )
      .order("received_at", { ascending: false })
      .limit(500);

    const f = filtersRef.current;
    if (f.advisor_id !== "all") query = query.eq("advisor_id", f.advisor_id);
    if (f.direction !== "all") query = query.eq("direction", f.direction);
    if (f.status !== "all") query = query.eq("status", f.status);
    if (f.sentiment !== "all") {
      if (f.sentiment === "none") query = query.is("sentiment", null);
      else query = query.eq("sentiment", f.sentiment);
    }
    if (f.intent !== "all") {
      if (f.intent === "none") query = query.is("intent", null);
      else query = query.eq("intent", f.intent);
    }
    if (f.date_from) query = query.gte("received_at", `${f.date_from}T00:00:00`);
    if (f.date_to) query = query.lte("received_at", `${f.date_to}T23:59:59`);
    if (f.q.trim()) {
      const q = f.q.trim().replace(/[%,]/g, " ");
      query = query.or(
        `content_text.ilike.%${q}%,phone_from.ilike.%${q}%,phone_to.ilike.%${q}%,meta_message_id.ilike.%${q}%`,
      );
    }

    const { data, error } = await query;
    if (error) toast.error(error.message);
    setRows((data ?? []) as unknown as WAMessage[]);
    setLoading(false);
  };

  // Debounced reload on filter change
  useEffect(() => {
    const t = setTimeout(() => {
      load();
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters.q,
    filters.advisor_id,
    filters.direction,
    filters.status,
    filters.sentiment,
    filters.intent,
    filters.date_from,
    filters.date_to,
  ]);

  // Realtime + initial intents
  useEffect(() => {
    refreshIntents();
    const channel = supabase
      .channel("whatsapp_messages_admin")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "whatsapp_messages" },
        (payload: any) => {
          const newRow = (payload.new ?? payload.old) as WAMessage | undefined;
          if (!newRow || matchesActiveFilters(newRow)) {
            load();
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleReprocess = async () => {
    setReprocessing(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "whatsapp-classify-batch",
      );
      if (error) throw error;
      toast.success(
        `Reprocessado: ${data?.processed ?? 0} mensagens em ${data?.groups ?? 0} grupos`,
      );
      load();
      refreshIntents();
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao reprocessar");
    } finally {
      setReprocessing(false);
    }
  };

  const handleExport = () => {
    if (rows.length === 0) {
      toast.info("Nada para exportar");
      return;
    }
    const headers = [
      "received_at",
      "advisor",
      "direction",
      "from",
      "to",
      "type",
      "content",
      "sentiment",
      "intent",
      "status",
      "mandate_id",
      "meta_message_id",
    ];
    const lines = [headers.join(",")];
    rows.forEach((r) => {
      lines.push(
        [
          r.received_at,
          advisorMap[r.advisor_id] ?? r.advisor_id,
          r.direction,
          r.phone_from,
          r.phone_to,
          r.message_type,
          r.content_text,
          r.sentiment,
          r.intent,
          r.status,
          r.mandate_id,
          r.meta_message_id,
        ]
          .map(csvEscape)
          .join(","),
      );
    });
    const blob = new Blob([lines.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `whatsapp-monitor-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const stats = useMemo(() => {
    const inbound = rows.filter((r) => r.direction === "inbound").length;
    const outbound = rows.filter((r) => r.direction === "outbound").length;
    const processed = rows.filter((r) => r.status === "processed").length;
    return { total: rows.length, inbound, outbound, processed };
  }, [rows]);

  const setF = (patch: Partial<Filters>) =>
    setFilters((prev) => ({ ...prev, ...patch }));

  return (
    <AdminLayout>
      <div className="mb-4">
        <h1 className="text-2xl font-semibold">WhatsApp Monitor</h1>
        <p className="text-sm text-muted-foreground">
          Mensagens capturadas pela integração Meta WhatsApp Cloud em tempo real.
        </p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total filtrado", value: stats.total },
          { label: "Inbound", value: stats.inbound },
          { label: "Outbound", value: stats.outbound },
          { label: "Classificadas", value: stats.processed },
        ].map((s) => (
          <Card
            key={s.label}
            className="!bg-slate-900/60 backdrop-blur-md border-slate-700/50"
          >
            <CardContent className="pt-6">
              <div className="text-xs text-muted-foreground">{s.label}</div>
              <div className="text-2xl font-semibold mt-1">{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="!bg-slate-900/60 backdrop-blur-md border-slate-700/50 mt-4">
        <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Mensagens recentes
          </CardTitle>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              className="bg-transparent"
              onClick={load}
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Atualizar
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="bg-transparent"
              onClick={handleExport}
            >
              <Download className="h-3 w-3 mr-1" />
              Exportar CSV
            </Button>
            <Button size="sm" onClick={handleReprocess} disabled={reprocessing}>
              {reprocessing ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <RefreshCw className="h-3 w-3 mr-1" />
              )}
              Reprocessar sentimento
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-2">
            <div className="relative md:col-span-2 lg:col-span-2">
              <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar conteúdo, telefone, meta_id..."
                value={filters.q}
                onChange={(e) => setF({ q: e.target.value })}
                className="pl-8 h-9 bg-slate-950/40"
              />
            </div>
            <Select
              value={filters.advisor_id}
              onValueChange={(v) => setF({ advisor_id: v })}
            >
              <SelectTrigger className="h-9 bg-slate-950/40">
                <SelectValue placeholder="Advisor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os advisors</SelectItem>
                {Object.entries(advisorMap).map(([id, name]) => (
                  <SelectItem key={id} value={id}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filters.direction}
              onValueChange={(v) => setF({ direction: v })}
            >
              <SelectTrigger className="h-9 bg-slate-950/40">
                <SelectValue placeholder="Direção" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as direções</SelectItem>
                <SelectItem value="inbound">Inbound</SelectItem>
                <SelectItem value="outbound">Outbound</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filters.status}
              onValueChange={(v) => setF({ status: v })}
            >
              <SelectTrigger className="h-9 bg-slate-950/40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filters.sentiment}
              onValueChange={(v) => setF({ sentiment: v })}
            >
              <SelectTrigger className="h-9 bg-slate-950/40">
                <SelectValue placeholder="Sentimento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos sentimentos</SelectItem>
                <SelectItem value="none">(sem classificação)</SelectItem>
                {SENTIMENT_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filters.intent}
              onValueChange={(v) => setF({ intent: v })}
            >
              <SelectTrigger className="h-9 bg-slate-950/40">
                <SelectValue placeholder="Intent" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos intents</SelectItem>
                <SelectItem value="none">(sem intent)</SelectItem>
                {intentOptions.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1">
              <Input
                type="date"
                value={filters.date_from}
                onChange={(e) => setF({ date_from: e.target.value })}
                className="h-9 bg-slate-950/40"
              />
              <span className="text-xs text-muted-foreground">→</span>
              <Input
                type="date"
                value={filters.date_to}
                onChange={(e) => setF({ date_to: e.target.value })}
                className="h-9 bg-slate-950/40"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="bg-transparent h-9"
              onClick={() => setFilters(defaultFilters())}
            >
              <X className="h-3 w-3 mr-1" />
              Limpar filtros
            </Button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="py-12 flex justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : rows.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                Nenhuma mensagem encontrada com os filtros atuais.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[140px]">Recebida em</TableHead>
                    <TableHead>Advisor</TableHead>
                    <TableHead>Direção</TableHead>
                    <TableHead>De → Para</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="max-w-md">Conteúdo</TableHead>
                    <TableHead>Sentimento</TableHead>
                    <TableHead>Intent</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Mandato</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-xs">
                        {new Date(r.received_at).toLocaleString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-xs break-words max-w-[140px]">
                        {advisorMap[r.advisor_id] ?? (
                          <span className="font-mono text-muted-foreground">
                            {r.advisor_id.slice(0, 8)}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {r.direction === "inbound" ? (
                          <span className="flex items-center gap-1 text-emerald-400 text-xs">
                            <ArrowDownLeft className="h-3 w-3" /> in
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-sky-400 text-xs">
                            <ArrowUpRight className="h-3 w-3" /> out
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs font-mono break-words">
                        {r.phone_from}
                        <span className="text-muted-foreground"> → </span>
                        {r.phone_to}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          {r.message_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-md">
                        <div className="text-xs break-words line-clamp-3">
                          {r.content_text ?? (
                            <span className="text-muted-foreground italic">
                              (sem texto)
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {r.sentiment ? (
                          <Badge
                            variant="outline"
                            className={sentimentColor[r.sentiment] ?? ""}
                          >
                            {r.sentiment}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            —
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        {r.intent ? (
                          <Badge variant="outline" className="text-[10px]">
                            {r.intent}
                          </Badge>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            —
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          {r.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {r.mandate_id ? (
                          <Link
                            to={`/equity-brain/crm/mandate/${r.mandate_id}`}
                            className="text-xs text-primary hover:underline"
                          >
                            abrir
                          </Link>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            —
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </CardContent>
      </Card>
    </AdminLayout>
  );
}

export default function AdminWhatsAppMonitor() {
  return <AdminWhatsAppMonitorInner />;
}
