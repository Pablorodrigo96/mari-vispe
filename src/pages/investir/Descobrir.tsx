import { InvestirShell } from "@/components/investir/InvestirShell";
import { HUMAN_CATEGORIES } from "@/types/social";
import { Link, useSearchParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { sectorToCover, makeFeedSeed } from "@/data/socialSeed";
import { FollowButton } from "@/components/investir/social/FollowButton";

export default function Descobrir() {
  const [params, setParams] = useSearchParams();
  const cat = params.get("cat") || "todas";
  const [companies, setCompanies] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("tokens")
        .select("id,symbol,name,sector:risk_level,listing_id")
        .in("status", ["primary_open", "approved", "issued"]);
      const seedFeed = makeFeedSeed();
      const mix = [
        ...(data || []).map((t: any) => ({
          symbol: t.symbol, name: t.name, sector: t.sector,
          cover: sectorToCover(t.sector), founder: "Equipe fundadora",
        })),
        ...seedFeed.map((p) => ({
          symbol: p.company.symbol, name: p.company.name, sector: p.company.sector,
          cover: p.company.cover, founder: p.company.founder,
        })),
      ];
      setCompanies(mix);
    })();
  }, []);

  return (
    <InvestirShell hideFooter>
      <div className="max-w-[1200px] mx-auto px-5 md:px-6 pt-6 md:pt-10 pb-12">
        <h1 className="text-2xl md:text-4xl font-semibold text-bone">Descobrir empresas</h1>
        <p className="text-bone/55 text-sm mt-2">Navegue por setor, acompanhe quem te interessa, invista quando quiser.</p>

        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-5 md:-mx-6 px-5 md:px-6 my-6">
          <button
            onClick={() => setParams({})}
            className={`shrink-0 px-3 py-1.5 rounded-full text-[12px] font-medium ${cat === "todas" ? "bg-volt text-carbon" : "bg-bone/10 text-bone/75"}`}
          >
            Todas
          </button>
          {HUMAN_CATEGORIES.map((c) => (
            <button
              key={c.id}
              onClick={() => setParams({ cat: c.id })}
              className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium ${cat === c.id ? "bg-volt text-carbon" : "bg-bone/10 text-bone/75"}`}
            >
              <span>{c.emoji}</span>{c.label}
            </button>
          ))}
        </div>

        <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {companies.map((c) => (
            <li key={c.symbol} className="rounded-2xl overflow-hidden border border-bone/10 bg-graphite/30 hover:border-volt/40 transition-colors">
              <Link to={`/investir/empresa/${c.symbol}`} className="block">
                <div className="aspect-[16/10] overflow-hidden bg-carbon">
                  <img src={c.cover} alt={c.name} className="w-full h-full object-cover" />
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[10px] uppercase tracking-wider text-volt">{c.sector || "Negócio"}</div>
                      <div className="text-bone font-semibold text-sm mt-0.5 truncate">{c.name}</div>
                      <div className="text-bone/45 text-[11px] mt-0.5 truncate">{c.founder}</div>
                    </div>
                    <FollowButton symbol={c.symbol} compact />
                  </div>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </InvestirShell>
  );
}
