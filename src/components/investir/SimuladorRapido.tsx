import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Calculator } from "lucide-react";

const fmtBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(n || 0);

// Projeção ilustrativa: taxa anual média de 14% (cenário base de oferta privada).
// NÃO é promessa de retorno — sempre exibir disclaimer.
export function SimuladorRapido() {
  const [valor, setValor] = useState(1000);
  const [anos, setAnos] = useState(5);

  const projecao = useMemo(() => {
    const taxa = 0.14;
    return valor * Math.pow(1 + taxa, anos);
  }, [valor, anos]);

  const ganho = projecao - valor;

  return (
    <div className="bg-carbon border border-volt/30 rounded-3xl p-6 md:p-10 shadow-[0_30px_80px_-30px_rgba(217,245,100,0.25)]">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-volt/15 grid place-items-center">
          <Calculator className="w-5 h-5 text-volt" />
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-wider text-volt">Simulador rápido</div>
          <div className="text-bone font-semibold">Veja quanto seu dinheiro pode crescer</div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <div>
          <label className="text-xs text-bone/60 mb-2 block">Quanto quero investir?</label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-bone/40 text-sm">R$</span>
            <input
              type="number"
              min={100}
              step={100}
              value={valor}
              onChange={(e) => setValor(Math.max(100, Number(e.target.value)))}
              className="w-full bg-[#0f0f0f] border border-bone/15 rounded-xl pl-10 pr-4 py-4 text-bone text-xl font-semibold tabular-nums focus:border-volt outline-none"
            />
          </div>
          <div className="flex gap-2 mt-3 flex-wrap">
            {[500, 1000, 5000, 10000].map((v) => (
              <button
                key={v}
                onClick={() => setValor(v)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  valor === v ? "border-volt bg-volt/15 text-volt" : "border-bone/15 text-bone/60 hover:border-bone/30"
                }`}
              >
                {fmtBRL(v)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs text-bone/60 mb-2 block">Por quanto tempo? <span className="text-volt font-semibold">{anos} {anos === 1 ? "ano" : "anos"}</span></label>
          <input
            type="range"
            min={1}
            max={10}
            value={anos}
            onChange={(e) => setAnos(Number(e.target.value))}
            className="w-full accent-volt"
          />
          <div className="flex justify-between text-[10px] text-bone/40 mt-1">
            <span>1</span><span>3</span><span>5</span><span>7</span><span>10</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 bg-volt/5 border border-volt/20 rounded-2xl p-5">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-bone/50 mb-1">Estimativa em {anos} {anos === 1 ? "ano" : "anos"}</div>
          <div className="text-2xl md:text-3xl font-semibold text-volt tabular-nums">{fmtBRL(projecao)}</div>
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-wider text-bone/50 mb-1">Possível ganho</div>
          <div className="text-2xl md:text-3xl font-semibold text-bone tabular-nums">+{fmtBRL(ganho)}</div>
        </div>
      </div>

      <Link
        to="/investir/auth?mode=signup"
        className="mt-6 w-full bg-volt hover:bg-volt/90 text-carbon font-semibold py-4 rounded-full inline-flex items-center justify-center gap-2 transition-colors"
      >
        Quero começar agora <ArrowRight className="w-4 h-4" />
      </Link>

      <p className="mt-4 text-[10px] text-bone/40 leading-relaxed text-center">
        * Projeção meramente ilustrativa com base em uma taxa de referência de 14% a.a. Não representa promessa de
        rentabilidade. Investimentos em empresas privadas envolvem risco de perda total.
      </p>
    </div>
  );
}
