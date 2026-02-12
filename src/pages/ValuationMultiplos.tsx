import { useNavigate } from 'react-router-dom';
import { ValuationWizard } from '@/components/valuation/ValuationWizard';

const ValuationMultiplos = () => {
  const navigate = useNavigate();
  return <ValuationWizard onBack={() => navigate('/valuation')} />;
};

export default ValuationMultiplos;
