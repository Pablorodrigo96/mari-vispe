/**
 * Guia visual do Grafo Jarvis — explica nodes, edges e padrões.
 * Rota: /equity-brain/grafo-jarvis/guia
 */

import { Link } from "react-router-dom";
import { ArrowLeft, Network } from "lucide-react";
import {
  EDGE_LAYERS,
  EDGE_COLORS,
  EDGE_LABELS,
  EDGE_DESCRIPTIONS,
  NODE_COLORS,
  NODE_LABELS,
  NODE_DESCRIPTIONS,
  type LayerKey,
} from "@/lib/equityGraphScoring";

const NODE_ORDER = ["seller", "buyer_strategic", "buyer_financial", "thesis", "platform"] as const;

const PRESETS: Array<{
  key: string;
  title: string;
  question: string;
  recipe: string;
  layers: LayerKey[];
  minWeight: number;
}> = [
  {
    key: "rollup",
    title: "Originar um roll-up",
    question: "Quais empresas valem mais juntas que separadas?",
    recipe: "Ative apenas as camadas Possível Fusão e Sinergia Operacional. Procure clusters de bolinhas verdes interligadas.",
    layers: ["rollup", "operational"],
    minWeight: 0.5,
  },
  {
    key: "mandate",
    title: "Abordar para mandato (sell-side)",
    question: "Quais sellers já têm comprador na fila?",
    recipe: "Ative M&A Direto e Capital. Procure verdes com várias linhas azuis (buyers) saindo deles.",
    layers: ["ma_direct", "capital"],
    minWeight: 0.6,
  },
  {
    key: "premium",
    title: "Defender prêmio de valuation",
    question: "Onde existe arbitragem (preço baixo, qualidade alta)?",
    recipe: "Ative apenas Arbitragem de Valuation e Fit com Tese. Cada linha rosa indica gap de preço explorável.",
    layers: ["arbitrage", "thesis"],
    minWeight: 0.5,
  },
  {
    key: "consolidators",
    title: "Mapear consolidadores da minha vertical",
    question: "Quem são os players que estão comprando concorrentes?",
    recipe: "Ative Possível Fusão. Procure as bolinhas âmbar (consolidadores) — cada add-on que se conecta a elas é um candidato a deal.",
    layers: ["rollup"],
    minWeight: 0.4,
  },
];

function applyPresetUrl(p: typeof PRESETS[number]): string {
  // Por enquanto só direciona para o grafo; o usuário ajusta os filtros manualmente.
  // Futuro: passar via querystring e o GrafoJarvisPage hidratar os filtros.
  const params = new URLSearchParams({
    layers: p.layers.join(","),
    minWeight: String(p.minWeight),
    preset: p.key,
  });
  return `/equity-brain/grafo-jarvis?${params.toString()}`;
}

