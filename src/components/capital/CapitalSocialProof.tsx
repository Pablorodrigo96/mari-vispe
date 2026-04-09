import { Shield, Users, TrendingUp } from 'lucide-react';
import gtnet from '@/assets/partners/gtnet.png';
import iplay from '@/assets/partners/iplay.png';
import vvs from '@/assets/partners/vvs.png';
import teamti from '@/assets/partners/teamti.png';
import jrnet from '@/assets/partners/jrnet.png';
import intercol from '@/assets/partners/intercol.png';
import wp from '@/assets/partners/wp.png';
import gold from '@/assets/partners/gold.png';
import infoway from '@/assets/partners/infoway.png';
import fix from '@/assets/partners/fix.png';

const partners = [
  { name: 'GTNet', logo: gtnet },
  { name: 'iPlay', logo: iplay },
  { name: 'VVS', logo: vvs },
  { name: 'Team TI', logo: teamti },
  { name: 'JR Net', logo: jrnet },
  { name: 'Intercol', logo: intercol },
  { name: 'WP Telecom', logo: wp },
  { name: 'Gold', logo: gold },
  { name: 'Infoway', logo: infoway },
  { name: 'Fix', logo: fix },
];

const cases = [
  { name: 'ISP Regional SP', amount: 'R$ 1,2 milhão', term: '36 meses', type: 'Crédito Garantido' },
  { name: 'Telecom Interior MG', amount: 'R$ 480 mil', term: '24 meses', type: 'Capital de Giro' },
  { name: 'Provedor de Internet SC', amount: 'R$ 2,5 milhões', term: 'Equity', type: 'Investidor Estratégico' },
];

export function CapitalSocialProof() {
  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4 lg:px-8">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <div className="text-center">
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mx-auto mb-3">
              <TrendingUp className="w-6 h-6 text-accent" />
            </div>
            <p className="text-3xl font-black text-foreground">R$ 18M+</p>
            <p className="text-sm text-muted-foreground">em captações realizadas</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mx-auto mb-3">
              <Users className="w-6 h-6 text-accent" />
            </div>
            <p className="text-3xl font-black text-foreground">120+</p>
            <p className="text-sm text-muted-foreground">empresas atendidas</p>
          </div>
          <div className="text-center">
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mx-auto mb-3">
              <Shield className="w-6 h-6 text-accent" />
            </div>
            <p className="text-3xl font-black text-foreground">98%</p>
            <p className="text-sm text-muted-foreground">de satisfação dos clientes</p>
          </div>
        </div>

        {/* Cases */}
        <h3 className="text-2xl font-bold text-foreground text-center mb-8">Cases de sucesso</h3>
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {cases.map((c, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-6 hover:border-accent/30 transition-all">
              <p className="text-sm text-muted-foreground">{c.name}</p>
              <p className="text-2xl font-bold text-accent mt-1">{c.amount}</p>
              <div className="flex gap-2 mt-3">
                <span className="text-xs bg-accent/10 text-accent px-2 py-1 rounded-full">{c.term}</span>
                <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full">{c.type}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Partner logos */}
        <div className="text-center mb-8">
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Parceiros conectados à plataforma</p>
        </div>
        <div className="flex flex-wrap justify-center items-center gap-6 lg:gap-8 mb-8">
          {partners.map((p, i) => (
            <div key={i} className="w-20 h-12 flex items-center justify-center grayscale hover:grayscale-0 opacity-70 hover:opacity-100 transition-all">
              <img src={p.logo} alt={p.name} className="max-h-10 max-w-full object-contain" />
            </div>
          ))}
        </div>

        {/* LGPD */}
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Shield className="w-4 h-4" />
          <span>Seus dados estão protegidos de acordo com a LGPD (Lei nº 13.709/2018)</span>
        </div>
      </div>
    </section>
  );
}
