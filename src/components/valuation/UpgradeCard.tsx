import { ArrowRight, TrendingUp, Calculator, FileText, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface UpgradeCardProps {
  onUpgrade: () => void;
}

export const UpgradeCard = ({ onUpgrade }: UpgradeCardProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleClick = () => {
    if (!user) {
      navigate('/auth');
    } else {
      onUpgrade();
    }
  };

  return (
    <div className="bg-gradient-to-br from-[#0F172A] to-[#1E293B] rounded-2xl p-6 text-white">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center">
          <Zap className="w-5 h-5 text-accent" />
        </div>
        <div>
          <h3 className="font-semibold text-lg">Quer uma avaliação mais precisa?</h3>
          <p className="text-white/70 text-sm">Experimente o Valuation DCF Profissional</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        {[
          { icon: TrendingUp, text: 'Projeção 3 anos' },
          { icon: Calculator, text: 'WACC ajustado' },
          { icon: FileText, text: 'Laudo completo' },
          { icon: Zap, text: 'Valor terminal' },
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-2 text-sm text-white/80">
            <item.icon className="w-4 h-4 text-accent" />
            {item.text}
          </div>
        ))}
      </div>

      <Button
        onClick={handleClick}
        className="w-full bg-accent hover:bg-accent/90 text-accent-foreground shadow-gold"
      >
        {user ? 'Fazer Valuation DCF' : 'Entrar para fazer DCF'}
        <ArrowRight className="w-4 h-4 ml-2" />
      </Button>

      <p className="text-xs text-white/50 text-center mt-3">
        Disponível nos planos Standard e Premium
      </p>
    </div>
  );
};
