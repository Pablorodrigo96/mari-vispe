import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, BarChart3, Calculator, Eye, Lock, FileText } from 'lucide-react';
import { ValuationReportDialog } from '@/components/valuation/ValuationReportDialog';
import { DCFReportDialog } from '@/components/valuation/DCFReportDialog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { ValuationResult } from '@/lib/valuationCalculator';
import type { DCFResult } from '@/lib/dcfCalculator';

interface ValuationHistoryItem {
  id: string;
  valuation_type: string;
  company_type: string | null;
  segment: string | null;
  inputs: unknown;
  result: unknown;
  created_at: string;
  status: string;
  locked_at: string | null;
}

const MyValuations = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [valuations, setValuations] = useState<ValuationHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMultiplesResult, setSelectedMultiplesResult] = useState<ValuationResult | null>(null);
  const [selectedDCFResult, setSelectedDCFResult] = useState<DCFResult | null>(null);
  const [showMultiplesReport, setShowMultiplesReport] = useState(false);
  const [showDCFReport, setShowDCFReport] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth?redirect=/meus-valuations');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    async function fetchValuations() {
      if (!user) return;

      const { data, error } = await supabase
        .from('valuation_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching valuations:', error);
      } else {
        setValuations(data || []);
      }
      setLoading(false);
    }

    if (user) {
      fetchValuations();
    }
  }, [user]);

  const handleViewReport = (valuation: ValuationHistoryItem) => {
    if (valuation.valuation_type === 'multiples') {
      setSelectedMultiplesResult(valuation.result as unknown as ValuationResult);
      setShowMultiplesReport(true);
    } else if (valuation.valuation_type === 'dcf') {
      setSelectedDCFResult(valuation.result as unknown as DCFResult);
      setShowDCFReport(true);
    }
  };

  const formatCurrency = (value: number | undefined) => {
    if (!value) return 'N/A';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 0,
    }).format(value);
  };

  const getValuationValue = (valuation: ValuationHistoryItem): number | undefined => {
    if (!valuation.result) return undefined;
    
    if (valuation.valuation_type === 'multiples') {
      const result = valuation.result as ValuationResult | null;
      return result?.mashupValue;
    } else if (valuation.valuation_type === 'dcf') {
      const result = valuation.result as DCFResult | null;
      return result?.enterpriseValue;
    }
    return undefined;
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-24 pb-12 container mx-auto px-4">
          <div className="flex items-center justify-center h-64">
            <div className="animate-pulse text-muted-foreground">Carregando...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-24 pb-12 container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => navigate('/valuation')}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar para Valuation
            </button>

            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
                  Meus Valuations
                </h1>
                <p className="text-muted-foreground">
                  Histórico de valuations realizados
                </p>
              </div>
              <Button onClick={() => navigate('/valuation')}>
                Novo Valuation
              </Button>
            </div>
          </div>

          {/* Valuations List */}
          {valuations.length === 0 ? (
            <div className="bg-card border border-border rounded-2xl p-12 text-center">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Nenhum valuation realizado
              </h3>
              <p className="text-muted-foreground mb-6">
                Faça seu primeiro valuation para ver o histórico aqui
              </p>
              <Button onClick={() => navigate('/valuation')}>
                Fazer Primeiro Valuation
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {valuations.map((valuation) => (
                <div
                  key={valuation.id}
                  className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        valuation.valuation_type === 'multiples' 
                          ? 'bg-emerald-500/10' 
                          : 'bg-accent/10'
                      }`}>
                        {valuation.valuation_type === 'multiples' ? (
                          <BarChart3 className="w-6 h-6 text-emerald-500" />
                        ) : (
                          <Calculator className="w-6 h-6 text-accent" />
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-foreground">
                            {(valuation.inputs as Record<string, string>)?.companyName || 'Empresa'}
                          </h3>
                          <Badge variant={valuation.valuation_type === 'multiples' ? 'secondary' : 'default'}>
                            {valuation.valuation_type === 'multiples' ? 'Múltiplos' : 'DCF'}
                          </Badge>
                          {valuation.locked_at && (
                            <Badge variant="outline" className="text-xs">
                              <Lock className="w-3 h-3 mr-1" />
                              Finalizado
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span>
                            {format(new Date(valuation.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                          </span>
                          {valuation.segment && (
                            <>
                              <span>•</span>
                              <span>{valuation.segment}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Valor estimado</p>
                        <p className="text-lg font-bold text-foreground">
                          {formatCurrency(getValuationValue(valuation))}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewReport(valuation)}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Ver Relatório
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Report Dialogs */}
      {selectedMultiplesResult && (
        <ValuationReportDialog
          open={showMultiplesReport}
          onClose={() => setShowMultiplesReport(false)}
          onBackToStart={() => setShowMultiplesReport(false)}
          result={selectedMultiplesResult}
        />
      )}

      {selectedDCFResult && (
        <DCFReportDialog
          open={showDCFReport}
          onClose={() => setShowDCFReport(false)}
          onBackToStart={() => setShowDCFReport(false)}
          result={selectedDCFResult}
        />
      )}
    </div>
  );
};

export default MyValuations;
