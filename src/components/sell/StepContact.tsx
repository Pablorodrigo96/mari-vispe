import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';

interface StepContactProps {
  data: {
    fullName: string;
    email: string;
    phone: string;
    acceptTerms: boolean;
  };
  onChange: (field: string, value: string | boolean) => void;
}

const formatPhone = (value: string) => {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 2) return `(${numbers}`;
  if (numbers.length <= 7)
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
  if (numbers.length <= 11)
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
  return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
};

const StepContact = ({ data, onChange }: StepContactProps) => {
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    onChange('phone', formatted);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-foreground">
          Informações de Contato
        </h2>
        <p className="text-muted-foreground mt-2">
          Como os interessados podem entrar em contato com você
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="fullName">Nome Completo *</Label>
          <Input
            id="fullName"
            placeholder="Seu nome completo"
            value={data.fullName}
            onChange={(e) => onChange('fullName', e.target.value)}
            className="h-12"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">E-mail *</Label>
          <Input
            id="email"
            type="email"
            placeholder="seu@email.com"
            value={data.email}
            onChange={(e) => onChange('email', e.target.value)}
            className="h-12"
          />
          <p className="text-xs text-muted-foreground">
            Usaremos este e-mail para notificá-lo sobre interessados
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Telefone / WhatsApp *</Label>
          <Input
            id="phone"
            placeholder="(11) 99999-9999"
            value={data.phone}
            onChange={handlePhoneChange}
            maxLength={15}
            className="h-12"
          />
        </div>

        <div className="flex items-start space-x-3 pt-4">
          <Checkbox
            id="acceptTerms"
            checked={data.acceptTerms}
            onCheckedChange={(checked) =>
              onChange('acceptTerms', checked as boolean)
            }
            className="mt-1"
          />
          <Label
            htmlFor="acceptTerms"
            className="text-sm font-normal cursor-pointer leading-relaxed"
          >
            Li e concordo com os{' '}
            <a href="/terms" className="text-gold hover:underline">
              Termos de Uso
            </a>{' '}
            e{' '}
            <a href="/privacy" className="text-gold hover:underline">
              Política de Privacidade
            </a>
            . Autorizo a PME.B3 a divulgar meu anúncio e entrar em contato
            sobre oportunidades relevantes.
          </Label>
        </div>
      </div>

      <div className="bg-gold/10 border border-gold/20 rounded-lg p-4 mt-6">
        <p className="text-sm text-foreground">
          ✨ <strong>Próximos passos:</strong> Após enviar, nossa equipe
          analisará seu anúncio em até 24 horas. Você receberá um e-mail de
          confirmação assim que ele for aprovado e publicado.
        </p>
      </div>
    </div>
  );
};

export default StepContact;
