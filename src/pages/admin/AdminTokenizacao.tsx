import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Layers, Plus, Check, X, Loader2 } from "lucide-react";

const fmtBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(n || 0);

export default function AdminTokenizacao() {
  const [tab, setTab] = useState<"tokens" | "kyc" | "reservas">("tokens");
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Layers className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-semibold">Tokenização — Admin</h1>
      </div>
      <div className="border-b mb-6 flex gap-1">
        {[["tokens","Tokens & Ofertas"],["kyc","KYCs"],["reservas","Reservas"]].map(([k,l])=>(
          <button key={k} onClick={()=>setTab(k as any)}
            className={`px-4 py-2 text-sm border-b-2 ${tab===k ? "border-primary text-primary" : "border-transparent text-muted-foreground"}`}>
            {l}
          </button>
        ))}
      </div>
      {tab==="tokens" && <TokensTab />}
      {tab==="kyc" && <KycTab />}
      {tab==="reservas" && <ReservasTab />}
    </div>
  );
}

function TokensTab() {
  const [listings, setListings] = useState<any[]>([]);
  const [tokens, setTokens] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    const [l, t] = await Promise.all([
      supabase.from("listings").select("id,title,category,cnpj,annual_revenue,is_tokenizable").eq("is_tokenizable", true).limit(50),
      supabase.from("tokens").select("*").order("created_at",{ascending:false}),
    ]);
    setListings(l.data || []);
    setTokens(t.data || []);
    setLoading(false);
  }
  useEffect(()=>{ load(); }, []);

  async function toggleTokenizable(listingId: string, current: boolean) {
    await supabase.from("listings").update({ is_tokenizable: !current }).eq("id", listingId);
    load();
  }

  return (
    <div className="space-y-8">
      <section>
        <div className="flex justify-between mb-3">
          <h2 className="font-semibold">Tokens criados</h2>
          <Button size="sm" onClick={()=>setEditing({})}><Plus className="w-3 h-3 mr-1" /> Novo token</Button>
        </div>
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-xs">
              <tr><th className="text-left p-2">Símbolo</th><th className="text-left p-2">Nome</th><th>Instrumento</th><th>Preço</th><th>Supply</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              {tokens.map(t=>(
                <tr key={t.id} className="border-t">
                  <td className="p-2 font-mono">{t.symbol}</td>
                  <td className="p-2">{t.name}</td>
                  <td className="p-2 text-xs">{t.instrument_type}</td>
                  <td className="p-2 text-right font-mono">{fmtBRL(t.initial_price)}</td>
                  <td className="p-2 text-right font-mono">{Intl.NumberFormat("pt-BR").format(t.total_supply)}</td>
                  <td className="p-2"><span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary">{t.status}</span></td>
                  <td className="p-2"><Button size="sm" variant="outline" onClick={()=>setEditing(t)}>Editar</Button></td>
                </tr>
              ))}
              {tokens.length===0 && <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">Nenhum token criado.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="font-semibold mb-3">Listings marcados como tokenizáveis</h2>
        <p className="text-xs text-muted-foreground mb-3">
          Para um anúncio aparecer no /investir, marque <strong>is_tokenizable</strong> e crie o token correspondente.
        </p>
        {loading ? "..." : (
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs">
                <tr><th className="text-left p-2">Empresa</th><th>Setor</th><th>Receita</th><th>CNPJ</th><th></th></tr>
              </thead>
              <tbody>
                {listings.map(l=>(
                  <tr key={l.id} className="border-t">
                    <td className="p-2">{l.title}</td>
                    <td className="p-2 text-xs">{l.category}</td>
                    <td className="p-2 text-right font-mono">{l.annual_revenue ? fmtBRL(l.annual_revenue) : "—"}</td>
                    <td className="p-2 font-mono text-xs">{l.cnpj || "—"}</td>
                    <td className="p-2"><Button size="sm" variant="outline" onClick={()=>setEditing({ listing_id: l.id, name: l.title })}>Criar token</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {editing !== null && (
        <TokenEditor token={editing} listings={listings} onClose={()=>{setEditing(null); load();}} />
      )}
    </div>
  );
}

function TokenEditor({ token, listings, onClose }: any) {
  const isNew = !token?.id;
  const [f, setF] = useState({
    listing_id: token.listing_id || "",
    symbol: token.symbol || "",
    name: token.name || "",
    instrument_type: token.instrument_type || "equity",
    total_supply: token.total_supply || 1000000,
    initial_price: token.initial_price || 100,
    min_ticket: token.min_ticket || 1000,
    total_offering_amount: token.total_offering_amount || 0,
    economic_rights: token.economic_rights || "",
    eligibility_restrictions: token.eligibility_restrictions || "",
    legal_instrument: token.legal_instrument || "",
    status: token.status || "structuring",
    risk_level: token.risk_level || "medium",
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const payload: any = { ...f };
      if (!payload.listing_id) delete payload.listing_id;
      const { error } = isNew
        ? await supabase.from("tokens").insert(payload)
        : await supabase.from("tokens").update(payload).eq("id", token.id);
      if (error) throw error;
      toast.success(isNew ? "Token criado" : "Token atualizado");
      onClose();
    } catch (e:any) { toast.error(e.message); }
    finally { setSaving(false); }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{isNew ? "Novo token" : `Editar ${token.symbol}`}</DialogTitle></DialogHeader>
        <div className="grid md:grid-cols-2 gap-3">
          <Fld label="Símbolo (ex: ACME1)"><Input value={f.symbol} onChange={e=>setF({...f,symbol:e.target.value.toUpperCase()})} /></Fld>
          <Fld label="Nome"><Input value={f.name} onChange={e=>setF({...f,name:e.target.value})} /></Fld>
          <Fld label="Instrumento">
            <select value={f.instrument_type} onChange={e=>setF({...f,instrument_type:e.target.value})} className="w-full h-10 px-3 border rounded">
              <option value="equity">Equity</option>
              <option value="debt">Dívida</option>
              <option value="cic">CIC</option>
              <option value="receivable">Recebível</option>
              <option value="revenue_share">Revenue share</option>
            </select>
          </Fld>
          <Fld label="Risco">
            <select value={f.risk_level} onChange={e=>setF({...f,risk_level:e.target.value})} className="w-full h-10 px-3 border rounded">
              <option value="low">Baixo</option><option value="medium">Médio</option><option value="high">Alto</option>
            </select>
          </Fld>
          <Fld label="Status">
            <select value={f.status} onChange={e=>setF({...f,status:e.target.value})} className="w-full h-10 px-3 border rounded">
              {["structuring","legal_review","approved","issued","primary_open","primary_closed","secondary_open","suspended","closed"].map(s=>(<option key={s}>{s}</option>))}
            </select>
          </Fld>
          <Fld label="Listing vinculado">
            <select value={f.listing_id} onChange={e=>setF({...f,listing_id:e.target.value})} className="w-full h-10 px-3 border rounded">
              <option value="">(nenhum)</option>
              {listings.map((l:any)=>(<option key={l.id} value={l.id}>{l.title}</option>))}
            </select>
          </Fld>
          <Fld label="Supply total"><Input type="number" value={f.total_supply} onChange={e=>setF({...f,total_supply:Number(e.target.value)})} /></Fld>
          <Fld label="Preço inicial (R$)"><Input type="number" value={f.initial_price} onChange={e=>setF({...f,initial_price:Number(e.target.value)})} /></Fld>
          <Fld label="Ticket mínimo (R$)"><Input type="number" value={f.min_ticket} onChange={e=>setF({...f,min_ticket:Number(e.target.value)})} /></Fld>
          <Fld label="Volume total da oferta (R$)"><Input type="number" value={f.total_offering_amount} onChange={e=>setF({...f,total_offering_amount:Number(e.target.value)})} /></Fld>
          <Fld label="Instrumento jurídico" full><Input value={f.legal_instrument} onChange={e=>setF({...f,legal_instrument:e.target.value})} placeholder="Ex: Contrato de Investimento Coletivo" /></Fld>
          <Fld label="Direitos econômicos" full>
            <textarea value={f.economic_rights} onChange={e=>setF({...f,economic_rights:e.target.value})} rows={3} className="w-full p-2 border rounded text-sm" />
          </Fld>
          <Fld label="Restrições de elegibilidade" full>
            <textarea value={f.eligibility_restrictions} onChange={e=>setF({...f,eligibility_restrictions:e.target.value})} rows={2} className="w-full p-2 border rounded text-sm" />
          </Fld>
        </div>
        <Button onClick={save} disabled={saving} className="w-full mt-4">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function Fld({ label, children, full }: any) {
  return <div className={full ? "md:col-span-2" : ""}><label className="text-xs text-muted-foreground mb-1 block">{label}</label>{children}</div>;
}

function KycTab() {
  const [list, setList] = useState<any[]>([]);
  async function load() {
    const { data } = await supabase.from("investor_kyc").select("*").order("submitted_at",{ascending:false});
    setList(data || []);
  }
  useEffect(()=>{load();},[]);

  async function review(id: string, status: string, reason?: string) {
    await supabase.from("investor_kyc").update({ status, reviewed_at: new Date().toISOString(), rejection_reason: reason || null }).eq("id", id);
    toast.success(status === "approved" ? "Aprovado" : "Rejeitado");
    load();
  }
  return (
    <div className="border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/30 text-xs"><tr><th className="text-left p-2">Nome</th><th>CPF</th><th>Status</th><th>Enviado</th><th></th></tr></thead>
        <tbody>
          {list.map(k=>(
            <tr key={k.id} className="border-t">
              <td className="p-2">{k.full_name || "—"}</td>
              <td className="p-2 font-mono text-xs">{k.cpf || "—"}</td>
              <td className="p-2"><span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary">{k.status}</span></td>
              <td className="p-2 text-xs">{k.submitted_at ? new Date(k.submitted_at).toLocaleDateString("pt-BR") : "—"}</td>
              <td className="p-2 space-x-2">
                {k.status !== "approved" && <Button size="sm" onClick={()=>review(k.id,"approved")}><Check className="w-3 h-3" /></Button>}
                {k.status !== "rejected" && <Button size="sm" variant="outline" onClick={()=>review(k.id,"rejected","Dados incompletos")}><X className="w-3 h-3" /></Button>}
              </td>
            </tr>
          ))}
          {list.length===0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Nenhum KYC enviado.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function ReservasTab() {
  const [list, setList] = useState<any[]>([]);
  async function load() {
    const { data } = await supabase.from("primary_reservations").select("*, tokens(symbol,name)").order("created_at",{ascending:false});
    setList(data || []);
  }
  useEffect(()=>{load();},[]);

  async function allocate(id: string) {
    const { error } = await supabase.rpc("fn_allocate_reservation", { _reservation_id: id });
    if (error) toast.error(error.message); else { toast.success("Alocado"); load(); }
  }
  return (
    <div className="border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-muted/30 text-xs"><tr><th className="text-left p-2">Ativo</th><th>Qtd</th><th>Total</th><th>Status</th><th>Data</th><th></th></tr></thead>
        <tbody>
          {list.map(r=>(
            <tr key={r.id} className="border-t">
              <td className="p-2">{r.tokens?.symbol} — {r.tokens?.name}</td>
              <td className="p-2 text-right font-mono">{Number(r.quantity).toFixed(4)}</td>
              <td className="p-2 text-right font-mono">{fmtBRL(Number(r.total_amount))}</td>
              <td className="p-2"><span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary">{r.status}</span></td>
              <td className="p-2 text-xs">{new Date(r.created_at).toLocaleDateString("pt-BR")}</td>
              <td className="p-2">
                {r.status === "confirmed" && <Button size="sm" onClick={()=>allocate(r.id)}>Alocar</Button>}
              </td>
            </tr>
          ))}
          {list.length===0 && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Nenhuma reserva.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
