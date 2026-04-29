import { Link } from 'react-router-dom';
import { Linkedin, Instagram, Youtube } from 'lucide-react';
import vispeLogo from '@/assets/vispe-logo-branco.png';
import { MariLogo } from '@/components/brand/MariLogo';

const SpotifyIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
  </svg>
);
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
      <div className="h-px w-full bg-gradient-to-r from-transparent via-accent/40 to-transparent" />
      <div className="container mx-auto px-4 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 lg:gap-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-4 lg:col-span-1">
            <Link to="/" className="inline-flex mb-4 text-primary-foreground">
              <MariLogo size={36} />
            </Link>
            <p className="text-xs uppercase tracking-[0.3em] text-accent/80 mb-3">designed forward</p>
            <p className="text-sm text-primary-foreground/70 mb-6">
              A plataforma líder em negociação de empresas no Brasil. Conectamos compradores e vendedores com segurança e transparência.
            </p>
            <div className="flex gap-3">
              <a 
                href="https://www.linkedin.com/company/vispe-capital/posts/?feedView=all" 
                target="_blank" 
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-primary-foreground/10 hover:bg-primary-foreground/20 transition-colors"
              >
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
              <a
                href="https://open.spotify.com/show/09f6Lx4ckx7sltGudSAu92?si=bbcda61627714c43"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg bg-primary-foreground/10 hover:bg-primary-foreground/20 transition-colors"
              >
                <SpotifyIcon className="h-5 w-5" />
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

        {/* Vispe Badge */}
        <div className="mt-12 pt-8 border-t border-primary-foreground/10 flex flex-col items-center gap-3">
          <a href="https://vispe.com.br" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 opacity-70 hover:opacity-100 transition-opacity">
            <img src={vispeLogo} alt="Grupo Vispe" className="h-7" />
          </a>
          <p className="text-sm text-primary-foreground/50 text-center">
            mari é a camada de tecnologia e marketplace do Grupo Vispe.
          </p>
        </div>

        {/* Bottom */}
        <div className="mt-8 pt-6 border-t border-primary-foreground/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-primary-foreground/50">
            © 2025 mari. Todos os direitos reservados.
          </p>
          <p className="text-sm text-primary-foreground/50">
            Feito com ❤️ no Brasil
          </p>
        </div>
      </div>
    </footer>
  );
}
