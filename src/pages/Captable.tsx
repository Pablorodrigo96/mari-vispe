import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCaptables } from "@/hooks/useCaptables";
import { CaptableCard } from "@/components/captable/CaptableCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, PieChart, TrendingUp } from "lucide-react";
import { brl } from "@/lib/painelExecutive";
import { Seo } from "@/components/seo/Seo";
import { toast } from "@/hooks/use-toast";

export default function Captable() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { items, eligibleListings, loading, createForListing, syncRfb, addPartner, updatePartner, deletePartner, updateCaptable, remove } = useCaptables();
  const [picked, setPicked] = useState<string>("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth?redirect=/captable");
  }, [user, authLoading, navigate]);

  const totalValuation = items.reduce((a, c) => a + (Number(c.valuation_amount) || 0), 0);
  const totalAvail = items.reduce((a, c) => a + (Number(c.available_for_sale_pct) / 100) * (Number(c.valuation_amount) || 0), 0);

  const handleCreate = async () => {
    if (!picked) return;
    setCreating(true);
    try {
      await createForListing(picked);
      setPicked("");
      toast({ title: "Cap-table criado", description: "Sócios da RFB sendo importados." });
    } catch (e: any) {
      toast({ title: "Erro", description: e?.message || "Não foi possível criar", variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <Seo title="Cap-table — mari" description="Quadro societário e valuation por sócio de cada empresa." path="/captable" />

      <div>
        <p className="text-[10px] uppercase tracking-[0.4em] text-accent mb-2">designed forward</p>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Cap-table</h1>
        <p className="text-muted-foreground text-sm">
          Quadro societário e valor por sócio de cada empresa sua. Prepara seus ativos para o mari.invest.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        <Card className="!bg-slate-900/60 backdrop-blur-md border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <PieChart className="w-5 h-5 text-accent" />
            <div>
              <div className="text-xs text-muted-foreground">Empresas no cap-table</div>
              <div className="text-2xl font-semibold">{items.length}</div>
            </div>
          </CardContent>
        </Card>
        <Card className="!bg-slate-900/60 backdrop-blur-md border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-accent" />
            <div>
              <div className="text-xs text-muted-foreground">Valuation consolidado</div>
              <div className="text-2xl font-semibold">{brl(totalValuation)}</div>
            </div>
          </CardContent>
        </Card>
        <Card className="!bg-slate-900/60 backdrop-blur-md border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <Plus className="w-5 h-5 text-accent" />
            <div>
              <div className="text-xs text-muted-foreground">Disponível para mari.invest</div>
              <div className="text-2xl font-semibold">{brl(totalAvail)}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="!bg-slate-900/60 backdrop-blur-md border-border/50">
        <CardContent className="p-4 flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[240px]">
            <div className="text-xs text-muted-foreground mb-1">Adicionar empresa ao cap-table</div>
            <Select value={picked} onValueChange={setPicked}>
              <SelectTrigger>
                <SelectValue placeholder={eligibleListings.length ? "Selecione um anúncio" : "Sem anúncios disponíveis"} />
              </SelectTrigger>
              <SelectContent>
                {eligibleListings.map((l) => (
                  <SelectItem key={l.id} value={l.id}>{l.title} {l.cnpj ? `· ${l.cnpj}` : ""}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleCreate} disabled={!picked || creating} className="bg-accent text-accent-foreground">
            <Plus className="w-4 h-4 mr-1" /> {creating ? "Criando…" : "Adicionar"}
          </Button>
          {eligibleListings.length === 0 && items.length === 0 && (
            <Button variant="outline" className="bg-transparent" onClick={() => navigate("/vender")}>
              Anunciar empresa
            </Button>
          )}
        </CardContent>
      </Card>

      {loading && <div className="text-sm text-muted-foreground">Carregando…</div>}

      <div className="space-y-4">
        {items.map((cap) => (
          <CaptableCard
            key={cap.id}
            cap={cap}
            onSync={syncRfb}
            onAddPartner={(id) => addPartner(id, { nome: "Novo sócio", pct: 0 })}
            onUpdatePartner={updatePartner}
            onDeletePartner={deletePartner}
            onUpdate={updateCaptable}
            onRemove={remove}
          />
        ))}
      </div>
    </div>
  );
}
