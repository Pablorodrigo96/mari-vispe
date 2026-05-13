import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft, ExternalLink, FileText, DollarSign, Briefcase, Bell, Heart, Eye, User as UserIcon, Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";

const fmtBRL = (n: number | null | undefined) =>
  n == null ? "—" : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(n);
const fmtDate = (s: string | null | undefined) =>
  s ? new Date(s).toLocaleDateString("pt-BR") : "—";
const fmtDateTime = (s: string | null | undefined) =>
  s ? new Date(s).toLocaleString("pt-BR") : "—";

export default function AdminUserDetail() {
  const { userId = "" } = useParams();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-user-detail", userId],
    enabled: !!userId,
    queryFn: async () => {
      const [
        profile, roles, subscription, listings, valuations, capital,
        mariLead, finDocs, interests, notifications, notes,
      ] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", userId),
        supabase.from("subscriptions").select("*").eq("user_id", userId).maybeSingle(),
        supabase.from("listings").select("id,title,codename,category,city,state,asking_price,annual_revenue,status,plan,created_at").eq("user_id", userId).order("created_at", { ascending: false }),
        supabase.from("valuation_history").select("id,valuation_type,company_type,segment,result,status,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(50),
        supabase.from("capital_requests").select("id,company_name,capital_type,objective,requested_amount,status,lead_score,created_at").eq("user_id", userId).order("created_at", { ascending: false }),
        supabase.from("mari_leads").select("*").eq("user_id", userId).order("created_at", { ascending: false }).limit(10),
        supabase.from("listing_financial_docs").select("id,listing_id,doc_type,file_name,file_url,status,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(50),
        supabase.from("interest_logs").select("id,listing_id,investor_name,investor_email,investor_company,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(50),
        supabase.from("notifications").select("id,type,title,content,is_read,created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(30),
        supabase.from("eb_entity_notes" as any).select("*").eq("entity_type", "profile" as any).eq("entity_id", userId).order("updated_at", { ascending: false }),
      ]);
      return {
        profile: profile.data,
        roles: (roles.data ?? []).map(r => r.role as string),
        subscription: subscription.data,
        listings: listings.data ?? [],
        valuations: valuations.data ?? [],
        capital: capital.data ?? [],
        mariLead: mariLead.data ?? [],
        finDocs: finDocs.data ?? [],
        interests: interests.data ?? [],
        notifications: notifications.data ?? [],
        notes: (notes.data as any[]) ?? [],
      };
    },
  });

  if (isLoading || !data) {
    return (
      <AdminLayout>
        <div className="space-y-4">
          <div className="h-8 w-64 bg-muted animate-pulse rounded" />
          <div className="h-32 bg-muted animate-pulse rounded" />
          <div className="h-96 bg-muted animate-pulse rounded" />
        </div>
      </AdminLayout>
    );
  }

  const { profile, roles, subscription, listings, valuations, capital, mariLead, finDocs, interests, notifications, notes } = data;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/admin/users")} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Voltar para usuários
        </Button>

        {/* Header */}
        <Card>
          <CardContent className="p-6 flex flex-col md:flex-row md:items-center gap-4 justify-between">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                <UserIcon className="h-7 w-7 text-primary" />
              </div>
              <div className="min-w-0">
                <h1 className="text-2xl font-bold break-words">{profile?.full_name || "Sem nome"}</h1>
                <p className="text-sm text-muted-foreground break-words">
                  {profile?.phone || "Sem telefone"} · {(profile as any)?.company_name || "—"} · {profile?.city || "—"}/{profile?.state || "—"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">ID: {userId}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              {roles.length === 0 ? <Badge variant="outline">Sem roles</Badge> :
                roles.map(r => <Badge key={r}>{r}</Badge>)}
              {subscription && (
                <Badge variant="secondary" className="ml-2">
                  Plano {subscription.plan} · {subscription.status}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <Kpi icon={Briefcase} label="Anúncios" value={listings.length} />
          <Kpi icon={DollarSign} label="Valuations" value={valuations.length} />
          <Kpi icon={Sparkles} label="Captações" value={capital.length} />
          <Kpi icon={FileText} label="Documentos" value={finDocs.length} />
          <Kpi icon={Heart} label="Interesses" value={interests.length} />
          <Kpi icon={Bell} label="Notificações" value={notifications.length} />
        </div>

        <Tabs defaultValue="listings" className="w-full">
          <TabsList className="flex flex-wrap h-auto">
            <TabsTrigger value="listings">Anúncios ({listings.length})</TabsTrigger>
            <TabsTrigger value="valuations">Valuations ({valuations.length})</TabsTrigger>
            <TabsTrigger value="capital">Captações ({capital.length})</TabsTrigger>
            <TabsTrigger value="docs">Documentos ({finDocs.length})</TabsTrigger>
            <TabsTrigger value="interests">Interesses ({interests.length})</TabsTrigger>
            <TabsTrigger value="mari">Mari ({mariLead.length})</TabsTrigger>
            <TabsTrigger value="notifications">Notificações ({notifications.length})</TabsTrigger>
            <TabsTrigger value="notes">Notas ({notes.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="listings">
            <Card><CardContent className="p-0">
              {listings.length === 0 ? <Empty msg="Nenhum anúncio." /> : (
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Codinome / Título</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Local</TableHead>
                    <TableHead>Preço</TableHead>
                    <TableHead>Faturamento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Criado</TableHead>
                    <TableHead></TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {listings.map((l: any) => (
                      <TableRow key={l.id}>
                        <TableCell className="break-words max-w-[260px]">
                          <div className="font-medium">{l.codename || "—"}</div>
                          <div className="text-xs text-muted-foreground">{l.title}</div>
                        </TableCell>
                        <TableCell>{l.category}</TableCell>
                        <TableCell>{l.city}/{l.state}</TableCell>
                        <TableCell>{fmtBRL(l.asking_price)}</TableCell>
                        <TableCell>{fmtBRL(l.annual_revenue)}</TableCell>
                        <TableCell><Badge variant="outline">{l.status}</Badge></TableCell>
                        <TableCell className="text-xs">{fmtDate(l.created_at)}</TableCell>
                        <TableCell>
                          <Link to={`/anuncio/${l.id}`} target="_blank">
                            <Button variant="ghost" size="icon"><ExternalLink className="h-4 w-4" /></Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="valuations">
            <Card><CardContent className="p-0">
              {valuations.length === 0 ? <Empty msg="Nenhum valuation." /> : (
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Setor</TableHead>
                    <TableHead>Resultado</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {valuations.map((v: any) => {
                      const result = v.result as any;
                      const value =
                        result?.fairValue ?? result?.value ?? result?.estimated ?? result?.final ?? null;
                      return (
                        <TableRow key={v.id}>
                          <TableCell><Badge>{v.valuation_type}</Badge></TableCell>
                          <TableCell>{v.segment || v.company_type || "—"}</TableCell>
                          <TableCell className="font-medium">{typeof value === "number" ? fmtBRL(value) : "—"}</TableCell>
                          <TableCell>{v.status}</TableCell>
                          <TableCell className="text-xs">{fmtDateTime(v.created_at)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="capital">
            <Card><CardContent className="p-0">
              {capital.length === 0 ? <Empty msg="Nenhuma captação." /> : (
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Objetivo</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead></TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {capital.map((c: any) => (
                      <TableRow key={c.id}>
                        <TableCell className="break-words max-w-[200px]">{c.company_name}</TableCell>
                        <TableCell>{c.capital_type}</TableCell>
                        <TableCell className="break-words max-w-[200px] text-xs">{c.objective}</TableCell>
                        <TableCell>{fmtBRL(c.requested_amount)}</TableCell>
                        <TableCell>{c.lead_score ?? "—"}</TableCell>
                        <TableCell><Badge variant="outline">{c.status}</Badge></TableCell>
                        <TableCell className="text-xs">{fmtDate(c.created_at)}</TableCell>
                        <TableCell>
                          <Link to={`/admin/capital`}><Button variant="ghost" size="icon"><ExternalLink className="h-4 w-4" /></Button></Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="docs">
            <Card><CardContent className="p-0">
              {finDocs.length === 0 ? <Empty msg="Nenhum documento." /> : (
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Arquivo</TableHead>
                    <TableHead>Anúncio</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Enviado</TableHead>
                    <TableHead></TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {finDocs.map((d: any) => (
                      <TableRow key={d.id}>
                        <TableCell><Badge variant="outline">{d.doc_type}</Badge></TableCell>
                        <TableCell className="break-words max-w-[240px] text-xs">{d.file_name || "—"}</TableCell>
                        <TableCell className="text-xs">{d.listing_id?.slice(0, 8) ?? "—"}</TableCell>
                        <TableCell>{d.status}</TableCell>
                        <TableCell className="text-xs">{fmtDate(d.created_at)}</TableCell>
                        <TableCell>
                          {d.file_url && (
                            <a href={d.file_url} target="_blank" rel="noreferrer">
                              <Button variant="ghost" size="icon"><ExternalLink className="h-4 w-4" /></Button>
                            </a>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="interests">
            <Card><CardContent className="p-0">
              {interests.length === 0 ? <Empty msg="Nenhum interesse registrado." /> : (
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Investidor</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Anúncio</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {interests.map((i: any) => (
                      <TableRow key={i.id}>
                        <TableCell className="break-words">{i.investor_name || "—"}</TableCell>
                        <TableCell className="break-words">{i.investor_company || "—"}</TableCell>
                        <TableCell className="text-xs break-words">{i.investor_email || "—"}</TableCell>
                        <TableCell className="text-xs">{i.listing_id?.slice(0, 8)}</TableCell>
                        <TableCell className="text-xs">{fmtDateTime(i.created_at)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="mari">
            <Card><CardContent className="p-0">
              {mariLead.length === 0 ? <Empty msg="Nenhum lead Mari." /> : (
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>CNPJ</TableHead>
                    <TableHead>Razão Social</TableHead>
                    <TableHead>UF/Cidade</TableHead>
                    <TableHead>CNAE</TableHead>
                    <TableHead>Janela</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {mariLead.map((m: any) => (
                      <TableRow key={m.id}>
                        <TableCell className="text-xs">{m.cnpj}</TableCell>
                        <TableCell className="break-words max-w-[220px]">{m.razao_social || "—"}</TableCell>
                        <TableCell>{m.uf}/{m.cidade}</TableCell>
                        <TableCell className="text-xs">{m.cnae || "—"}</TableCell>
                        <TableCell>{m.window_base ?? "—"}</TableCell>
                        <TableCell><Badge>{m.status}</Badge></TableCell>
                        <TableCell className="text-xs">{fmtDate(m.created_at)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="notifications">
            <Card><CardContent className="p-0">
              {notifications.length === 0 ? <Empty msg="Nenhuma notificação." /> : (
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Título</TableHead>
                    <TableHead>Conteúdo</TableHead>
                    <TableHead>Lida</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {notifications.map((n: any) => (
                      <TableRow key={n.id}>
                        <TableCell><Badge variant="outline">{n.type}</Badge></TableCell>
                        <TableCell className="break-words max-w-[200px]">{n.title}</TableCell>
                        <TableCell className="break-words max-w-[360px] text-xs">{n.content}</TableCell>
                        <TableCell>{n.is_read ? "✓" : "—"}</TableCell>
                        <TableCell className="text-xs">{fmtDateTime(n.created_at)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent></Card>
          </TabsContent>

          <TabsContent value="notes">
            <Card><CardContent className="p-4 space-y-3">
              {notes.length === 0 ? <Empty msg="Nenhuma nota admin." /> : (
                notes.map((n: any) => (
                  <div key={n.id} className="border rounded p-3">
                    <div className="flex justify-between items-start gap-2">
                      <div className="font-medium">{n.title || "Sem título"}</div>
                      <span className="text-xs text-muted-foreground">{fmtDateTime(n.updated_at)}</span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap break-words mt-2">{n.body_md}</p>
                  </div>
                ))
              )}
            </CardContent></Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}

function Kpi({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-muted-foreground text-xs">
          <Icon className="h-4 w-4" /> {label}
        </div>
        <div className="text-2xl font-bold mt-1">{value}</div>
      </CardContent>
    </Card>
  );
}

function Empty({ msg }: { msg: string }) {
  return <div className="p-8 text-center text-sm text-muted-foreground">{msg}</div>;
}