export default function GrafoJarvisGuiaPage() {
  return (
    <div className="min-h-[calc(100vh-1px)] bg-zinc-950 text-zinc-200">
      {/* Topbar */}
      <div className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur">
        <Link
          to="/equity-brain/grafo-jarvis"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-emerald-300 hover:bg-zinc-800 text-xs transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar ao Grafo
        </Link>
        <span className="text-[11px] font-semibold tracking-wider text-emerald-400 uppercase ml-2">
          Equity Brain · Guia do Grafo Jarvis
        </span>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-10 space-y-12">
        {/* Hero */}
        <section className="text-center space-y-3">
          <Network className="h-10 w-10 mx-auto text-emerald-400" />
          <h1 className="text-3xl md:text-4xl font-black text-zinc-50">Como ler o Grafo Jarvis</h1>
          <p className="text-zinc-400 max-w-2xl mx-auto text-sm leading-relaxed">
            O grafo é o cérebro estratégico da Vispe. Cada bolinha é uma entidade real (empresa, fundo, tese)
            e cada linha é uma oportunidade de M&A. Esta página explica o significado de cada elemento e
            mostra <b className="text-emerald-300">receitas práticas</b> para usar no dia a dia.
          </p>
        </section>

        {/* SEÇÃO 1: NODES */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
            <span className="text-emerald-400">1.</span> Tipos de Nodes (bolinhas)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {NODE_ORDER.map((k) => (
              <div key={k} className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 hover:border-emerald-700/50 transition-colors">
                <div className="flex items-center gap-2.5 mb-2">
                  <div
                    className="h-4 w-4 rounded-full ring-2 ring-zinc-900 shrink-0"
                    style={{ background: NODE_COLORS[k], boxShadow: `0 0 14px ${NODE_COLORS[k]}` }}
                  />
                  <h3 className="font-bold text-sm text-zinc-100">{NODE_LABELS[k]}</h3>
                </div>
                <p className="text-[12px] text-zinc-400 leading-relaxed">{NODE_DESCRIPTIONS[k]}</p>
              </div>
            ))}
          </div>
        </section>

        {/* SEÇÃO 2: EDGES */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
            <span className="text-emerald-400">2.</span> Tipos de Conexões (linhas)
          </h2>
          <p className="text-xs text-zinc-500">
            As conexões estão agrupadas em 7 camadas. Use o painel lateral do grafo para ligar/desligar cada camada.
          </p>
          <div className="space-y-3">
            {(Object.entries(EDGE_LAYERS) as [LayerKey, typeof EDGE_LAYERS[LayerKey]][]).map(([key, layer]) => (
              <div key={key} className="rounded-lg border border-zinc-800 bg-zinc-900/40 p-4">
                <div className="flex items-start gap-3 mb-3">
                  <div className="text-2xl">{layer.icon}</div>
                  <div className="flex-1">
                    <h3 className="font-bold text-sm text-zinc-100">{layer.label}</h3>
                    <p className="text-[12px] text-zinc-400 mt-1 leading-relaxed">{layer.description}</p>
                  </div>
                </div>
                <div className="ml-9 space-y-1.5 pt-2 border-t border-zinc-800/60">
                  {layer.types.map((t) => (
                    <div key={t} className="flex items-start gap-2.5 text-[11px]">
                      <div
                        className="h-0.5 w-6 rounded shrink-0 mt-1.5"
                        style={{ background: EDGE_COLORS[t], boxShadow: `0 0 4px ${EDGE_COLORS[t]}` }}
                      />
                      <div className="flex-1">
                        <span className="text-zinc-200 font-semibold">{EDGE_LABELS[t]}</span>
                        <span className="text-zinc-500"> — {EDGE_DESCRIPTIONS[t]}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* SEÇÃO 3: PADRÕES VISUAIS */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
            <span className="text-emerald-400">3.</span> Padrões visuais que importam
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <PatternCard
              title="Verde + Verde ligados"
              insight="Possível Fusão / Roll-up"
              text="Duas PMEs que ganham mais juntas que separadas. A tese mais valiosa do Brain — receita imediata via M&A."
              svg={<TwoGreens />}
            />
            <PatternCard
              title="Verde + Âmbar"
              insight="Add-on + Consolidador"
              text="A âmbar é o consolidador (já comprou outras). A verde é o add-on disponível. A âmbar provavelmente é a compradora."
              svg={<GreenAmber />}
            />
            <PatternCard
              title="Violeta no centro + verdes ao redor"
              insight="Tese atraindo targets"
              text="Uma tese de investimento ativa está captando múltiplas empresas-alvo. Quem tem essa tese está com fome — leve mandatos."
              svg={<ThesisHub />}
            />
          </div>
        </section>

        {/* SEÇÃO 4: RECEITAS DE USO */}
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
            <span className="text-emerald-400">4.</span> Receitas práticas
          </h2>
          <p className="text-xs text-zinc-500">
            Cada receita responde uma pergunta de negócio. Clique em um cartão para abrir o grafo já configurado.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {PRESETS.map((p) => (
              <Link
                key={p.key}
                to={applyPresetUrl(p)}
                className="block rounded-lg border border-zinc-800 bg-zinc-900/60 p-5 hover:border-emerald-600/60 hover:bg-zinc-900 transition-all group"
              >
                <div className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold mb-1">
                  Receita
                </div>
                <h3 className="font-bold text-base text-zinc-100 group-hover:text-emerald-300 mb-2">
                  {p.title}
                </h3>
                <p className="text-[12px] text-zinc-400 italic mb-3">"{p.question}"</p>
                <p className="text-[12px] text-zinc-300 leading-relaxed">{p.recipe}</p>
                <div className="mt-3 pt-3 border-t border-zinc-800/60 flex flex-wrap gap-1.5">
                  {p.layers.map((l) => (
                    <span key={l} className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                      {EDGE_LAYERS[l].icon} {EDGE_LAYERS[l].label}
                    </span>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        </section>

        <div className="text-center pt-6 border-t border-zinc-800">
          <Link
            to="/equity-brain/grafo-jarvis"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-emerald-600 hover:bg-emerald-500 text-zinc-950 font-bold text-sm transition-colors"
          >
            <Network className="h-4 w-4" /> Voltar ao Grafo Jarvis
          </Link>
        </div>
      </div>
    </div>
  );
}

function PatternCard({ title, insight, text, svg }: { title: string; insight: string; text: string; svg: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 space-y-3">
      <div className="h-24 flex items-center justify-center bg-zinc-950/60 rounded border border-zinc-800/60">
        {svg}
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-wider text-amber-400 font-bold">{insight}</div>
        <h3 className="font-bold text-sm text-zinc-100 mt-0.5">{title}</h3>
        <p className="text-[11px] text-zinc-400 leading-relaxed mt-1">{text}</p>
      </div>
    </div>
  );
}

// Mini-SVGs ilustrativos
function TwoGreens() {
  const c = NODE_COLORS.seller;
  return (
    <svg viewBox="0 0 120 60" className="w-full h-full">
      <line x1="30" y1="30" x2="90" y2="30" stroke="hsl(45, 100%, 55%)" strokeWidth="2.5" />
      <circle cx="30" cy="30" r="10" fill={c} style={{ filter: `drop-shadow(0 0 6px ${c})` }} />
      <circle cx="90" cy="30" r="10" fill={c} style={{ filter: `drop-shadow(0 0 6px ${c})` }} />
    </svg>
  );
}
function GreenAmber() {
  const g = NODE_COLORS.seller;
  const a = NODE_COLORS.platform;
  return (
    <svg viewBox="0 0 120 60" className="w-full h-full">
      <line x1="30" y1="30" x2="86" y2="30" stroke="hsl(220, 95%, 65%)" strokeWidth="2.5" markerEnd="url(#arr)" />
      <defs>
        <marker id="arr" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
          <path d="M0,0 L0,6 L6,3 z" fill="hsl(220, 95%, 65%)" />
        </marker>
      </defs>
      <circle cx="30" cy="30" r="8" fill={g} style={{ filter: `drop-shadow(0 0 6px ${g})` }} />
      <circle cx="92" cy="30" r="14" fill={a} style={{ filter: `drop-shadow(0 0 8px ${a})` }} />
    </svg>
  );
}
function ThesisHub() {
  const t = NODE_COLORS.thesis;
  const s = NODE_COLORS.seller;
  const sellers = [
    [20, 14], [100, 14], [10, 36], [110, 36], [30, 54], [90, 54],
  ];
  return (
    <svg viewBox="0 0 120 70" className="w-full h-full">
      {sellers.map(([x, y], i) => (
        <line key={i} x1="60" y1="34" x2={x} y2={y} stroke="hsl(170, 75%, 50%)" strokeWidth="1.5" opacity="0.7" />
      ))}
      {sellers.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="5" fill={s} style={{ filter: `drop-shadow(0 0 4px ${s})` }} />
      ))}
      <circle cx="60" cy="34" r="11" fill={t} style={{ filter: `drop-shadow(0 0 10px ${t})` }} />
    </svg>
  );
}
