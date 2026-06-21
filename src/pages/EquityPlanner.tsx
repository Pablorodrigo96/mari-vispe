import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Activity, Target, TrendingUp, Users, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const PILARES = [
  { icon: Activity, title: "Raio-X de Equity", desc: "12 dimensões de prontidão pontuadas para gerar seu Índice de Prontidão (IPE)." },
  { icon: Target, title: "Valuation + Value Bridge", desc: "Valor hoje × valor potencial, parcela a parcela, ligado às iniciativas que pagam cada degrau." },
  { icon: TrendingUp, title: "Plano em Equity Sprints", desc: "Roadmap trimestral priorizado: o que faz a empresa subir de múltiplo, em ordem." },
  { icon: Users, title: "Mapa de Compradores", desc: "Quem paga mais por este ativo, por qual tese, e qual prêmio é negociável." },
  { icon: RefreshCw, title: "Loop de Re-medição", desc: "Re-mede IPE e valor a cada execução. O dono vê o equity crescer ao vivo." },
];

export default function EquityPlanner() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [count, setCount] = useState<number>(0);

  useEffect(() => {
    if (!user) return;
    supabase.from("equity_assessments")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .then(({ count }) => setCount(count || 0));
  }, [user]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/60 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <Badge className="bg-volt/10 text-volt border-volt/30 mb-4">Equity Planner · MVP</Badge>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight break-words">
            Transforme a empresa em <span className="text-volt">ativo vendável</span>
          </h1>
          <p className="text-muted-foreground mt-4 max-w-2xl mx-auto break-words">
            Diagnóstico de prontidão para venda, valuation com Value Bridge e plano de 12 meses para subir múltiplo —
            no mesmo padrão de rigor dos mandatos sell-side da Vispe.
          </p>
          <div className="flex gap-3 justify-center mt-8 flex-wrap">
            <Button size="lg" className="bg-volt text-carbon hover:bg-volt/90" onClick={() => navigate("/equity-planner/novo")}>
              Começar diagnóstico <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            {count > 0 && (
              <Button size="lg" variant="outline" className="bg-transparent" onClick={() => navigate("/meus-equity-planners")}>
                Ver meus planos ({count})
              </Button>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-4 mt-12">
          {PILARES.map((p) => (
            <Card key={p.title} className="!bg-slate-900/60 backdrop-blur-md border-volt/10 p-5">
              <p.icon className="h-6 w-6 text-volt mb-3" />
              <h3 className="font-semibold mb-1 break-words">{p.title}</h3>
              <p className="text-sm text-muted-foreground break-words">{p.desc}</p>
            </Card>
          ))}
        </div>

        <Card className="!bg-slate-900/60 backdrop-blur-md border-volt/20 p-6 mt-12">
          <h2 className="text-2xl font-bold mb-3">A equação de valor</h2>
          <p className="text-muted-foreground mb-4 break-words">
            VALOR = LUCRO NORMALIZADO × MÚLTIPLO &nbsp;·&nbsp; o múltiplo é determinado pelo seu IPE dentro da faixa do seu arquétipo de negócio.
            Subir o IPE → subir o múltiplo → subir o valor. É um ciclo fechado, e o Equity Planner mostra o caminho.
          </p>
          <Link to="/equity-planner/novo" className="text-volt underline">Começar agora →</Link>
        </Card>
      </div>
    </div>
  );
}
