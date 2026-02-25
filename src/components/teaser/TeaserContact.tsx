import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MessageCircle, Shield, UserPlus, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface TeaserContactProps {
  listingId: string;
  ticker: string;
}

const TeaserContact = ({ listingId, ticker }: TeaserContactProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isRegistering, setIsRegistering] = useState(false);
  const [registered, setRegistered] = useState(false);

  const handleRegisterInterest = async () => {
    if (!user) {
      navigate(`/auth?redirect=/teaser/${ticker}&tab=signup&interest=true`);
      return;
    }

    setIsRegistering(true);
    try {
      // Check if already registered
      const { data: existing } = await supabase
        .from('interest_logs' as any)
        .select('id')
        .eq('listing_id', listingId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        toast.info('Você já registrou interesse neste ativo.');
        setRegistered(true);
        return;
      }

      const { error } = await supabase
        .from('interest_logs' as any)
        .insert({
          listing_id: listingId,
          user_id: user.id,
          ticker,
        });

      if (error) throw error;
      setRegistered(true);
      toast.success('Interesse registrado com sucesso!');
    } catch (error) {
      console.error('Error registering interest:', error);
      toast.error('Erro ao registrar interesse. Tente novamente.');
    } finally {
      setIsRegistering(false);
    }
  };

  const whatsappMessage = `Olá! Tenho interesse no ativo ${ticker} divulgado na PME.B3. Gostaria de mais informações.`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`;

  return (
    <section className="relative py-20 px-4 sm:px-8 bg-gray-950 overflow-hidden">
      {/* Gold decorative arc */}
      <div className="absolute right-0 top-0 bottom-0 w-[400px] pointer-events-none">
        <svg viewBox="0 0 400 800" className="h-full w-full" preserveAspectRatio="xMaxYMid slice">
          <path
            d="M 50 0 Q 400 200, 300 400 Q 200 600, 50 800"
            fill="none"
            stroke="hsl(38, 92%, 50%)"
            strokeWidth="2"
            opacity="0.4"
          />
        </svg>
      </div>

      <div className="relative z-10 max-w-2xl mx-auto">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-3xl sm:text-4xl md:text-5xl font-black text-white text-center mb-4 uppercase tracking-wider"
        >
          Interesse
        </motion.h2>
        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-white/50 text-center mb-12"
        >
          Demonstre seu interesse neste ativo de forma confidencial
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="glass-card rounded-2xl p-8 sm:p-10 text-center space-y-6"
        >
          {registered ? (
            <div className="space-y-4">
              <CheckCircle className="w-16 h-16 text-green-400 mx-auto" />
              <h3 className="text-2xl font-bold text-white">Interesse Registrado!</h3>
              <p className="text-white/60">
                Seu interesse foi registrado com sucesso. Entraremos em contato em breve.
              </p>
            </div>
          ) : (
            <>
              <p className="text-white/70 text-lg">
                Cadastre-se como comprador para receber informações detalhadas sobre este ativo.
              </p>
              <Button
                onClick={handleRegisterInterest}
                disabled={isRegistering}
                className="w-full sm:w-auto px-12 py-6 text-lg font-bold gradient-gold text-gray-900 hover:opacity-90 border-0 rounded-xl"
              >
                <UserPlus className="w-5 h-5 mr-2" />
                {isRegistering ? 'Registrando...' : 'Registrar Interesse'}
              </Button>
            </>
          )}

          <div className="pt-4">
            <Button
              type="button"
              variant="outline"
              className="border-green-500/50 text-green-400 hover:bg-green-500/10 hover:text-green-300"
              onClick={() => window.open(whatsappUrl, '_blank')}
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              WhatsApp
            </Button>
          </div>
        </motion.div>

        {/* Disclaimer */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="mt-10 text-center"
        >
          <div className="flex items-center justify-center gap-2 mb-3">
            <Shield className="w-4 h-4 text-amber-500/60" />
            <span className="text-xs text-white/40 uppercase tracking-wider font-semibold">Confidencialidade</span>
          </div>
          <p className="text-xs text-white/30 max-w-lg mx-auto leading-relaxed">
            Este teaser foi elaborado pela PME.B3, é de extrema confidencialidade e não poderá ser compartilhado 
            por outras fontes. A veracidade e a acurácia das informações aqui demonstradas são de responsabilidade 
            exclusiva do fornecedor.
          </p>
          <p className="text-sm font-semibold text-white/50 mt-6 tracking-widest">PME.B3</p>
        </motion.div>
      </div>
    </section>
  );
};

export default TeaserContact;
