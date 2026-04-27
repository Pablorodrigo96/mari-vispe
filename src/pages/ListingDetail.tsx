import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { PublicChrome as Header } from '@/components/layout/PublicChrome';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { openWhatsApp } from '@/lib/whatsapp';
import { toast } from 'sonner';
import {
  MapPin,
  Calendar,
  TrendingUp,
  DollarSign,
  Building2,
  Phone,
  Mail,
  MessageCircle,
  Share2,
  Heart,
  ArrowLeft,
  Eye,
  EyeOff,
  Ruler,
  Home,
  BadgeCheck,
  Play,
} from 'lucide-react';
import { categories } from '@/data/mockData';
import { getCategoryFallbackImage } from '@/lib/categoryImages';

interface Listing {
  id: string | null;
  title: string | null;
  category: string | null;
  foundation_year: number | null;
  annual_revenue: number | null;
  annual_profit: number | null;
  asking_price: number | null;
  hide_price: boolean | null;
  description: string | null;
  city: string | null;
  state: string | null;
  neighborhood: string | null;
  square_meters: number | null;
  rent_value: number | null;
  sale_reason: string | null;
  images: string[] | null;
  plan: string | null;
  status: string | null;
  created_at: string | null;
  additional_info: string | null;
  equity_score: number | null;
  iptu_value: number | null;
  ticker: string | null;
  updated_at: string | null;
}

const saleReasonLabels: Record<string, string> = {
  retirement: 'Aposentadoria',
  relocation: 'Mudança de cidade/país',
  partners: 'Desentendimento entre sócios',
  new_business: 'Novo negócio/oportunidade',
  health: 'Problemas de saúde',
  family: 'Motivos familiares',
  burnout: 'Cansaço/Esgotamento',
  capital: 'Necessidade de capital',
  other: 'Outro motivo',
};

const formatCurrency = (value: number) => {
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  });
};

const ListingDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
  });
  const [isSending, setIsSending] = useState(false);
  const viewTracked = useRef(false);

  // Track listing view
  useEffect(() => {
    if (!listing || viewTracked.current) return;
    viewTracked.current = true;
    supabase.from('listing_views' as any).insert({
      listing_id: listing.id,
      user_id: user?.id || null,
      event_type: 'view',
    }).then(() => {});
  }, [listing, user]);

  const trackContactClick = () => {
    if (!listing) return;
    supabase.from('listing_views' as any).insert({
      listing_id: listing.id,
      user_id: user?.id || null,
      event_type: 'contact_click',
    }).then(() => {});
  };

  useEffect(() => {
    const fetchListing = async () => {
      if (!id) return;

      try {
        const { data, error } = await supabase
          .from('public_listings')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (error) throw error;
        setListing(data);
      } catch (error) {
        console.error('Error fetching listing:', error);
        toast.error('Erro ao carregar anúncio');
      } finally {
        setLoading(false);
      }
    };

    fetchListing();
  }, [id]);

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);
    
    try {
      // Use edge function with rate limiting
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-message`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            listing_id: listing?.id,
            sender_name: contactForm.name.trim(),
            sender_email: contactForm.email.trim(),
            sender_phone: contactForm.phone?.trim() || undefined,
            message: contactForm.message.trim(),
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          toast.error('Muitas mensagens enviadas. Aguarde alguns minutos e tente novamente.');
        } else {
          toast.error(data.error || 'Erro ao enviar mensagem. Tente novamente.');
        }
        return;
      }

      toast.success('Mensagem enviada com sucesso! O anunciante será notificado.');
      trackContactClick();
      setContactForm({ name: '', email: '', phone: '', message: '' });
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erro ao enviar mensagem. Tente novamente.');
    } finally {
      setIsSending(false);
    }
  };

  const getCategoryInfo = (categoryId: string) => {
    return categories.find(c => c.id === categoryId);
  };

  const margin = listing ? (listing.annual_profit / listing.annual_revenue) * 100 : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-24 pb-16">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <Skeleton className="h-8 w-64 mb-4" />
              <Skeleton className="h-64 w-full mb-6" />
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <Skeleton className="h-96 w-full" />
                </div>
                <Skeleton className="h-96 w-full" />
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-24 pb-16">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-2xl font-bold text-foreground mb-4">
              Anúncio não encontrado
            </h1>
            <Button asChild>
              <Link to="/marketplace">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar ao Marketplace
              </Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            {/* Back Button */}
            <Link
              to="/marketplace"
              className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar ao Marketplace
            </Link>

            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="outline" className="flex items-center gap-1.5">
                    {getCategoryInfo(listing.category)?.image && (
                      <img src={getCategoryInfo(listing.category)!.image} alt="" className="w-4 h-4 rounded object-cover" />
                    )}
                    {getCategoryInfo(listing.category)?.label || listing.category}
                  </Badge>
                  {listing.plan === 'master' && (
                    <Badge className="bg-accent text-accent-foreground">Master</Badge>
                  )}
                  {(listing as any).verified && (
                    <Badge className="bg-accent text-accent-foreground gap-1">
                      <BadgeCheck className="w-3 h-3" />
                      Verificado
                    </Badge>
                  )}
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                  {listing.title}
                </h1>
                <div className="flex items-center gap-4 mt-2 text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {listing.city}, {listing.state}
                  </span>
                  {listing.foundation_year && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Fundada em {listing.foundation_year}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="icon">
                  <Heart className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="icon">
                  <Share2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Video Player */}
            {(listing as any).video_url && (
              <div className="mb-8">
                <div className="aspect-video rounded-xl overflow-hidden bg-muted">
                  {(() => {
                    const url = (listing as any).video_url as string;
                    const youtubeMatch = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
                    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
                    if (youtubeMatch) {
                      return <iframe src={`https://www.youtube.com/embed/${youtubeMatch[1]}`} className="w-full h-full" allowFullScreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" />;
                    } else if (vimeoMatch) {
                      return <iframe src={`https://player.vimeo.com/video/${vimeoMatch[1]}`} className="w-full h-full" allowFullScreen />;
                    } else {
                      return <video src={url} controls className="w-full h-full" />;
                    }
                  })()}
                </div>
              </div>
            )}

            {/* Image Gallery */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              {listing.images && listing.images.length > 0 ? (
                <>
                  <div className="md:col-span-3 aspect-video bg-muted rounded-xl overflow-hidden">
                    <img
                      src={listing.images[selectedImage]}
                      alt={`${listing.title} - Foto ${selectedImage + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="grid grid-cols-3 md:grid-cols-1 gap-2">
                    {listing.images.slice(0, 4).map((image, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedImage(index)}
                        className={`aspect-square rounded-lg overflow-hidden border-2 transition-colors ${
                          selectedImage === index ? 'border-accent' : 'border-transparent'
                        }`}
                      >
                        <img
                          src={image}
                          alt={`Thumbnail ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        {index === 3 && listing.images.length > 4 && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <span className="text-white font-medium">+{listing.images.length - 4}</span>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div className="md:col-span-4 aspect-video bg-muted rounded-xl overflow-hidden">
                  <img
                    src={getCategoryFallbackImage(listing.category, listing.id)}
                    alt={listing.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Main Content */}
              <div className="lg:col-span-2 space-y-6">
                {/* Financial Metrics */}
                <Card className="p-6">
                  <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-accent" />
                    Métricas Financeiras
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">Faturamento Anual</p>
                      <p className="text-lg font-bold text-foreground">
                        {formatCurrency(listing.annual_revenue)}
                      </p>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">Lucro Líquido</p>
                      <p className="text-lg font-bold text-foreground">
                        {formatCurrency(listing.annual_profit)}
                      </p>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">Margem Líquida</p>
                      <Badge
                        className={
                          margin >= 20
                            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                            : 'bg-orange-500/10 text-orange-600 border-orange-500/30'
                        }
                      >
                        {margin.toFixed(1)}%
                      </Badge>
                    </div>
                    <div className="p-4 bg-accent/10 rounded-lg border border-accent/30">
                      <p className="text-sm text-muted-foreground mb-1 flex items-center gap-1">
                        Valor Pedido
                        {listing.hide_price ? (
                          <EyeOff className="w-3 h-3" />
                        ) : (
                          <Eye className="w-3 h-3" />
                        )}
                      </p>
                      <p className="text-lg font-bold text-accent">
                        {listing.hide_price ? 'Sob Consulta' : formatCurrency(listing.asking_price)}
                      </p>
                    </div>
                  </div>
                </Card>

                {/* Description */}
                <Card className="p-6">
                  <h2 className="text-lg font-semibold text-foreground mb-4">
                    Sobre o Negócio
                  </h2>
                  <p className="text-muted-foreground whitespace-pre-wrap break-words">
                    {listing.description}
                  </p>
                </Card>

                {/* Commercial Space */}
                {(listing.square_meters || listing.rent_value) && (
                  <Card className="p-6">
                    <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-accent" />
                      Ponto Comercial
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {listing.square_meters && (
                        <div className="flex items-center gap-3">
                          <Ruler className="w-5 h-5 text-muted-foreground" />
                          <div>
                            <p className="text-sm text-muted-foreground">Área</p>
                            <p className="font-medium">{listing.square_meters} m²</p>
                          </div>
                        </div>
                      )}
                      {listing.rent_value && (
                        <div className="flex items-center gap-3">
                          <Home className="w-5 h-5 text-muted-foreground" />
                          <div>
                            <p className="text-sm text-muted-foreground">Aluguel</p>
                            <p className="font-medium">{formatCurrency(listing.rent_value)}/mês</p>
                          </div>
                        </div>
                      )}
                      {listing.sale_reason && (
                        <div className="flex items-center gap-3">
                          <DollarSign className="w-5 h-5 text-muted-foreground" />
                          <div>
                            <p className="text-sm text-muted-foreground">Motivo da Venda</p>
                            <p className="font-medium">
                              {saleReasonLabels[listing.sale_reason] || listing.sale_reason}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                )}

                {/* Map */}
                <Card className="p-6">
                  <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-accent" />
                    Localização
                  </h2>
                  <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <MapPin className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p className="font-medium">{listing.city}, {listing.state}</p>
                      {listing.neighborhood && (
                        <p className="text-sm">{listing.neighborhood}</p>
                      )}
                    </div>
                  </div>
                </Card>
              </div>

              {/* Sidebar - Contact Form */}
              <div className="lg:col-span-1">
                <Card className="p-6 sticky top-24">
                  <h3 className="text-lg font-semibold text-foreground mb-4">
                    Entre em Contato
                  </h3>
                  <form onSubmit={handleContactSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="contact-name">Nome *</Label>
                      <Input
                        id="contact-name"
                        placeholder="Seu nome"
                        value={contactForm.name}
                        onChange={(e) =>
                          setContactForm((prev) => ({ ...prev, name: e.target.value }))
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contact-email">Email *</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="contact-email"
                          type="email"
                          placeholder="seu@email.com"
                          className="pl-10"
                          value={contactForm.email}
                          onChange={(e) =>
                            setContactForm((prev) => ({ ...prev, email: e.target.value }))
                          }
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contact-phone">Telefone</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="contact-phone"
                          type="tel"
                          placeholder="(00) 00000-0000"
                          className="pl-10"
                          value={contactForm.phone}
                          onChange={(e) =>
                            setContactForm((prev) => ({ ...prev, phone: e.target.value }))
                          }
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="contact-message">Mensagem *</Label>
                      <Textarea
                        id="contact-message"
                        placeholder="Olá, tenho interesse neste negócio..."
                        value={contactForm.message}
                        onChange={(e) =>
                          setContactForm((prev) => ({ ...prev, message: e.target.value }))
                        }
                        className="min-h-[100px]"
                        required
                      />
                    </div>
                    <Button
                      type="submit"
                      className="w-full bg-accent hover:bg-accent/90 text-accent-foreground"
                      disabled={isSending}
                    >
                      {isSending ? 'Enviando...' : 'Enviar Mensagem'}
                    </Button>
                  </form>

                  <div className="mt-6 pt-6 border-t">
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={async () => {
                        trackContactClick();
                        const opened = await openWhatsApp(`Olá! Tenho interesse no anúncio: ${listing.title}`);
                        if (!opened) {
                          toast.success('Link do WhatsApp copiado! Cole no navegador para abrir.');
                        }
                      }}
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Conversar no WhatsApp
                    </Button>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default ListingDetail;