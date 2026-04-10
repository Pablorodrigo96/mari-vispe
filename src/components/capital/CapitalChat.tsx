import { Button } from '@/components/ui/button';
import { MessageCircle } from 'lucide-react';
import { openWhatsApp } from '@/lib/whatsapp';
import { formatFullCurrency } from '@/lib/formatters';
import { toast } from '@/hooks/use-toast';

interface Props {
  requestId: string;
  companyName: string;
  amount: number;
  capitalType: string;
  objective: string;
}

const capitalTypeLabels: Record<string, string> = { divida: 'Dívida', equity: 'Equity' };
const objectiveLabels: Record<string, string> = {
  giro: 'Capital de Giro', expansao: 'Expansão', refinanciamento: 'Refinanciamento', socio: 'Busca de Sócio',
};

export function CapitalChat({ requestId, companyName, amount, capitalType, objective }: Props) {
  const handleWhatsApp = async () => {
    const msg = `Olá! Sou da empresa ${companyName}, tenho uma proposta de captação de ${formatFullCurrency(amount)} (${capitalTypeLabels[capitalType] || capitalType} - ${objectiveLabels[objective] || objective}). ID: ${requestId}. Gostaria de falar com um analista.`;
    const opened = await openWhatsApp(msg);
    if (!opened) {
      toast({ title: 'Link copiado!', description: 'O link do WhatsApp foi copiado. Cole no navegador para abrir.' });
    }
  };

  return (
    <div className="space-y-4 text-center">
      <h3 className="font-semibold text-foreground text-lg">Fale com um Analista</h3>
      <p className="text-sm text-muted-foreground">
        Tire suas dúvidas, envie informações adicionais ou negocie diretamente com nosso time de especialistas.
      </p>
      <Button onClick={handleWhatsApp} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" size="lg">
        <MessageCircle className="h-5 w-5 mr-2" />
        Conversar via WhatsApp
      </Button>
      <p className="text-xs text-muted-foreground">Atendimento de segunda a sexta, das 9h às 18h</p>
    </div>
  );
}
