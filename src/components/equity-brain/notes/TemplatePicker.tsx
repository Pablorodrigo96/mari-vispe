import { useState } from "react";
import { FileText } from "lucide-react";
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
  type NoteTemplateScope,
  type TemplateContext,
} from "@/lib/eb/noteTemplates";

interface Props {
  scope: NoteTemplateScope;
  context?: TemplateContext;
  onInsert: (markdown: string) => void;
  className?: string;
}

export function TemplatePicker({ scope, context, onInsert, className }: Props) {
  const [open, setOpen] = useState(false);
  const templates = getTemplatesForScope(scope);
  if (templates.length === 0) return null;

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
        className="w-72 p-0 bg-zinc-900 border-zinc-800 text-zinc-100"
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
                return (
                  <CommandItem
                    key={tpl.id}
                    value={`${tpl.label} ${tpl.description}`}
                    onSelect={() => {
                      onInsert(applyTemplate(tpl, context));
                      setOpen(false);
                    }}
                    className="gap-2 cursor-pointer aria-selected:bg-zinc-800"
                  >
                    <Icon className="h-3.5 w-3.5 text-[#D9F564] shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium text-zinc-100 truncate">
                        {tpl.label}
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
