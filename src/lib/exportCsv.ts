/**
 * Util compacto para gerar e baixar arquivos CSV no browser
 * sem dependências externas. Trata escape de aspas, vírgulas e quebras de linha.
 */

export type CsvRow = Record<string, unknown>;

function cell(v: unknown): string {
  if (v === null || v === undefined) return "";
  let s: string;
  if (Array.isArray(v)) s = v.join("|");
  else if (typeof v === "object") s = JSON.stringify(v);
  else s = String(v);
  if (/[",\n;]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function rowsToCsv(rows: CsvRow[], headers?: string[]): string {
  if (!rows.length) {
    return (headers ?? []).join(",") + "\n";
  }
  const cols = headers ?? Object.keys(rows[0]);
  const lines = [cols.join(",")];
  for (const r of rows) {
    lines.push(cols.map((c) => cell(r[c])).join(","));
  }
  return lines.join("\n");
}

export function downloadCsv(filename: string, csv: string): void {
  // BOM para Excel reconhecer UTF-8
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
