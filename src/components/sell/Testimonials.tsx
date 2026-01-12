import { Star } from 'lucide-react';

const testimonials = [
  {
    name: 'Carlos Mendes',
    role: 'Ex-proprietário de e-commerce',
    content:
      'Vendi minha loja virtual em apenas 45 dias. O processo foi transparente e seguro do início ao fim.',
    rating: 5,
    avatar: 'CM',
  },
  {
    name: 'Patricia Lima',
    role: 'Fundadora de rede de franquias',
    content:
      'Recebi propostas de investidores qualificados em menos de uma semana. Recomendo para quem quer vender com seriedade.',
    rating: 5,
    avatar: 'PL',
  },
  {
    name: 'Roberto Silva',
    role: 'Ex-dono de indústria têxtil',
    content:
      'A assessoria especializada fez toda diferença na negociação. Consegui um valor acima do esperado.',
    rating: 5,
    avatar: 'RS',
  },
];

export const Testimonials = () => {
  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
            O Que Dizem Nossos Vendedores
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Histórias de sucesso de empresários que venderam seus negócios através
            da nossa plataforma.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="bg-card border border-border rounded-xl p-6 hover:border-gold/30 transition-colors"
            >
              <div className="flex items-center gap-1 mb-4">
                {Array.from({ length: testimonial.rating }).map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-gold text-gold" />
                ))}
              </div>

              <p className="text-foreground mb-6 italic">
                "{testimonial.content}"
              </p>

              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center">
                  <span className="text-sm font-semibold text-gold">
                    {testimonial.avatar}
                  </span>
                </div>
                <div>
                  <p className="font-semibold text-foreground text-sm">
                    {testimonial.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {testimonial.role}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
