import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, ArrowRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ARQUETIPOS_LABEL, VEREDITO_LABEL, brl } from "@/lib/equity-planner/constants";

export default function MyEquityPlanners() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("equity_assessments")
        .select("id, ipe_composto, arquetipo_id, veredito_liquidez, status, created_at, summary, company_id, equity_companies(razao_social, setor_livre), equity_valuations(valor_atual, valor_alvo)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setItems(data || []);
      setLoading(false);
    })();
  }, [user]);

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold">Meus Equity Planners</h1>
            <p className="text-muted-foreground">Diagnósticos, valuations e planos de equity da sua empresa.</p>
          </div>
          <Button className="bg-volt text-carbon hover:bg-volt/90" onClick={() => navigate("/equity-planner/novo")}>
            <Plus className="h-4 w-4 mr-1" /> Novo diagnóstico
          </Button>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-volt" /></div>
        ) : items.length === 0 ? (
          <Card className="!bg-slate-900/60 backdrop-blur-md border-volt/10 p-10 text-center">
            <p className="text-muted-foreground mb-4">Você ainda não tem nenhum diagnóstico.</p>
            <Link to="/equity-planner/novo"><Button className="bg-volt text-carbon">Começar agora</Button></Link>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {items.map((a) => {
              const v = VEREDITO_LABEL[a.veredito_liquidez || "vendavel_em_meses"];
              const val = a.equity_valuations?.[0];
              return (
                <Card key={a.id} className="!bg-slate-900/60 backdrop-blur-md border-volt/10 p-5 hover:border-volt/40 transition cursor-pointer"
                  onClick={() => navigate(`/equity-planner/${a.id}`)}>
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <h3 className="font-semibold break-words">{a.equity_companies?.razao_social || "Empresa sem nome"}</h3>
                    <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </div>
                  <p className="text-xs text-muted-foreground break-words">{a.equity_companies?.setor_livre}</p>
                  <div className="flex gap-2 mt-3 flex-wrap">
                    {a.arquetipo_id && <Badge variant="outline" className="border-volt/30">{ARQUETIPOS_LABEL[a.arquetipo_id]}</Badge>}
                    {v && <Badge variant="outline" className={v.tone === "good" ? "border-emerald-500/40 text-emerald-400" : v.tone === "warn" ? "border-amber-500/40 text-amber-400" : "border-rose-500/40 text-rose-400"}>{v.label}</Badge>}
                  </div>
                  <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-volt/10">
                    <div><p className="text-[10px] uppercase text-muted-foreground">IPE</p><p className="text-volt font-bold">{a.ipe_composto ?? "—"}</p></div>
                    <div><p className="text-[10px] uppercase text-muted-foreground">Atual</p><p className="font-medium text-sm">{brl(val?.valor_atual)}</p></div>
                    <div><p className="text-[10px] uppercase text-muted-foreground">Potencial</p><p className="font-medium text-sm text-volt">{brl(val?.valor_alvo)}</p></div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
