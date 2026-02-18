import { useState } from 'react';
import { Search, Building2, MapPin, Briefcase, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface CompanyData {
  cnpj: string;
  razao_social: string;
  nome_fantasia: string | null;
  cnae_principal: string;
  cidade: string;
  estado: string;
  porte: string;
  capital_social: number | null;
}

export function CompanySearchCard() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [company, setCompany] = useState<CompanyData | null>(null);
  const [opportunities, setOpportunities] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  const formatCnpj = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 14);
    if (digits.length <= 2) return digits;
    if (digits.length <= 5) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
    if (digits.length <= 8) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5)}`;
    if (digits.length <= 12) return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8)}`;
    return `${digits.slice(0, 2)}.${digits.slice(2, 5)}.${digits.slice(5, 8)}/${digits.slice(8, 12)}-${digits.slice(12)}`;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // If starts with digit, apply CNPJ mask
    if (/^\d/.test(value.replace(/[.\-\/]/g, ''))) {
      setQuery(formatCnpj(value));
    } else {
      setQuery(value);
    }
  };

  const handleSearch = async () => {
    if (query.trim().length < 3) return;

    setLoading(true);
    setScanning(true);
    setError(null);
    setCompany(null);

    try {
      // Simulate scanning animation
      await new Promise((r) => setTimeout(r, 1500));

      const { data, error: fnError } = await supabase.functions.invoke('company-lookup', {
        body: { query: query.trim() },
      });

      setScanning(false);

      if (fnError) throw fnError;

      if (data.error) {
        setError(data.error);
        return;
      }

      setCompany(data.company);
      setOpportunities(data.opportunities || 0);
    } catch (err: any) {
      setScanning(false);
      setError(err.message || 'Erro ao buscar empresa.');
    } finally {
      setLoading(false);
    }
  };

  const handleViewOpportunities = () => {
    if (!user) {
      navigate('/auth?redirect=/matching/resultados&cnpj=' + encodeURIComponent(company?.cnpj || ''));
    } else {
      navigate('/matching/resultados', { state: { company } });
    }
  };

  return (
    <section className="py-12">
      <div className="container mx-auto px-4">
        <Card className="max-w-2xl mx-auto border-border/50 shadow-lg">
          <CardContent className="p-6 md:p-8">
            {/* Search input */}
            <div className="flex gap-3 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder="Digite o CNPJ ou nome da empresa..."
                  value={query}
                  onChange={handleInputChange}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-10 h-12 text-base"
                />
              </div>
              <Button
                onClick={handleSearch}
                disabled={loading || query.trim().length < 3}
                className="h-12 px-6 bg-accent hover:bg-accent/90 text-accent-foreground"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Buscar'}
              </Button>
            </div>

            {/* Scanning animation */}
            <AnimatePresence>
              {scanning && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="flex flex-col items-center gap-3 py-8"
                >
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full border-4 border-accent/20 border-t-accent animate-spin" />
                    <Building2 className="absolute inset-0 m-auto w-6 h-6 text-accent" />
                  </div>
                  <p className="text-sm text-muted-foreground animate-pulse">
                    Escaneando base de dados...
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Error */}
            {error && !scanning && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-4 rounded-lg bg-destructive/10 text-destructive text-sm text-center"
              >
                {error}
              </motion.div>
            )}

            {/* Company result */}
            <AnimatePresence>
              {company && !scanning && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="space-y-4"
                >
                  <div className="p-4 rounded-lg bg-muted/50 border border-border/50 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-foreground text-lg">
                          {company.nome_fantasia || company.razao_social}
                        </h3>
                        <p className="text-sm text-muted-foreground">{company.razao_social}</p>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {company.porte || 'N/A'}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="w-4 h-4" />
                        {company.cidade}/{company.estado}
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Briefcase className="w-4 h-4" />
                        CNAE: {company.cnae_principal}
                      </div>
                    </div>
                  </div>

                  {/* Opportunities badge */}
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.3, type: 'spring' }}
                    className="flex flex-col items-center gap-4 py-4"
                  >
                    <div className="flex items-center gap-2 px-6 py-3 rounded-full bg-accent/10 border border-accent/20">
                      <Sparkles className="w-5 h-5 text-accent" />
                      <span className="text-lg font-bold text-accent">
                        {opportunities} oportunidades encontradas!
                      </span>
                    </div>

                    <Button
                      size="lg"
                      onClick={handleViewOpportunities}
                      className="bg-accent hover:bg-accent/90 text-accent-foreground shadow-gold"
                    >
                      {user ? 'Ver oportunidades' : 'Cadastre-se para ver as oportunidades'}
                    </Button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
