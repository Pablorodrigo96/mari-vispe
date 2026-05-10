import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Briefcase, Users, Building2 } from "lucide-react";
import type { MentionType } from "@/lib/eb/mentionParser";

interface Suggestion {
  type: MentionType;
  ref: string;
  label: string;
  sublabel?: string | null;
}

interface Props {
  query: string;
  onPick: (s: Suggestion) => void;
  onClose: () => void;
}

const TYPE_META: Record<MentionType, { Icon: any; color: string; name: string }> = {
  mandate: { Icon: Briefcase, color: "text-emerald-300", name: "Mandato" },
  buyer: { Icon: Users, color: "text-violet-300", name: "Buyer" },
  company: { Icon: Building2, color: "text-amber-300", name: "Empresa" },
};

export function MentionAutocomplete({ query, onPick, onClose }: Props) {
  const enabled = query.length >= 2;
  const [active, setActive] = useState(0);

  const { data: items = [] } = useQuery<Suggestion[]>({
    queryKey: ["eb-mention-autocomplete", query],
    enabled,
    staleTime: 30_000,
    queryFn: async () => {
      const q = `%${query}%`;
      const eb = (supabase as any).schema("equity_brain");
      const [mandates, buyers, companies] = await Promise.all([
        eb
          .from("mandates")
          .select("id, company_cnpj, setor, regiao")
          .or(`company_cnpj.ilike.${q},setor.ilike.${q},regiao.ilike.${q}`)
          .limit(3),
        eb
          .from("buyers")
          .select("id, nome, cnpj")
          .or(`nome.ilike.${q},cnpj.ilike.${q}`)
          .limit(3),
        eb
          .from("companies")
          .select("cnpj, razao_social, codename, nome_fantasia")
          .or(`razao_social.ilike.${q},codename.ilike.${q},nome_fantasia.ilike.${q},cnpj.ilike.${q}`)
          .limit(3),
      ]);

      const out: Suggestion[] = [];
      for (const m of mandates?.data ?? []) {
        out.push({
          type: "mandate",
          ref: m.id,
          label: m.company_cnpj ?? m.id.slice(0, 8),
          sublabel: [m.setor, m.regiao].filter(Boolean).join(" · ") || null,
        });
      }
      for (const b of buyers?.data ?? []) {
        out.push({
          type: "buyer",
          ref: b.id,
          label: b.nome ?? b.cnpj ?? b.id.slice(0, 8),
          sublabel: b.cnpj ?? null,
        });
      }
      for (const c of companies?.data ?? []) {
        out.push({
          type: "company",
          ref: c.cnpj,
          label: c.razao_social ?? c.nome_fantasia ?? c.codename ?? c.cnpj,
          sublabel: c.codename ?? c.cnpj,
        });
      }
      return out.slice(0, 9);
    },
  });

  useEffect(() => {
    setActive(0);
  }, [query, items.length]);

  // Keyboard navigation
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!items.length) {
        if (e.key === "Escape") onClose();
        return;
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((a) => (a + 1) % items.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((a) => (a - 1 + items.length) % items.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        onPick(items[active]);
      } else if (e.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [items, active, onPick, onClose]);

  if (!enabled) return null;

  return (
    <div className="absolute z-50 mt-1 w-80 max-w-[95vw] bg-zinc-950 border border-zinc-700 rounded shadow-xl overflow-hidden">
      <div className="px-2 py-1 text-[10px] uppercase tracking-wider text-zinc-500 border-b border-zinc-800">
        Mencionar entidade
      </div>
      {items.length === 0 && (
        <div className="px-3 py-2 text-xs text-zinc-500 italic">Nada encontrado para "{query}"</div>
      )}
      <ul>
        {items.map((s, idx) => {
          const meta = TYPE_META[s.type];
          return (
            <li
              key={`${s.type}-${s.ref}`}
              onMouseDown={(e) => {
                e.preventDefault();
                onPick(s);
              }}
              className={`px-2 py-1.5 cursor-pointer text-xs flex items-center gap-2 ${
                idx === active ? "bg-zinc-800" : "hover:bg-zinc-900"
              }`}
            >
              <meta.Icon className={`h-3.5 w-3.5 shrink-0 ${meta.color}`} />
              <div className="min-w-0 flex-1">
                <div className="text-zinc-100 truncate">{s.label}</div>
                {s.sublabel && (
                  <div className="text-[10px] text-zinc-500 truncate">{s.sublabel}</div>
                )}
              </div>
              <span className={`text-[9px] uppercase ${meta.color}`}>{meta.name}</span>
            </li>
          );
        })}
      </ul>
      <div className="px-2 py-1 text-[10px] text-zinc-600 border-t border-zinc-800">
        ↑↓ navega · Enter insere · Esc fecha
      </div>
    </div>
  );
}

// Helper hook to manage @-trigger state on a textarea
export function useMentionTrigger(value: string, caret: number) {
  return useMemo(() => {
    const upto = value.slice(0, caret);
    const match = upto.match(/(?:^|\s)@([\p{L}\p{N}_-]{1,40})$/u);
    if (!match) return null;
    return { query: match[1], start: caret - match[1].length - 1 };
  }, [value, caret]);
}
