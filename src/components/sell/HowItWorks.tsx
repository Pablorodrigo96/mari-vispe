import { UserPlus, FileText, Handshake } from 'lucide-react';

const steps = [
  {
    icon: UserPlus,
    step: '1',
    title: 'Crie sua conta',
    description: 'Cadastre-se gratuitamente em menos de 2 minutos',
  },
  {
    icon: FileText,
    step: '2',
    title: 'Cadastre seu negócio',
    description: 'Preencha as informações da sua empresa de forma simples',
  },
  {
    icon: Handshake,
    step: '3',
    title: 'Conecte-se com compradores',
    description: 'Receba propostas de investidores qualificados',
  },
];

export const HowItWorks = () => {
  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
            Como Funciona
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Vender sua empresa nunca foi tão simples. Siga estes 3 passos e
            conecte-se com compradores qualificados.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {steps.map((item, index) => (
            <div key={index} className="relative flex flex-col items-center text-center">
              {/* Connector line for desktop */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-gold/50 to-gold/20" />
              )}
              
              {/* Step number badge */}
              <div className="relative">
                <div className="w-16 h-16 rounded-full bg-gold/10 flex items-center justify-center mb-4 border-2 border-gold/30">
                  <item.icon className="w-7 h-7 text-gold" />
                </div>
                <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-gold text-gold-foreground text-sm font-bold flex items-center justify-center">
                  {item.step}
                </span>
              </div>

              <h3 className="font-semibold text-foreground text-lg mb-2">
                {item.title}
              </h3>
              <p className="text-sm text-muted-foreground">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
