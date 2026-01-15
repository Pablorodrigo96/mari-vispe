import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ValuationHeaderProps {
  onStartDiagnostic: () => void;
}

export const ValuationHeader = ({ onStartDiagnostic }: ValuationHeaderProps) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setIsMobileMenuOpen(false);
  };

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        isScrolled
          ? 'bg-background/95 backdrop-blur-md shadow-soft'
          : 'bg-transparent'
      )}
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gold flex items-center justify-center">
              <span className="text-gold-foreground font-bold text-lg">D</span>
            </div>
            <span className="font-bold text-xl text-foreground">DealFlow</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <button
              onClick={() => scrollToSection('metodologia')}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Metodologia
            </button>
            <button
              onClick={() => scrollToSection('depoimentos')}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Depoimentos
            </button>
            <Link
              to="/auth/login"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Entrar
            </Link>
            <Button
              onClick={onStartDiagnostic}
              className="bg-gold hover:bg-gold/90 text-gold-foreground"
            >
              Iniciar Diagnóstico
            </Button>
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2"
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6 text-foreground" />
            ) : (
              <Menu className="w-6 h-6 text-foreground" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-border bg-background">
            <nav className="flex flex-col gap-4">
              <button
                onClick={() => scrollToSection('metodologia')}
                className="text-left px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                Metodologia
              </button>
              <button
                onClick={() => scrollToSection('depoimentos')}
                className="text-left px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                Depoimentos
              </button>
              <Link
                to="/auth/login"
                className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                Entrar
              </Link>
              <div className="px-4">
                <Button
                  onClick={() => {
                    onStartDiagnostic();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full bg-gold hover:bg-gold/90 text-gold-foreground"
                >
                  Iniciar Diagnóstico
                </Button>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};
