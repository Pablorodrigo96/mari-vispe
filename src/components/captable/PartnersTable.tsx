import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2, Plus, Database, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { brl } from "@/lib/painelExecutive";
import type { Partner } from "@/hooks/useCaptables";
import { useState } from "react";

interface Props {
  partners: Partner[];
  valuation: number;
  onAdd: () => void;
  onUpdate: (id: string, patch: Partial<Partner>) => void;
  onDelete: (id: string) => void;
}

export function PartnersTable({ partners, valuation, onAdd, onUpdate, onDelete }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const total = partners.reduce((a, p) => a + Number(p.pct || 0), 0);
  const off = Math.abs(total - 100) > 0.01;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Sócios</div>
        <div className="flex items-center gap-2">
          <Badge variant={off ? "outline" : "secondary"} className={off ? "border-amber-500 text-amber-500" : ""}>
            Σ {total.toFixed(2)}%
          </Badge>
          <Button size="sm" variant="outline" className="bg-transparent" onClick={onAdd}>
            <Plus className="w-3 h-3 mr-1" /> Sócio
          </Button>
        </div>
      </div>

      <div className="rounded border border-border/50 divide-y divide-border/40">
        {partners.length === 0 && (
          <div className="p-4 text-sm text-muted-foreground text-center">
            Nenhum sócio. Use "Atualizar RFB" ou adicione manualmente.
          </div>
        )}
        {partners.map((p) => {
          const value = (Number(p.pct) / 100) * valuation;
          const editing = editingId === p.id;
          return (
            <div key={p.id} className="p-2 grid grid-cols-[1fr_90px_80px_110px_auto] gap-2 items-center text-sm">
              {editing ? (
                <Input value={p.nome} onChange={(e) => onUpdate(p.id, { nome: e.target.value })} className="h-8" />
              ) : (
                <div className="truncate break-words" title={p.nome}>
                  {p.nome}
                  {p.qualificacao && <span className="ml-1 text-xs text-muted-foreground">· {p.qualificacao}</span>}
                </div>
              )}
              <div className="text-xs text-muted-foreground truncate">{p.documento || "—"}</div>
              <Badge variant="outline" className="text-[10px] justify-self-start">
                {p.source === "rfb" ? <><Database className="w-3 h-3 mr-1" />RFB</> : "Manual"}
              </Badge>
              <Input
                type="number" step="0.01" min={0} max={100}
                value={p.pct}
                onChange={(e) => onUpdate(p.id, { pct: Number(e.target.value) })}
                className="h-8 text-right"
              />
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground tabular-nums w-20 text-right">{brl(value)}</span>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingId(editing ? null : p.id)}>
                  <Pencil className="w-3 h-3" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => onDelete(p.id)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
