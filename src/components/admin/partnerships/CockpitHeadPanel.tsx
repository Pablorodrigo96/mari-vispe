// Painel cockpit do Head de Parcerias: KPIs, Rotinas, Top Performers, Risco, Reuniões.
// Recebe os dados já buscados pelo AdminPartnerships e deriva tudo via useMemo.
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Users,
  TrendingUp,
  Calendar,
  Trophy,
  AlertTriangle,
  Target,
  CheckCircle2,
  Clock,
  Sparkles,
  DollarSign,
} from "lucide-react";
import {
  CUT_DAYS,
  ICP_EQUITY_THRESHOLD,
  INACTIVE_DAYS,
  MONTHLY_REVENUE_TARGET_PER_PARTNER,
  SUCCESS_FEE_PCT,
} from "@/lib/partnershipsTargets";

interface PartnerData {
  user_id: string;
  full_name: string | null;
  company_name: string | null;
  created_at: string;
  listing_count: number;
  avg_equity_score: number | null;
  last_listing_date: string | null;
  is_active: boolean;
  active_reservations: number;
  exclusive_reservations: number;
}

interface Activity {
  id: string;
  partner_user_id: string;
  activity_type: string;
  notes: string | null;
  scheduled_at: string | null;
  completed_at: string | null;
  created_at: string;
}

interface Listing {
  id: string;
  user_id: string;
  asking_price: number | null;
  equity_score: number | null;
  created_at: string;
}

interface Props {
  partners: PartnerData[];
  activities: Activity[];
  listings: Listing[];
  onRegisterActivity: (partnerId: string) => void;
  onMarkMeetingDone: (activityId: string) => void;
  onDisqualify: (partner: PartnerData) => void;
}

const daysSince = (iso: string | null) => {
  if (!iso) return Infinity;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
};

const formatBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export function CockpitHeadPanel({
  partners,
  activities,
  listings,
  onRegisterActivity,
  onMarkMeetingDone,
  onDisqualify,
}: Props) {
  const now = Date.now();
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();

  const enriched = useMemo(() => {
    return partners.map((p) => {
      const pListings = listings.filter((l) => l.user_id === p.user_id);
      const leadsMonth = pListings.filter(
        (l) => new Date(l.created_at).getTime() >= startOfMonth
      ).length;
      const icpLeads = pListings.filter(
        (l) => (l.equity_score ?? 0) >= ICP_EQUITY_THRESHOLD
      ).length;
      const revenueEstimated = pListings.reduce(
        (s, l) => s + (l.asking_price ?? 0) * SUCCESS_FEE_PCT,
        0
      );
      const lastActivity = activities
        .filter((a) => a.partner_user_id === p.user_id)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

      const lastFollowup = activities.find(
        (a) => a.partner_user_id === p.user_id && a.activity_type === "followup"
      );
      const meetingsScheduled = activities.filter(
        (a) => a.partner_user_id === p.user_id && a.activity_type === "reuniao_agendada"
      ).length;
      const meetingsDone = activities.filter(
        (a) => a.partner_user_id === p.user_id && a.activity_type === "reuniao_realizada"
      ).length;

      const daysWithoutInteraction = Math.min(
        daysSince(p.last_listing_date),
        daysSince(lastActivity?.created_at ?? null)
      );

      const score =
        leadsMonth * 1 + icpLeads * 2 + p.exclusive_reservations * 5;

      return {
        ...p,
        leadsMonth,
        icpLeads,
        revenueEstimated,
        lastActivityAt: lastActivity?.created_at ?? null,
        lastFollowupAt: lastFollowup?.created_at ?? null,
        meetingsScheduled,
        meetingsDone,
        daysWithoutInteraction,
        score,
      };
    });
  }, [partners, activities, listings, startOfMonth]);

  const stats = useMemo(() => {
    const newPartners30d = partners.filter(
      (p) => now - new Date(p.created_at).getTime() < 30 * 86_400_000
    ).length;
    const totalActive = partners.filter((p) => p.is_active).length;
    const inactiveOver60 = partners.filter(
      (p) => daysSince(p.last_listing_date) > INACTIVE_DAYS
    ).length;
    const totalLeads = enriched.reduce((s, p) => s + p.listing_count, 0);
    const totalIcp = enriched.reduce((s, p) => s + p.icpLeads, 0);
    const icpPct = totalLeads > 0 ? Math.round((totalIcp / totalLeads) * 100) : 0;
    const leadsThisMonth = enriched.reduce((s, p) => s + p.leadsMonth, 0);
    const eventsThisMonth = activities.filter(
      (a) =>
        a.activity_type === "evento" &&
        a.completed_at &&
        new Date(a.completed_at).getTime() >= startOfMonth
    ).length;
    const meetingsScheduled = enriched.reduce((s, p) => s + p.meetingsScheduled, 0);
    const meetingsDone = enriched.reduce((s, p) => s + p.meetingsDone, 0);
    const totalRevenue = enriched.reduce((s, p) => s + p.revenueEstimated, 0);
    const targetRevenue = totalActive * MONTHLY_REVENUE_TARGET_PER_PARTNER;

    return {
      newPartners30d,
      totalActive,
      total: partners.length,
      inactiveOver60,
      icpPct,
      leadsThisMonth,
      eventsThisMonth,
      meetingsScheduled,
      meetingsDone,
      totalRevenue,
      targetRevenue,
    };
  }, [partners, enriched, activities, startOfMonth, now]);

  const topPerformers = useMemo(
    () => [...enriched].sort((a, b) => b.score - a.score).slice(0, 10),
    [enriched]
  );

  const partnersAtRisk = useMemo(
    () =>
      enriched
        .filter((p) => p.daysWithoutInteraction >= 30)
        .sort((a, b) => b.daysWithoutInteraction - a.daysWithoutInteraction),
    [enriched]
  );

  const cutCandidates = useMemo(
    () => enriched.filter((p) => p.daysWithoutInteraction >= CUT_DAYS),
    [enriched]
  );

  const pendingFollowups = useMemo(
    () =>
      enriched.filter(
        (p) =>
          p.is_active &&
          (!p.lastFollowupAt ||
            now - new Date(p.lastFollowupAt).getTime() > 14 * 86_400_000)
      ),
    [enriched, now]
  );

  const upcomingMeetings = useMemo(
    () =>
      activities
        .filter(
          (a) =>
            a.activity_type === "reuniao_agendada" &&
            a.scheduled_at &&
            !a.completed_at &&
            new Date(a.scheduled_at).getTime() >= now - 86_400_000
        )
        .sort(
          (a, b) =>
            new Date(a.scheduled_at!).getTime() - new Date(b.scheduled_at!).getTime()
        ),
    [activities, now]
  );

  const meetingsScoreboard = useMemo(
    () =>
      enriched
        .filter((p) => p.meetingsScheduled + p.meetingsDone > 0)
        .sort((a, b) => b.meetingsScheduled - a.meetingsScheduled)
        .slice(0, 10),
    [enriched]
  );

  const revenuePct = stats.targetRevenue
    ? Math.min(100, Math.round((stats.totalRevenue / stats.targetRevenue) * 100))
    : 0;

  const [activeRoutine, setActiveRoutine] = useState<
    "followups" | "meetings" | "pipeline" | "risk" | "cut"
  >("followups");

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          icon={Sparkles}
          label="Novos parceiros (30d)"
          value={stats.newPartners30d}
          accent="text-emerald-500"
        />
        <KpiCard
          icon={Users}
          label="Engajados / Total"
          value={`${stats.totalActive}/${stats.total}`}
          accent="text-primary"
        />
        <KpiCard
          icon={AlertTriangle}
          label={`Inativos (>${INACTIVE_DAYS}d)`}
          value={stats.inactiveOver60}
          accent="text-amber-500"
        />
        <KpiCard
          icon={Target}
          label="Leads no ICP"
          value={`${stats.icpPct}%`}
          accent="text-emerald-500"
        />
        <KpiCard
          icon={TrendingUp}
          label="Leads no mês"
          value={stats.leadsThisMonth}
          accent="text-primary"
        />
        <KpiCard
          icon={Calendar}
          label="Eventos realizados (mês)"
          value={stats.eventsThisMonth}
          accent="text-primary"
        />
        <KpiCard
          icon={CheckCircle2}
          label="Reuniões R/A"
          value={`${stats.meetingsDone}/${stats.meetingsScheduled}`}
          hint={
            stats.meetingsScheduled
              ? `${Math.round((stats.meetingsDone / stats.meetingsScheduled) * 100)}% conversão`
              : "—"
          }
          accent="text-emerald-500"
        />
        <KpiCard
          icon={DollarSign}
          label="Receita vs Estimativa"
          value={`${revenuePct}%`}
          hint={`${formatBRL(stats.totalRevenue)} / ${formatBRL(stats.targetRevenue)}`}
          accent="text-amber-500"
        />
      </div>

      {/* Rotinas + Top Performers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Rotinas do Dia
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <RoutineChip
                active={activeRoutine === "followups"}
                onClick={() => setActiveRoutine("followups")}
                label="Follow-ups pendentes"
                count={pendingFollowups.length}
              />
              <RoutineChip
                active={activeRoutine === "meetings"}
                onClick={() => setActiveRoutine("meetings")}
                label="Reuniões agendadas"
                count={upcomingMeetings.length}
              />
              <RoutineChip
                active={activeRoutine === "pipeline"}
                onClick={() => setActiveRoutine("pipeline")}
                label="Pipeline por parceiro"
                count={enriched.filter((p) => p.is_active).length}
              />
              <RoutineChip
                active={activeRoutine === "risk"}
                onClick={() => setActiveRoutine("risk")}
                label="Sem interação 30+d"
                count={partnersAtRisk.length}
              />
              <RoutineChip
                active={activeRoutine === "cut"}
                onClick={() => setActiveRoutine("cut")}
                label={`Corte (>${CUT_DAYS}d)`}
                count={cutCandidates.length}
              />
            </div>

            <div className="border border-border rounded-lg overflow-hidden">
              {activeRoutine === "followups" && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Parceiro</TableHead>
                      <TableHead>Último follow-up</TableHead>
                      <TableHead className="text-right">Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingFollowups.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground py-6">
                          Tudo em dia 🎉
                        </TableCell>
                      </TableRow>
                    )}
                    {pendingFollowups.slice(0, 8).map((p) => (
                      <TableRow key={p.user_id}>
                        <TableCell className="font-medium break-words">
                          {p.full_name || "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {p.lastFollowupAt
                            ? new Date(p.lastFollowupAt).toLocaleDateString("pt-BR")
                            : "Nunca"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" onClick={() => onRegisterActivity(p.user_id)}>
                            Registrar follow-up
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {activeRoutine === "meetings" && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Parceiro</TableHead>
                      <TableHead>Quando</TableHead>
                      <TableHead>Notas</TableHead>
                      <TableHead className="text-right">Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {upcomingMeetings.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                          Nenhuma reunião agendada
                        </TableCell>
                      </TableRow>
                    )}
                    {upcomingMeetings.slice(0, 10).map((a) => {
                      const partner = partners.find((p) => p.user_id === a.partner_user_id);
                      return (
                        <TableRow key={a.id}>
                          <TableCell className="font-medium break-words">
                            {partner?.full_name || "—"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(a.scheduled_at!).toLocaleString("pt-BR", {
                              dateStyle: "short",
                              timeStyle: "short",
                            })}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground break-words max-w-[200px]">
                            {a.notes || "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="outline" onClick={() => onMarkMeetingDone(a.id)}>
                              Marcar realizada
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}

              {activeRoutine === "pipeline" && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Parceiro</TableHead>
                      <TableHead>Realizado (mês)</TableHead>
                      <TableHead className="w-[40%]">Meta</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {enriched
                      .filter((p) => p.is_active)
                      .sort((a, b) => b.revenueEstimated - a.revenueEstimated)
                      .slice(0, 12)
                      .map((p) => {
                        const pct = Math.min(
                          100,
                          Math.round(
                            (p.revenueEstimated / MONTHLY_REVENUE_TARGET_PER_PARTNER) * 100
                          )
                        );
                        return (
                          <TableRow key={p.user_id}>
                            <TableCell className="font-medium break-words">
                              {p.full_name || "—"}
                            </TableCell>
                            <TableCell className="text-sm">
                              {formatBRL(p.revenueEstimated)}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Progress value={pct} className="h-2" />
                                <span className="text-xs text-muted-foreground w-10 text-right">
                                  {pct}%
                                </span>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              )}

              {activeRoutine === "risk" && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Parceiro</TableHead>
                      <TableHead>Sem interagir</TableHead>
                      <TableHead>Leads</TableHead>
                      <TableHead className="text-right">Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {partnersAtRisk.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                          Nenhum parceiro em risco
                        </TableCell>
                      </TableRow>
                    )}
                    {partnersAtRisk.slice(0, 10).map((p) => (
                      <TableRow key={p.user_id}>
                        <TableCell className="font-medium break-words">
                          {p.full_name || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              p.daysWithoutInteraction >= 90
                                ? "border-destructive text-destructive"
                                : "border-amber-500 text-amber-500"
                            }
                          >
                            {p.daysWithoutInteraction === Infinity ? "—" : `${p.daysWithoutInteraction}d`}
                          </Badge>
                        </TableCell>
                        <TableCell>{p.listing_count}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onRegisterActivity(p.user_id)}
                          >
                            Agendar follow-up
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}

              {activeRoutine === "cut" && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Parceiro</TableHead>
                      <TableHead>Sem interagir</TableHead>
                      <TableHead>Leads</TableHead>
                      <TableHead className="text-right">Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cutCandidates.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                          Nenhum candidato a corte
                        </TableCell>
                      </TableRow>
                    )}
                    {cutCandidates.map((p) => (
                      <TableRow key={p.user_id}>
                        <TableCell className="font-medium break-words">
                          {p.full_name || "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="destructive">
                            {p.daysWithoutInteraction === Infinity ? "—" : `${p.daysWithoutInteraction}d`}
                          </Badge>
                        </TableCell>
                        <TableCell>{p.listing_count}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => onDisqualify(p)}
                          >
                            Desqualificar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="h-4 w-4 text-amber-500" />
              Top Performers
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {topPerformers.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Sem dados ainda
              </p>
            )}
            {topPerformers.map((p, i) => (
              <div
                key={p.user_id}
                className="flex items-center justify-between gap-2 border-b border-border pb-2 last:border-0"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`text-xs font-bold w-5 text-center ${
                      i < 3 ? "text-amber-500" : "text-muted-foreground"
                    }`}
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{p.full_name || "—"}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {p.leadsMonth} no mês · {p.icpLeads} ICP · {p.exclusive_reservations} excl
                    </p>
                  </div>
                </div>
                <Badge variant="secondary">{p.score}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Reuniões agendadas vs realizadas */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            Reuniões: agendadas vs realizadas (90d)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Parceiro</TableHead>
                <TableHead>Agendadas</TableHead>
                <TableHead>Realizadas</TableHead>
                <TableHead>Taxa</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {meetingsScoreboard.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                    Sem reuniões registradas
                  </TableCell>
                </TableRow>
              )}
              {meetingsScoreboard.map((p) => {
                const rate =
                  p.meetingsScheduled > 0
                    ? Math.round((p.meetingsDone / p.meetingsScheduled) * 100)
                    : 0;
                return (
                  <TableRow key={p.user_id}>
                    <TableCell className="font-medium break-words">{p.full_name || "—"}</TableCell>
                    <TableCell>{p.meetingsScheduled}</TableCell>
                    <TableCell>{p.meetingsDone}</TableCell>
                    <TableCell>
                      <Badge variant={rate >= 70 ? "default" : rate >= 40 ? "secondary" : "outline"}>
                        {rate}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: any;
  label: string;
  value: string | number;
  hint?: string;
  accent?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground break-words">
              {label}
            </p>
            <p className={`text-2xl font-bold mt-1 tabular-nums ${accent || "text-foreground"}`}>
              {value}
            </p>
            {hint && <p className="text-[10px] text-muted-foreground mt-0.5">{hint}</p>}
          </div>
          <Icon className={`h-5 w-5 shrink-0 ${accent || "text-muted-foreground"}`} />
        </div>
      </CardContent>
    </Card>
  );
}

function RoutineChip({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-xs px-3 py-1.5 rounded-full border transition-colors flex items-center gap-2 ${
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-transparent border-border text-muted-foreground hover:text-foreground hover:border-primary/40"
      }`}
    >
      {label}
      <span
        className={`text-[10px] font-bold rounded-full px-1.5 py-0.5 ${
          active ? "bg-primary-foreground/20" : "bg-muted"
        }`}
      >
        {count}
      </span>
    </button>
  );
}
