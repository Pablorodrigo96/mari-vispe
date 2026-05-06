import { Loader2 } from "lucide-react";
import { formatNum, formatCnpj } from "@/lib/anatelInsights";

export interface CompanyShareRow {
  empresa: string;
  cnpj: string;
  acessos: number | string;
  share_pct: number | string;
  rank?: number;
}

export function CompanyShareTable({
  rows,
  loading,
  onCompanyClick,
}: {
  rows: CompanyShareRow[];
  loading?: boolean;
  onCompanyClick: (c: { empresa: string; cnpj: string }) => void;
}) {
  return (
    <div className="overflow-auto max-h-[60vh]">
      <table className="w-full text-xs">
        <thead className="bg-zinc-900 sticky top-0">
          <tr className="text-left text-zinc-400">
            <th className="px-3 py-2 w-10">#</th>
            <th className="px-3 py-2">Empresa</th>
            <th className="px-3 py-2">CNPJ</th>
            <th className="px-3 py-2 text-right">Acessos</th>
            <th className="px-3 py-2 text-right w-[200px]">Share</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const share = Number(r.share_pct ?? 0);
            const cnpjClean = String(r.cnpj ?? "").replace(/\D/g, "");
            const clickable = cnpjClean.length === 14;
            return (
              <tr key={i} className="border-t border-zinc-800 hover:bg-zinc-800/40">
                <td className="px-3 py-2 text-zinc-500 tabular-nums">{r.rank ?? i + 1}</td>
                <td className="px-3 py-2 break-words max-w-[360px]">
                  {clickable ? (
                    <button
                      onClick={() => onCompanyClick({ empresa: r.empresa, cnpj: cnpjClean })}
                      className="text-left text-zinc-100 hover:text-emerald-400 hover:underline underline-offset-2 cursor-pointer"
                    >
                      {r.empresa || "—"}
                    </button>
                  ) : (
                    <span className="text-zinc-300">{r.empresa || "—"}</span>
                  )}
                </td>
                <td className="px-3 py-2 font-mono text-zinc-400">{cnpjClean ? formatCnpj(cnpjClean) : "—"}</td>
                <td className="px-3 py-2 text-right tabular-nums text-zinc-200">{formatNum(Number(r.acessos))}</td>
                <td className="px-3 py-2 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="w-24 h-1.5 bg-zinc-800 rounded overflow-hidden">
                      <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, share)}%` }} />
                    </div>
                    <span className="tabular-nums text-emerald-300 w-14 text-right">{share.toFixed(2)}%</span>
                  </div>
                </td>
              </tr>
            );
          })}
          {!rows.length && !loading && (
            <tr><td colSpan={5} className="px-3 py-6 text-center text-zinc-500">Nenhum resultado para o filtro atual.</td></tr>
          )}
          {loading && (
            <tr><td colSpan={5} className="px-3 py-6 text-center text-zinc-500"><Loader2 className="inline h-4 w-4 animate-spin mr-2" />Carregando…</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
