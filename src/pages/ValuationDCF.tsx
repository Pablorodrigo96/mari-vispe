import { useNavigate } from 'react-router-dom';
import { DCFWizard } from '@/components/valuation/DCFWizard';

const ValuationDCF = () => {
  const navigate = useNavigate();
  return <DCFWizard onBack={() => navigate('/valuation')} />;
};

export default ValuationDCF;
