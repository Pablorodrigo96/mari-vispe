import { Card } from "@/components/ui/card";
import { formatNum } from "@/lib/anatelInsights";
import { MapPin } from "lucide-react";

interface FootprintRow {
  cidade: string;
  estado: string;
  acessos_empresa: number | string;
  total_municipio: number | string;
  n_provedores: number | string;
  rank_municipio: number | string;
  share_pct: number | string;
}

export function CompanyFootprintTable({ rows, loading }: { rows: FootprintRow[]; loading?: boolean }) {
  return (
    <Card className="p-0 bg-zinc-900/60 border-zinc-800 overflow-hidden">
      <div className="text-xs text-zinc-400 px-4 py-2 border-b border-zinc-800 flex items-center gap-2">
        <MapPin className="h-3.5 w-3.5 text-emerald-400" />
        Cidades onde a empresa atua — acessos próprios e share local
      </div>
      <div className="overflow-auto max-h-[60vh]">
        <table className="w-full text-xs">
          <thead className="bg-zinc-900 sticky top-0">
            <tr className="text-left text-zinc-400">
              <th className="px-3 py-2">Cidade</th>
              <th className="px-3 py-2">UF</th>
              <th className="px-3 py-2 text-right">Acessos da empresa</th>
              <th className="px-3 py-2 text-right">Total município</th>
              <th className="px-3 py-2 text-right">Share</th>
              <th className="px-3 py-2 text-right">Rank</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const share = Number(r.share_pct ?? 0);
              const rank = Number(r.rank_municipio ?? 0);
              return (
                <tr key={i} className="border-t border-zinc-800 hover:bg-zinc-800/40">
                  <td className="px-3 py-2 text-zinc-200">{r.cidade ?? "—"}</td>
                  <td className="px-3 py-2 text-zinc-400">{r.estado ?? "—"}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-emerald-300">{formatNum(Number(r.acessos_empresa))}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-zinc-400">{formatNum(Number(r.total_municipio))}</td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 h-1.5 bg-zinc-800 rounded overflow-hidden">
                        <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, share)}%` }} />
                      </div>
                      <span className="tabular-nums text-emerald-300 w-12 text-right">{share.toFixed(1)}%</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    <span className={rank === 1 ? "text-emerald-300 font-semibold" : "text-zinc-400"}>
                      #{rank}
                    </span>
                  </td>
                </tr>
              );
            })}
            {!rows.length && !loading && (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-zinc-500">Nenhum município encontrado para esta empresa</td></tr>
            )}
            {loading && (
              <tr><td colSpan={6} className="px-3 py-6 text-center text-zinc-500">Carregando…</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
