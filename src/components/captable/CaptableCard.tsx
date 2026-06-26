import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RefreshCw, Trash2, Sparkles } from "lucide-react";
import type { Captable } from "@/hooks/useCaptables";
import { CaptablePie } from "./CaptablePie";
import { PartnersTable } from "./PartnersTable";
import { brl } from "@/lib/painelExecutive";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface Props {
  cap: Captable;
  onSync: (id: string) => void;
  onAddPartner: (id: string) => void;
  onUpdatePartner: (pid: string, patch: any) => void;
  onDeletePartner: (pid: string) => void;
  onUpdate: (id: string, patch: Partial<Captable>) => void;
  onRemove: (id: string) => void;
}

export function CaptableCard({ cap, onSync, onAddPartner, onUpdatePartner, onDeletePartner, onUpdate, onRemove }: Props) {
  const valuation = Number(cap.valuation_amount) || 0;
  const partners = cap.partners ?? [];
  const sourceLabel: Record<string, string> = {
    valuation_history: "Valuation salvo",
    listing_calc: "Cálculo automático",
    manual: "Manual",
  };

  return (
    <Card className="!bg-slate-900/60 backdrop-blur-md border-border/50">
      <CardContent className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <div className="text-xs uppercase tracking-widest text-accent">{cap.cnpj || "Sem CNPJ"}</div>
            <h3 className="text-lg font-semibold text-foreground break-words">
              {cap.razao_social || cap.listing?.title || "Empresa"}
            </h3>
            {cap.nome_fantasia && <div className="text-sm text-muted-foreground">{cap.nome_fantasia}</div>}
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="bg-transparent" onClick={() => onSync(cap.id)} disabled={!cap.cnpj}>
              <RefreshCw className="w-3 h-3 mr-1" /> Atualizar RFB
            </Button>
            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => { if (confirm("Remover cap-table?")) onRemove(cap.id); }}>
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded border border-border/40 p-3">
                <div className="text-xs text-muted-foreground">Valuation</div>
                <div className="text-xl font-semibold text-foreground">{brl(valuation)}</div>
                <Badge variant="outline" className="text-[10px] mt-1">{sourceLabel[cap.valuation_source || "listing_calc"]}</Badge>
              </div>
              <div className="rounded border border-border/40 p-3">
                <Label className="text-xs text-muted-foreground">Disponível para mari.invest (%)</Label>
                <Input
                  type="number" min={0} max={100} step="0.5"
                  value={cap.available_for_sale_pct}
                  onChange={(e) => onUpdate(cap.id, { available_for_sale_pct: Number(e.target.value) })}
                  className="h-8 mt-1"
                />
                <div className="text-xs text-muted-foreground mt-1">≈ {brl((Number(cap.available_for_sale_pct) / 100) * valuation)}</div>
              </div>
            </div>

            <PartnersTable
              partners={partners}
              valuation={valuation}
              onAdd={() => onAddPartner(cap.id)}
              onUpdate={onUpdatePartner}
              onDelete={onDeletePartner}
            />

            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-block">
                  <Button size="sm" disabled className="bg-accent/30 text-accent">
                    <Sparkles className="w-3 h-3 mr-1" /> Disponibilizar no mari.invest
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>Em breve — preparado para tokenização parcial</TooltipContent>
            </Tooltip>
          </div>

          <div>
            <CaptablePie partners={partners} valuation={valuation} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
