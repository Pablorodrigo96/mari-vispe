import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X, Loader2, Building2 } from "lucide-react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { formatNum, formatCnpj } from "@/lib/anatelInsights";

const UFS = ["AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT","PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO"];

export interface AnatelFilters {
  empresaQuery: string;
  cnpj: string;
  uf: string;
  cidade: string;
  selectedCnpj?: string | null;
  selectedEmpresa?: string | null;
}

function maskCnpj(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

export function AnatelFilterBar({
  table,
  onSearch,
  onClear,
  loading,
}: {
  table: string | null;
  onSearch: (f: AnatelFilters) => void;
  onClear: () => void;
  loading?: boolean;
}) {
  const [empresa, setEmpresa] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [uf, setUf] = useState("");
  const [cidade, setCidade] = useState("");
  const [suggestions, setSuggestions] = useState<{ empresa: string; cnpj: string; acessos: number }[]>([]);
  const [openSug, setOpenSug] = useState(false);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState<{ empresa: string; cnpj: string } | null>(null);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    if (!table || !empresa || empresa.length < 2 || picked) {
      setSuggestions([]);
      return;
    }
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(async () => {
      setSearching(true);
      try {
        const { data, error } = await supabase.functions.invoke("anatel-query", {
          body: { action: "search_companies", params: { table, q: empresa, limit: 8 } },
        });
        if (error) throw error;
        setSuggestions((data?.rows ?? []).map((r: any) => ({
          empresa: String(r.empresa ?? ""),
          cnpj: String(r.cnpj ?? "").replace(/\D/g, ""),
          acessos: Number(r.acessos ?? 0),
        })));
        setOpenSug(true);
      } catch {
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => { if (debounceRef.current) window.clearTimeout(debounceRef.current); };
  }, [empresa, table, picked]);

  function handlePick(s: { empresa: string; cnpj: string }) {
    setPicked(s);
    setEmpresa(s.empresa);
    setCnpj(maskCnpj(s.cnpj));
    setOpenSug(false);
  }

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    onSearch({
      empresaQuery: empresa,
      cnpj: cnpj.replace(/\D/g, ""),
      uf,
      cidade,
      selectedCnpj: picked?.cnpj ?? (cnpj.replace(/\D/g, "").length === 14 ? cnpj.replace(/\D/g, "") : null),
      selectedEmpresa: picked?.empresa ?? null,
    });
  }

  function clear() {
    setEmpresa(""); setCnpj(""); setUf(""); setCidade("");
    setPicked(null); setSuggestions([]); setOpenSug(false);
    onClear();
  }

  return (
    <form onSubmit={submit} className="rounded-md border border-zinc-800 bg-zinc-900/40 p-3">
      <div className="flex flex-wrap items-end gap-2">
        {/* Empresa */}
        <div className="relative flex-1 min-w-[220px]">
          <label className="text-[10px] uppercase tracking-wide text-zinc-500">Empresa</label>
          <div className="relative">
            <Building2 className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
            <Input
              value={empresa}
              onChange={(e) => { setEmpresa(e.target.value); setPicked(null); }}
              onFocus={() => suggestions.length && setOpenSug(true)}
              onBlur={() => setTimeout(() => setOpenSug(false), 150)}
              placeholder="Razão social ou fantasia"
              className="bg-zinc-950 border-zinc-800 text-zinc-100 h-9 pl-7 text-sm"
            />
            {searching && <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 animate-spin text-zinc-500" />}
          </div>
          {openSug && suggestions.length > 0 && (
            <div className="absolute z-30 left-0 right-0 mt-1 rounded-md border border-zinc-800 bg-zinc-950 shadow-xl max-h-72 overflow-auto">
              {suggestions.map((s, i) => (
                <button
                  type="button"
                  key={i}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handlePick(s)}
                  className="w-full text-left px-3 py-2 hover:bg-zinc-900 border-b border-zinc-900 last:border-0"
                >
                  <div className="text-xs text-zinc-100 truncate">{s.empresa}</div>
                  <div className="text-[10px] text-zinc-500 flex justify-between gap-2">
                    <span className="font-mono">{formatCnpj(s.cnpj)}</span>
                    <span className="text-emerald-400">{formatNum(s.acessos)} acessos</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* CNPJ */}
        <div className="min-w-[180px]">
          <label className="text-[10px] uppercase tracking-wide text-zinc-500">CNPJ</label>
          <Input
            value={cnpj}
            onChange={(e) => { setCnpj(maskCnpj(e.target.value)); setPicked(null); }}
            placeholder="00.000.000/0000-00"
            className="bg-zinc-950 border-zinc-800 text-zinc-100 h-9 text-sm font-mono"
          />
        </div>

        {/* UF */}
        <div className="w-[110px]">
          <label className="text-[10px] uppercase tracking-wide text-zinc-500">UF</label>
          <Select value={uf || "all"} onValueChange={(v) => setUf(v === "all" ? "" : v)}>
            <SelectTrigger className="bg-zinc-950 border-zinc-800 text-zinc-100 h-9 text-sm">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent className="bg-zinc-950 border-zinc-800 text-zinc-100">
              <SelectItem value="all">Todas</SelectItem>
              {UFS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Cidade */}
        <div className="min-w-[180px]">
          <label className="text-[10px] uppercase tracking-wide text-zinc-500">Cidade</label>
          <Input
            value={cidade}
            onChange={(e) => setCidade(e.target.value)}
            placeholder="Município"
            className="bg-zinc-950 border-zinc-800 text-zinc-100 h-9 text-sm"
          />
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2">
          <Button
            type="submit"
            disabled={!table || loading}
            className="h-9 bg-[#D9F564] text-[#0A0A0A] hover:bg-[#D9F564]/90 font-semibold"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><Search className="h-3.5 w-3.5 mr-1" /> Buscar</>}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={clear}
            className="h-9 bg-transparent border-zinc-800 text-zinc-300 hover:bg-zinc-900"
          >
            <X className="h-3.5 w-3.5 mr-1" /> Limpar
          </Button>
        </div>
      </div>
    </form>
  );
}
