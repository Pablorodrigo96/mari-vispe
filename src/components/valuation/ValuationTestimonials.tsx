import { Star, Quote } from 'lucide-react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';

const testimonials = [
  {
    name: 'Ricardo Mendes',
    company: 'TechFlow SaaS',
    role: 'CEO & Founder',
    content: 'O valuation me ajudou a entender o real valor da minha empresa. Consegui negociar com investidores de forma muito mais segura.',
    rating: 5,
  },
  {
    name: 'Ana Carolina Silva',
    company: 'E-commerce Fashion',
    role: 'Fundadora',
    content: 'Processo rápido e profissional. O laudo foi aceito pelo fundo que estava negociando comigo sem nenhuma objeção.',
    rating: 5,
  },
  {
    name: 'Marcos Oliveira',
    company: 'Logística Express',
    role: 'Sócio-diretor',
    content: 'Finalmente uma ferramenta que entende o mercado brasileiro. A metodologia é sólida e os resultados são realistas.',
    rating: 5,
  },
  {
    name: 'Juliana Costa',
    company: 'HealthTech Brasil',
    role: 'CEO',
    content: 'Usei o laudo para apresentar para três fundos diferentes. Todos elogiaram a qualidade e profundidade da análise.',
    rating: 5,
  },
];

export const ValuationTestimonials = () => {
  return (
    <section id="depoimentos" className="py-16 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
            O Que Nossos Clientes Dizem
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Milhares de founders já descobriram o valor de suas empresas com nossa metodologia.
          </p>
        </div>

        <div className="max-w-5xl mx-auto">
          <Carousel
            opts={{
              align: 'start',
              loop: true,
            }}
            className="w-full"
          >
            <CarouselContent className="-ml-4">
              {testimonials.map((testimonial, index) => (
                <CarouselItem key={index} className="pl-4 md:basis-1/2 lg:basis-1/2">
                  <div className="h-full p-6 rounded-xl bg-card border border-border hover:border-gold/30 transition-colors shadow-card">
                    <Quote className="w-8 h-8 text-gold/30 mb-4" />
                    
                    <p className="text-foreground mb-6 leading-relaxed">
                      "{testimonial.content}"
                    </p>

                    <div className="flex items-center gap-1 mb-4">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-gold text-gold" />
                      ))}
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gold/10 flex items-center justify-center">
                        <span className="text-gold font-semibold text-sm">
                          {testimonial.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold text-foreground text-sm">{testimonial.name}</p>
                        <p className="text-muted-foreground text-xs">{testimonial.role} • {testimonial.company}</p>
                      </div>
                    </div>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="hidden md:flex -left-12" />
            <CarouselNext className="hidden md:flex -right-12" />
          </Carousel>
        </div>
      </div>
    </section>
  );
};
