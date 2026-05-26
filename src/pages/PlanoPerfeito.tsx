import { PlanoPerfeitoWizard } from '@/components/valuation/plano-perfeito/PlanoPerfeitoWizard';
import { Seo } from '@/components/seo/Seo';

const PlanoPerfeito = () => {
  return (
    <>
      <Seo
        title="O Plano Perfeito — Construa a ponte da sua empresa até o bilhão"
        description="Descubra quanto investir por mês para sua empresa atingir sua meta de valuation. Simulação gratuita em 3 minutos."
        path="/valuation/plano-perfeito"
      />
      <PlanoPerfeitoWizard />
    </>
  );
};

export default PlanoPerfeito;
