import { useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  getTemplatesForScope,
  applyTemplate,
  type NoteTemplate,
  type NoteTemplateScope,
  type TemplateContext,
} from "@/lib/eb/noteTemplates";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

interface Props {
  scope: NoteTemplateScope;
  context?: TemplateContext;
  onInsert: (markdown: string) => void;
  className?: string;
  /** Real entity for AI auto-generate; falls back to scope if omitted. */
  entityType?: "mandate" | "buyer_ma" | "company" | "match" | "listing" | "daily";
  entityId?: string;
}

export function TemplatePicker({ scope, context, onInsert, className, entityType, entityId }: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const qc = useQueryClient();
  const templates = getTemplatesForScope(scope);
  if (templates.length === 0) return null;

  const effectiveType = entityType ?? scope;

  async function runAutoGenerate(tpl: NoteTemplate) {
    if (!tpl.autoGenerate || !entityId) return;
    if (!tpl.autoGenerate.accepts.includes(effectiveType as any)) {
      toast({ title: "Não disponível", description: "Esta geração não se aplica a este tipo de entidade.", variant: "destructive" });
      return;
    }
    setBusy(tpl.id);
    try {
      // Map entity → expected payload key
      const payload: Record<string, any> = {};
      if (effectiveType === "company" || effectiveType === "listing") payload.cnpj = entityId;
      else if (effectiveType === "buyer_ma") payload.buyer_id = entityId;
      else if (effectiveType === "mandate") payload.mandate_id = entityId;
      else if (effectiveType === "match") payload.match_id = entityId;

      const { error } = await supabase.functions.invoke(tpl.autoGenerate.fn, { body: payload });
      if (error) throw error;
      toast({ title: "Mari processou", description: "A nota foi gerada automaticamente." });
      // Refresh notes lists
      qc.invalidateQueries({ queryKey: ["eb-entity-notes"] });
      qc.invalidateQueries({ queryKey: ["eb-entity-backlinks"] });
    } catch (e: any) {
      toast({ title: "Falha ao gerar com Mari", description: e?.message ?? "erro", variant: "destructive" });
    } finally {
      setBusy(null);
      setOpen(false);
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={`h-7 text-[11px] text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 gap-1.5 ${className ?? ""}`}
        >
          <FileText className="h-3 w-3" />
          Template
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-0 bg-zinc-900 border-zinc-800 text-zinc-100"
        align="end"
      >
        <Command className="bg-transparent">
          <CommandInput placeholder="Buscar template…" className="h-9 text-xs" />
          <CommandList>
            <CommandEmpty className="text-xs text-zinc-500 py-4 text-center">
              Nenhum template
            </CommandEmpty>
            <CommandGroup>
              {templates.map((tpl) => {
                const Icon = tpl.icon;
                const isAuto = !!tpl.autoGenerate;
                const disabled = isAuto && (!entityId || !tpl.autoGenerate!.accepts.includes(effectiveType as any));
                return (
                  <CommandItem
                    key={tpl.id}
                    value={`${tpl.label} ${tpl.description}`}
                    disabled={disabled}
                    onSelect={() => {
                      if (isAuto) runAutoGenerate(tpl);
                      else {
                        onInsert(applyTemplate(tpl, context));
                        setOpen(false);
                      }
                    }}
                    className="gap-2 cursor-pointer aria-selected:bg-zinc-800 data-[disabled]:opacity-40"
                  >
                    {busy === tpl.id ? (
                      <Loader2 className="h-3.5 w-3.5 text-[#D9F564] shrink-0 animate-spin" />
                    ) : (
                      <Icon className={`h-3.5 w-3.5 shrink-0 ${isAuto ? "text-[#D9F564]" : "text-zinc-400"}`} />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium text-zinc-100 truncate flex items-center gap-1.5">
                        {tpl.label}
                        {isAuto && (
                          <span className="text-[9px] uppercase tracking-wider text-[#D9F564]/80 border border-[#D9F564]/30 rounded px-1 py-0">
                            IA
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-zinc-500 truncate">
                        {tpl.description}
                      </div>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
