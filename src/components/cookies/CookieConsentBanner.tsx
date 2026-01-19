import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Cookie } from 'lucide-react';
import { useCookieConsent } from '@/hooks/useCookieConsent';
import { CookiePreferencesModal } from './CookiePreferencesModal';

export function CookieConsentBanner() {
  const {
    preferences,
    showBanner,
    acceptAll,
    rejectAll,
    updatePreference,
    saveCurrentPreferences,
  } = useCookieConsent();
  
  const [showPreferences, setShowPreferences] = useState(false);

  const handleSavePreferences = () => {
    saveCurrentPreferences();
    setShowPreferences(false);
  };

  const handleAcceptAllFromModal = () => {
    acceptAll();
    setShowPreferences(false);
  };

  if (!showBanner && !showPreferences) {
    return null;
  }

  return (
    <>
      <AnimatePresence>
        {showBanner && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6"
          >
            <div className="max-w-4xl mx-auto bg-navy border border-gold/20 rounded-xl shadow-2xl p-6">
              <div className="flex items-start gap-4">
                <div className="hidden sm:flex p-3 bg-gold/10 rounded-lg">
                  <Cookie className="h-6 w-6 text-gold" />
                </div>
                
                <div className="flex-1 space-y-4">
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold text-white">
                      Sua privacidade é importante para nós
                    </h3>
                    <p className="text-sm text-gray-300 leading-relaxed">
                      A Vispe Capital utiliza cookies e outras tecnologias para melhorar sua experiência de navegação, analisar o desempenho do site e personalizar conteúdos de acordo com seu perfil de interesse (seja para valuation, compra ou venda de empresas). Ao clicar em "Aceitar Tudo", você concorda com o armazenamento de cookies no seu dispositivo. Você também pode gerenciar suas preferências em "Configurações". Para saber mais, acesse nossa{' '}
                      <Link 
                        to="/terms" 
                        className="text-gold hover:text-gold/80 underline underline-offset-2 transition-colors"
                      >
                        Política de Privacidade
                      </Link>.
                    </p>
                  </div>
                  
                  <div className="flex flex-wrap gap-3">
                    <Button
                      onClick={acceptAll}
                      className="bg-gold hover:bg-gold/90 text-navy font-medium"
                    >
                      Aceitar Tudo
                    </Button>
                    <Button
                      onClick={rejectAll}
                      variant="outline"
                      className="border-gray-500 text-white hover:bg-white/10 hover:text-white"
                    >
                      Recusar
                    </Button>
                    <Button
                      onClick={() => setShowPreferences(true)}
                      variant="ghost"
                      className="text-gold hover:text-gold/80 hover:bg-gold/10"
                    >
                      Configurações
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <CookiePreferencesModal
        open={showPreferences}
        onOpenChange={setShowPreferences}
        preferences={preferences}
        onUpdatePreference={updatePreference}
        onSave={handleSavePreferences}
        onAcceptAll={handleAcceptAllFromModal}
      />
    </>
  );
}
