const LABELS: Record<string, string> = {
  estabilidade_ebitda: "Estabilidade EBITDA",
  concentracao_cliente: "Concentração de cliente",
  recorrencia: "Recorrência de receita",
  dependencia_fundador: "Dependência do fundador",
  passivos: "Passivos / situação cadastral",
  documentacao: "Documentação",
  governanca: "Governança",
  sistemas: "Sistemas / porte",
  societario: "Estrutura societária",
};

export function TopFragilidades({ breakdown }: { breakdown: any }) {
  const subscores = breakdown?.subscores ?? {};
  const items = Object.entries(subscores)
    .map(([k, v]) => ({ key: k, label: LABELS[k] ?? k, value: Number(v ?? 0) }))
    .sort((a, b) => a.value - b.value)
    .slice(0, 3);
  if (items.length === 0) return null;
  return (
    <div className="space-y-1.5">
      {items.map((it) => (
        <div key={it.key} className="flex items-center justify-between gap-2 text-xs">
          <span className="text-zinc-400">{it.label}</span>
          <span className={`tabular-nums font-mono ${it.value < 40 ? "text-rose-300" : it.value < 60 ? "text-amber-300" : "text-zinc-300"}`}>
            {Math.round(it.value)}/100
          </span>
        </div>
      ))}
    </div>
  );
}
