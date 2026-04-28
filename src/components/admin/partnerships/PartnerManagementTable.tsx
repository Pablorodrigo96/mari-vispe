// Tabela de gestão de parceiros com ações: aprovar, suspender, reativar, desqualificar, criar.
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  MoreHorizontal,
  UserPlus,
  Search,
  CheckCircle2,
  Pause,
  Play,
  Ban,
  Copy,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  PARTNER_STATUS_BADGE,
  PARTNER_STATUS_LABEL,
  type PartnerStatus,
} from "@/lib/partnershipsTargets";

interface PartnerRow {
  user_id: string;
  full_name: string | null;
  company_name: string | null;
  phone: string | null;
  created_at: string;
  partner_status: PartnerStatus;
  is_partner_accountant: boolean;
  listing_count: number;
  last_listing_date: string | null;
}

interface Props {
  partners: PartnerRow[];
  onChanged: () => void;
}

type Action = "create" | "disqualify" | null;

export function PartnerManagementTable({ partners, onChanged }: Props) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [action, setAction] = useState<Action>(null);
  const [selected, setSelected] = useState<PartnerRow | null>(null);
  const [magicLink, setMagicLink] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Create form
  const [form, setForm] = useState({
    email: "",
    full_name: "",
    phone: "",
    company_name: "",
  });
  const [disqualifyReason, setDisqualifyReason] = useState("");

  const filtered = partners.filter((p) => {
    const term = search.toLowerCase();
    const matchSearch =
      !term ||
      (p.full_name || "").toLowerCase().includes(term) ||
      (p.company_name || "").toLowerCase().includes(term);
    const matchStatus = statusFilter === "all" || p.partner_status === statusFilter;
    return matchSearch && matchStatus;
  });

  const updateStatus = async (
    p: PartnerRow,
    next: PartnerStatus,
    extras?: Record<string, unknown>
  ) => {
    const { error } = await supabase
      .from("profiles")
      .update({ partner_status: next, ...(extras || {}) })
      .eq("user_id", p.user_id);
    if (error) {
      toast.error("Erro ao atualizar status");
      return;
    }
    toast.success(`Parceiro ${PARTNER_STATUS_LABEL[next].toLowerCase()}`);
    onChanged();
  };

  const handleApprove = async (p: PartnerRow) => {
    const { error: profErr } = await supabase
      .from("profiles")
      .update({ is_partner_accountant: true, partner_status: "active" })
      .eq("user_id", p.user_id);
    if (profErr) {
      toast.error("Erro ao aprovar");
      return;
    }
    await supabase
      .from("user_roles")
      .upsert({ user_id: p.user_id, role: "advisor" }, { onConflict: "user_id,role" });
    toast.success("Parceiro aprovado");
    onChanged();
  };

  const handleSuspend = (p: PartnerRow) => updateStatus(p, "suspended");
  const handleReactivate = (p: PartnerRow) =>
    updateStatus(p, "active", {
      partner_disqualified_at: null,
      partner_disqualified_reason: null,
    });

  const handleDisqualifySubmit = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      await updateStatus(selected, "disqualified", {
        partner_disqualified_at: new Date().toISOString(),
        partner_disqualified_reason: disqualifyReason || null,
      });
      // Remove advisor role
      await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", selected.user_id)
        .eq("role", "advisor");
      // Log activity
      const auth = await supabase.auth.getUser();
      if (auth.data.user) {
        await supabase.from("partner_activities").insert({
          partner_user_id: selected.user_id,
          activity_type: "corte",
          notes: disqualifyReason || "Desqualificado pelo Head",
          created_by: auth.data.user.id,
          completed_at: new Date().toISOString(),
        });
      }
      setAction(null);
      setSelected(null);
      setDisqualifyReason("");
      onChanged();
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateSubmit = async () => {
    if (!form.email || !form.full_name) {
      toast.error("Preencha nome e email");
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-partner", {
        body: form,
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success("Parceiro criado!");
      setMagicLink((data as any)?.magic_link ?? null);
      setForm({ email: "", full_name: "", phone: "", company_name: "" });
      onChanged();
    } catch (e: any) {
      toast.error(e?.message || "Erro ao criar parceiro");
    } finally {
      setSubmitting(false);
    }
  };

  const closeCreate = () => {
    setAction(null);
    setMagicLink(null);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
        <CardTitle className="text-base">Gestão de Parceiros</CardTitle>
        <Button size="sm" onClick={() => setAction("create")}>
          <UserPlus className="h-4 w-4 mr-2" />
          Criar parceiro
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou empresa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos status</SelectItem>
              <SelectItem value="pending">Pendentes</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="suspended">Suspensos</SelectItem>
              <SelectItem value="disqualified">Desqualificados</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Parceiro</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Leads</TableHead>
              <TableHead>Última indicação</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  Nenhum parceiro encontrado
                </TableCell>
              </TableRow>
            )}
            {filtered.map((p) => (
              <TableRow key={p.user_id}>
                <TableCell className="break-words">
                  <p className="font-medium">{p.full_name || "—"}</p>
                  <p className="text-xs text-muted-foreground">{p.phone || ""}</p>
                </TableCell>
                <TableCell className="text-sm break-words">{p.company_name || "—"}</TableCell>
                <TableCell>
                  <Badge variant={PARTNER_STATUS_BADGE[p.partner_status]}>
                    {PARTNER_STATUS_LABEL[p.partner_status]}
                  </Badge>
                </TableCell>
                <TableCell>{p.listing_count}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {p.last_listing_date
                    ? new Date(p.last_listing_date).toLocaleDateString("pt-BR")
                    : "—"}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-popover">
                      <DropdownMenuLabel>Ações</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {p.partner_status === "pending" && (
                        <DropdownMenuItem onClick={() => handleApprove(p)}>
                          <CheckCircle2 className="h-4 w-4 mr-2 text-emerald-500" />
                          Aprovar acesso
                        </DropdownMenuItem>
                      )}
                      {p.partner_status === "active" && (
                        <DropdownMenuItem onClick={() => handleSuspend(p)}>
                          <Pause className="h-4 w-4 mr-2 text-amber-500" />
                          Suspender
                        </DropdownMenuItem>
                      )}
                      {(p.partner_status === "suspended" ||
                        p.partner_status === "disqualified") && (
                        <DropdownMenuItem onClick={() => handleReactivate(p)}>
                          <Play className="h-4 w-4 mr-2 text-emerald-500" />
                          Reativar
                        </DropdownMenuItem>
                      )}
                      {p.partner_status !== "disqualified" && (
                        <DropdownMenuItem
                          onClick={() => {
                            setSelected(p);
                            setAction("disqualify");
                          }}
                          className="text-destructive focus:text-destructive"
                        >
                          <Ban className="h-4 w-4 mr-2" />
                          Desqualificar
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      {/* CREATE PARTNER DIALOG */}
      <Dialog open={action === "create"} onOpenChange={(o) => !o && closeCreate()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar novo parceiro</DialogTitle>
            <DialogDescription>
              Cria conta com acesso de parceiro contábil. Um link mágico de boas-vindas será gerado.
            </DialogDescription>
          </DialogHeader>

          {magicLink ? (
            <div className="space-y-3">
              <p className="text-sm">
                Parceiro criado! Compartilhe este link de acesso:
              </p>
              <div className="flex gap-2">
                <Input value={magicLink} readOnly className="text-xs" />
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(magicLink);
                    toast.success("Link copiado");
                  }}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <DialogFooter>
                <Button onClick={closeCreate}>Fechar</Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="cp-name">Nome completo *</Label>
                <Input
                  id="cp-name"
                  value={form.full_name}
                  onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="cp-email">Email *</Label>
                <Input
                  id="cp-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="cp-phone">Telefone</Label>
                  <Input
                    id="cp-phone"
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="cp-company">Escritório / Empresa</Label>
                  <Input
                    id="cp-company"
                    value={form.company_name}
                    onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={closeCreate}>
                  Cancelar
                </Button>
                <Button onClick={handleCreateSubmit} disabled={submitting}>
                  {submitting ? "Criando..." : "Criar parceiro"}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* DISQUALIFY DIALOG */}
      <Dialog
        open={action === "disqualify"}
        onOpenChange={(o) => {
          if (!o) {
            setAction(null);
            setSelected(null);
            setDisqualifyReason("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Desqualificar parceiro</DialogTitle>
            <DialogDescription>
              {selected?.full_name} perderá o acesso de parceiro e a role advisor.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="dq-reason">Motivo (opcional)</Label>
            <Textarea
              id="dq-reason"
              placeholder="Inativo há mais de 90 dias, sem indicações qualificadas..."
              value={disqualifyReason}
              onChange={(e) => setDisqualifyReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAction(null);
                setSelected(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDisqualifySubmit}
              disabled={submitting}
            >
              {submitting ? "Desqualificando..." : "Confirmar desqualificação"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
