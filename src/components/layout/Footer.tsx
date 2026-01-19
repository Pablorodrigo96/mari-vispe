import { Link } from 'react-router-dom';
import { Building2, Linkedin, Instagram, Youtube, Mail } from 'lucide-react';
import { openCookiePreferences } from '@/hooks/useCookieConsent';

const footerLinks = {
  marketplace: [
    { name: 'Comprar Empresa', href: '/marketplace' },
    { name: 'Vender Empresa', href: '/sell' },
    { name: 'Valuation', href: '/valuation' },
    { name: 'Para Investidores', href: '/investors' },
  ],
  resources: [
    { name: 'Blog', href: 'https://vispe.com.br/educacao/', external: true },
    { name: 'Guia de M&A', href: 'https://vispe.com.br/ma-fusoes-e-aquisicoes/', external: true },
    { name: 'Calculadora de Valuation', href: '/valuation' },
  ] as Array<{ name: string; href: string; external?: boolean }>,
  company: [
    { name: 'Sobre Nós', href: 'https://vispe.com.br/sobre/', external: true },
    { name: 'Contato', href: 'https://vispe.com.br/contato/', external: true },
  ] as Array<{ name: string; href: string; external?: boolean }>,
  legal: [
    { name: 'Termos de Uso', href: '/terms' },
  ],
};

export function Footer() {
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="container mx-auto px-4 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-4 lg:col-span-1">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent">
                <Building2 className="h-5 w-5 text-accent-foreground" />
              </div>
              <span className="text-xl font-bold">
                Deal<span className="text-accent">Flow</span>
              </span>
            </Link>
            <p className="text-sm text-primary-foreground/70 mb-6">
              A plataforma líder em negociação de empresas no Brasil. Conectamos compradores e vendedores com segurança e transparência.
            </p>
            <div className="flex gap-3">
              <a href="#" className="p-2 rounded-lg bg-primary-foreground/10 hover:bg-primary-foreground/20 transition-colors">
                <Linkedin className="h-5 w-5" />
              </a>
              <a 
                href="https://www.instagram.com/vispecapital" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-primary-foreground/10 hover:bg-primary-foreground/20 transition-colors"
              >
                <Instagram className="h-5 w-5" />
              </a>
              <a
                href="https://www.youtube.com/@vispecapital"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-primary-foreground/10 hover:bg-primary-foreground/20 transition-colors"
              >
                <Youtube className="h-5 w-5" />
              </a>
              <a href="#" className="p-2 rounded-lg bg-primary-foreground/10 hover:bg-primary-foreground/20 transition-colors">
                <Mail className="h-5 w-5" />
              </a>
            </div>
          </div>

          {/* Marketplace */}
          <div>
            <h3 className="font-semibold mb-4">Marketplace</h3>
            <ul className="space-y-3">
              {footerLinks.marketplace.map((link) => (
                <li key={link.name}>
                  <Link to={link.href} className="text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="font-semibold mb-4">Recursos</h3>
            <ul className="space-y-3">
              {footerLinks.resources.map((link) => (
                <li key={link.name}>
                  {link.external ? (
                    <a 
                      href={link.href} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors"
                    >
                      {link.name}
                    </a>
                  ) : (
                    <Link to={link.href} className="text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors">
                      {link.name}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="font-semibold mb-4">Empresa</h3>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.name}>
                  {link.external ? (
                    <a 
                      href={link.href} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors"
                    >
                      {link.name}
                    </a>
                  ) : (
                    <Link to={link.href} className="text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors">
                      {link.name}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="font-semibold mb-4">Legal</h3>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.name}>
                  <Link to={link.href} className="text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors">
                    {link.name}
                  </Link>
                </li>
              ))}
              <li>
                <button
                  onClick={openCookiePreferences}
                  className="text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors text-left"
                >
                  Configurações de Cookies
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-12 pt-8 border-t border-primary-foreground/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-primary-foreground/50">
            © 2024 DealFlow. Todos os direitos reservados.
          </p>
          <p className="text-sm text-primary-foreground/50">
            Feito com ❤️ no Brasil
          </p>
        </div>
      </div>
    </footer>
  );
}
