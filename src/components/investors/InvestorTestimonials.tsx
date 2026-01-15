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
    name: 'Ricardo Mendes',
    role: 'Investidor Anjo',
    avatar: 'RM',
    rating: 5,
    text: 'A DealFlow me conectou com oportunidades que eu nunca teria acesso sozinho. Já fiz 3 investimentos através da plataforma com retornos excelentes.',
  },
  {
    name: 'Fernanda Costa',
    role: 'Family Office',
    avatar: 'FC',
    rating: 5,
    text: 'O processo de due diligence é impecável. Recebemos toda a documentação organizada e a equipe nos acompanhou em cada etapa da negociação.',
  },
  {
    name: 'Eduardo Silva',
    role: 'Investidor Privado',
    avatar: 'ES',
    rating: 5,
    text: 'Adquiri uma empresa de e-commerce através da DealFlow. O suporte foi excepcional desde a primeira reunião até o fechamento do deal.',
  },
  {
    name: 'Mariana Oliveira',
    role: 'Gestora de Fundos',
    avatar: 'MO',
    rating: 5,
    text: 'A curadoria de oportunidades é o grande diferencial. Só recebemos propostas que realmente fazem sentido para o nosso perfil de investimento.',
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
            Investidores que já encontraram oportunidades de sucesso através da DealFlow.
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
