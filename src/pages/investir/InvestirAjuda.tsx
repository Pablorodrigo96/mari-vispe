import { Link } from "react-router-dom";
import { InstitutionalPage } from "@/components/investir/InstitutionalPage";
import { SectionBand } from "@/components/investir/SectionBand";
import { Search, MessageCircle, Mail, Phone, BookOpen, FileText } from "lucide-react";

const topicos = [
  { t: "Como abrir minha conta", q: 12 },
  { t: "Verificação de identidade (KYC)", q: 8 },
  { t: "Como fazer um aporte", q: 14 },
  { t: "Acompanhar minha carteira", q: 9 },
  { t: "Resgate e liquidez", q: 7 },
  { t: "Tributação e Imposto de Renda", q: 11 },
];

const canais = [
  { icon: MessageCircle, t: "Chat na plataforma", d: "Seg–sex, 8h às 20h. Resposta em até 5 min." },
  { icon: Mail, t: "E-mail", d: "ajuda@mari.invest · resposta em 24h úteis" },
  { icon: Phone, t: "Telefone", d: "0800 591 0000 · seg–sex, 9h às 18h" },
];

export default function InvestirAjuda() {
  return (
    <InstitutionalPage
      kicker="Central de atendimento"
      title="Como podemos ajudar?"
      subtitle="Encontre respostas, fale com um especialista ou acesse nosso dicionário de finanças."
      crumbs={[{ label: "Central de atendimento" }]}
    >
      <SectionBand tone="bone">
        <div className="max-w-2xl mx-auto">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-carbon/40" />
            <input
              type="search"
              placeholder="O que você procura? Ex: como fazer Pix, KYC, IR..."
              className="w-full pl-12 pr-4 py-4 rounded-xl bg-white border border-carbon/10 text-carbon placeholder:text-carbon/40 focus:outline-none focus:border-carbon/40"
            />
          </div>
        </div>

        <h2 className="text-xl md:text-2xl font-semibold text-carbon mt-12 mb-6">Tópicos populares</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {topicos.map((t) => (
            <div
              key={t.t}
              className="p-5 rounded-xl bg-white border border-carbon/10 hover:border-carbon/30 transition-colors cursor-pointer"
            >
              <div className="font-medium text-carbon">{t.t}</div>
              <div className="text-xs text-carbon/50 mt-1">{t.q} artigos</div>
            </div>
          ))}
        </div>

        <div className="mt-12 grid md:grid-cols-2 gap-4">
          <Link
            to="/investir/ajuda/dicionario"
            className="p-6 rounded-2xl bg-carbon text-bone flex items-center gap-4 hover:bg-graphite transition-colors"
          >
            <BookOpen className="w-8 h-8 text-volt" />
            <div>
              <div className="font-semibold">Dicionário de finanças</div>
              <div className="text-sm text-bone/60">Termos do mercado em linguagem simples</div>
            </div>
          </Link>
          <Link
            to="/investir/atendimento"
            className="p-6 rounded-2xl bg-white border border-carbon/10 flex items-center gap-4 hover:border-carbon/30 transition-colors"
          >
            <FileText className="w-8 h-8 text-carbon" />
            <div>
              <div className="font-semibold text-carbon">Canais oficiais</div>
              <div className="text-sm text-carbon/60">CVM, RMP e Ouvidoria</div>
            </div>
          </Link>
        </div>
      </SectionBand>

      <SectionBand tone="carbon">
        <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">Fale com a gente</h2>
        <div className="mt-6 grid md:grid-cols-3 gap-4">
          {canais.map(({ icon: Icon, ...c }) => (
            <div key={c.t} className="p-5 rounded-xl border border-bone/10 bg-graphite/40">
              <Icon className="w-6 h-6 text-volt mb-3" />
              <div className="font-semibold text-bone">{c.t}</div>
              <div className="text-sm text-bone/60 mt-1">{c.d}</div>
            </div>
          ))}
        </div>
      </SectionBand>
    </InstitutionalPage>
  );
}
