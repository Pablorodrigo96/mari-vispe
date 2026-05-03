import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Pencil, Check, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type FieldType = "text" | "number" | "email" | "url" | "textarea" | "select" | "multiselect";

interface Option { value: string; label: string }

interface Props {
  label: string;
  value: any;
  onSave: (newValue: any) => Promise<void>;
  type?: FieldType;
  options?: Option[];
  placeholder?: string;
  format?: (v: any) => string;
}

function defaultFormat(v: any, type: FieldType): string {
  if (v == null || v === "") return "";
  if (Array.isArray(v)) return v.join(", ");
  return String(v);
}

export function EditableField({ label, value, onSave, type = "text", options, placeholder, format }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<any>(value ?? (type === "multiselect" ? [] : ""));
  const [saving, setSaving] = useState(false);

  function start() {
    setDraft(value ?? (type === "multiselect" ? [] : ""));
    setEditing(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      let final: any = draft;
      if (type === "number") final = draft === "" || draft == null ? null : Number(draft);
      if (type === "multiselect" && typeof draft === "string") {
        final = draft.split(",").map((s) => s.trim()).filter(Boolean);
      }
      await onSave(final);
      toast.success("Salvo");
      setEditing(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Erro ao salvar");
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    const display = format ? format(value) : defaultFormat(value, type);
    return (
      <div className="group flex items-start justify-between gap-2 py-2 border-b border-zinc-800">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</div>
          <div className="text-sm text-zinc-100 mt-0.5 break-words">
            {display || <span className="italic text-zinc-600">não preenchido</span>}
          </div>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6 opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-emerald-300 shrink-0"
          onClick={start}
          aria-label={`Editar ${label}`}
        >
          <Pencil className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  const draftStr = type === "multiselect" && Array.isArray(draft) ? draft.join(", ") : draft ?? "";

  return (
    <div className="py-2 border-b border-zinc-800">
      <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">{label}</div>
      {type === "textarea" ? (
        <Textarea
          value={draftStr}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={placeholder}
          className="bg-zinc-900 border-zinc-700 text-zinc-100 text-sm min-h-[80px]"
          autoFocus
        />
      ) : type === "select" ? (
        <select
          value={draftStr}
          onChange={(e) => setDraft(e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-700 rounded px-2 py-1.5 text-sm text-zinc-100"
          autoFocus
        >
          <option value="">—</option>
          {options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      ) : type === "multiselect" ? (
        <Input
          value={draftStr}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={placeholder ?? "Separe por vírgula"}
          className="bg-zinc-900 border-zinc-700 text-zinc-100 text-sm"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") setEditing(false);
          }}
        />
      ) : (
        <Input
          type={type}
          value={draftStr}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={placeholder}
          className="bg-zinc-900 border-zinc-700 text-zinc-100 text-sm"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") setEditing(false);
          }}
        />
      )}
      <div className="flex gap-1 mt-2">
        <Button size="sm" onClick={handleSave} disabled={saving}
                className="h-7 bg-emerald-600 hover:bg-emerald-500 text-zinc-950">
          {saving ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Check className="h-3 w-3 mr-1" />}
          Salvar
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setEditing(false)}
                className="h-7 text-zinc-400 hover:text-zinc-100">
          <X className="h-3 w-3 mr-1" /> Cancelar
        </Button>
      </div>
    </div>
  );
}
