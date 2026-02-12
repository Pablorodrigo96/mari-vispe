import { Star, Quote } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';

const testimonials = [
  {
    name: 'NavegMAIS',
    role: 'Provedor de Internet',
    avatar: 'NM',
    rating: 5,
    text: 'Passamos por todas as etapas da reestruturação e organização da empresa. Os resultados têm sido excelentes, serviço de qualidade e confiança.',
  },
  {
    name: 'Aonet',
    role: 'Provedor de Internet',
    avatar: 'AO',
    rating: 5,
    text: 'Há anos somos clientes e fazemos questão de contatá-los em todos os nossos planos e processos, dos mais simples aos mais estratégicos.',
  },
  {
    name: 'Virtex',
    role: 'Provedor de Internet',
    avatar: 'VX',
    rating: 5,
    text: 'Temos muita admiração pela transparência e dedicação em todas as demandas já solicitadas. Após os serviços prestados, tivemos o resultado alcançado.',
  },
  {
    name: 'TR Dream',
    role: 'Provedor de Internet',
    avatar: 'TD',
    rating: 5,
    text: 'Devido à ótima experiência que tivemos, recomendamos os serviços. Sempre nos atenderam com muito profissionalismo, segurança e dedicação.',
  },
];

export function InvestorTestimonials() {
  return (
    <section className="py-20 bg-muted/30">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
            O que dizem nossos investidores
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Investidores que já encontraram oportunidades de sucesso através da PME.B3.
          </p>
        </div>
        
        <Carousel
          opts={{
            align: 'start',
            loop: true,
          }}
          className="w-full"
        >
          <CarouselContent className="-ml-4">
            {testimonials.map((testimonial, index) => (
              <CarouselItem key={index} className="pl-4 md:basis-1/2 lg:basis-1/3">
                <Card className="bg-card border-border h-full">
                  <CardContent className="p-6 flex flex-col h-full">
                    <Quote className="w-8 h-8 text-accent/30 mb-4" />
                    
                    <p className="text-muted-foreground flex-1 mb-6 italic">
                      "{testimonial.text}"
                    </p>
                    
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center">
                        <span className="text-accent font-semibold">{testimonial.avatar}</span>
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{testimonial.name}</p>
                        <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                      </div>
                    </div>
                    
                    <div className="flex gap-1 mt-4">
                      {Array.from({ length: testimonial.rating }).map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-accent text-accent" />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="hidden md:flex -left-4" />
          <CarouselNext className="hidden md:flex -right-4" />
        </Carousel>
      </div>
    </section>
  );
}
