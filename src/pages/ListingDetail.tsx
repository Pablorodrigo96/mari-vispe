import { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { PublicChrome as Header } from '@/components/layout/PublicChrome';
import { PublicFooter as Footer } from '@/components/layout/PublicFooter';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent } from '@/components/ui/dialog';
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
  ShieldCheck,
  Clock,
  Sparkles,
  ChevronRight,
  Image as ImageIcon,
} from 'lucide-react';
import { categories } from '@/data/mockData';
import { getCategoryFallbackImage } from '@/lib/categoryImages';
import { SimilarListings } from '@/components/listing/SimilarListings';
import { EntityNotes } from '@/components/equity-brain/notes/EntityNotes';
import { useEffectiveRoles } from '@/hooks/useEffectiveRoles';

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

const formatCurrency = (value: number | null | undefined) => {
  if (value == null) return '—';
  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  });
};

const ListingDetail = () => {
  const { isAdvisor, isAdmin } = useEffectiveRoles();
  const canSeeInternalNotes = isAdvisor || isAdmin;
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [videoOpen, setVideoOpen] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    phone: '',
    message: '',
  });
  const [isSending, setIsSending] = useState(false);
  const [showStickyBar, setShowStickyBar] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const viewTracked = useRef(false);

  useEffect(() => {
    if (!listing || viewTracked.current) return;
    viewTracked.current = true;
    supabase.from('listing_views' as any).insert({
      listing_id: listing.id,
      user_id: user?.id || null,
      event_type: 'view',
    }).then(() => {});
  }, [listing, user]);

  // Sticky bar visibility on scroll
  useEffect(() => {
    const onScroll = () => {
      if (!heroRef.current) return;
      const rect = heroRef.current.getBoundingClientRect();
      setShowStickyBar(rect.bottom < 80);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [listing]);

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
      toast.success('Mensagem enviada! O anunciante será notificado.');
      trackContactClick();
      setContactForm({ name: '', email: '', phone: '', message: '' });
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erro ao enviar mensagem. Tente novamente.');
    } finally {
      setIsSending(false);
    }
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: listing?.title || 'Anúncio mari', url });
        return;
      } catch {/* canceled */}
    }
    await navigator.clipboard.writeText(url);
    toast.success('Link copiado para a área de transferência');
  };

  const getCategoryInfo = (categoryId: string | null) => {
    if (!categoryId) return undefined;
    return categories.find(c => c.id === categoryId);
  };

  const margin =
    listing && listing.annual_profit && listing.annual_revenue
      ? (listing.annual_profit / listing.annual_revenue) * 100
      : 0;

  const ebitdaMultiple =
    listing && listing.asking_price && listing.annual_profit && listing.annual_profit > 0
      ? listing.asking_price / listing.annual_profit
      : null;

  const isNew =
    listing?.created_at &&
    Date.now() - new Date(listing.created_at).getTime() < 7 * 24 * 60 * 60 * 1000;

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-20 pb-16">
          <Skeleton className="h-[60vh] w-full" />
          <div className="container mx-auto px-4 max-w-6xl mt-8">
            <Skeleton className="h-20 w-full mb-6" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-4">
                <Skeleton className="h-64 w-full" />
                <Skeleton className="h-48 w-full" />
              </div>
              <Skeleton className="h-96 w-full" />
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

  const images =
    listing.images && listing.images.length > 0
      ? listing.images
      : [getCategoryFallbackImage(listing.category, listing.id)];
  const categoryInfo = getCategoryInfo(listing.category);
  const videoUrl = (listing as any).video_url as string | undefined;

  // Highlights extracted from additional_info (split by line breaks / bullets)
  const highlights = (listing.additional_info || '')
    .split(/\n+|•/)
    .map((s) => s.trim())
    .filter((s) => s.length > 4)
    .slice(0, 5);

  const renderVideo = () => {
    if (!videoUrl) return null;
    const youtubeMatch = videoUrl.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    const vimeoMatch = videoUrl.match(/vimeo\.com\/(\d+)/);
    if (youtubeMatch) {
      return <iframe src={`https://www.youtube.com/embed/${youtubeMatch[1]}?autoplay=1`} className="w-full h-full" allowFullScreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" />;
    } else if (vimeoMatch) {
      return <iframe src={`https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1`} className="w-full h-full" allowFullScreen />;
    }
    return <video src={videoUrl} controls autoPlay className="w-full h-full" />;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Sticky CTA Bar */}
      <div
        className={`fixed top-16 left-0 right-0 z-40 transition-all duration-300 ${
          showStickyBar ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 pointer-events-none'
        }`}
      >
        <div className="bg-background/85 backdrop-blur-xl border-b border-border/60 shadow-sm">
          <div className="container mx-auto px-4 max-w-6xl py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0">
              <div className="hidden sm:block">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Valor pedido</p>
                <p className="text-lg font-bold text-accent leading-tight">
                  {listing.hide_price ? 'Sob consulta' : formatCurrency(listing.asking_price)}
                </p>
              </div>
              <div className="hidden md:flex items-center gap-4 text-sm border-l border-border/60 pl-4">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Receita</p>
                  <p className="font-semibold">{formatCurrency(listing.annual_revenue)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Margem</p>
                  <p className="font-semibold">{margin.toFixed(0)}%</p>
                </div>
              </div>
              <h2 className="text-sm font-medium text-foreground truncate md:hidden">{listing.title}</h2>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                variant="outline"
                className="bg-transparent hidden sm:inline-flex"
                onClick={async () => {
                  trackContactClick();
                  await openWhatsApp(`Olá! Tenho interesse no anúncio: ${listing.title}`);
                }}
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                WhatsApp
              </Button>
              <Button
                size="sm"
                className="bg-accent text-accent-foreground hover:bg-accent/90"
                onClick={() => {
                  document.getElementById('contact-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }}
              >
                Tenho interesse
              </Button>
            </div>
          </div>
        </div>
      </div>

      <main className="pt-16 pb-16">
        {/* Hero Immersive */}
        <section ref={heroRef} className="relative w-full h-[70vh] min-h-[480px] max-h-[720px] overflow-hidden bg-muted">
          <img
            src={images[selectedImage]}
            alt={listing.title || 'Anúncio'}
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* Gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/70 via-transparent to-transparent" />

          {/* Top bar: back + actions */}
          <div className="absolute top-4 inset-x-0 z-10">
            <div className="container mx-auto px-4 max-w-6xl flex items-center justify-between">
              <Link
                to="/marketplace"
                className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-background/40 backdrop-blur-md border border-white/10 text-sm text-foreground hover:bg-background/60 transition"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Marketplace</span>
              </Link>
              <div className="flex items-center gap-2">
                <button
                  className="h-10 w-10 rounded-full bg-background/40 backdrop-blur-md border border-white/10 flex items-center justify-center hover:bg-background/60 transition"
                  aria-label="Favoritar"
                >
                  <Heart className="w-4 h-4" />
                </button>
                <button
                  onClick={handleShare}
                  className="h-10 w-10 rounded-full bg-background/40 backdrop-blur-md border border-white/10 flex items-center justify-center hover:bg-background/60 transition"
                  aria-label="Compartilhar"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Video play CTA */}
          {videoUrl && (
            <button
              onClick={() => setVideoOpen(true)}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 group"
            >
              <span className="flex items-center justify-center w-20 h-20 rounded-full bg-accent text-accent-foreground shadow-2xl group-hover:scale-110 transition-transform">
                <Play className="w-8 h-8 ml-1" fill="currentColor" />
              </span>
            </button>
          )}

          {/* Bottom info */}
          <div className="absolute bottom-0 inset-x-0 z-10 pb-8">
            <div className="container mx-auto px-4 max-w-6xl">
              <p className="text-[10px] uppercase tracking-[0.4em] text-accent mb-3">designed forward</p>
              <div className="flex flex-wrap items-center gap-2 mb-4">
                {categoryInfo && (
                  <Badge variant="outline" className="bg-background/40 backdrop-blur-md border-white/20 gap-1.5">
                    {categoryInfo.image && (
                      <img src={categoryInfo.image} alt="" className="w-4 h-4 rounded object-cover" />
                    )}
                    {categoryInfo.label}
                  </Badge>
                )}
                {listing.plan === 'master' && (
                  <Badge className="bg-accent text-accent-foreground gap-1">
                    <Sparkles className="w-3 h-3" />
                    Master
                  </Badge>
                )}
                {(listing as any).verified && (
                  <Badge className="bg-emerald-500/90 text-white gap-1 border-0">
                    <BadgeCheck className="w-3 h-3" />
                    Verificado
                  </Badge>
                )}
                {isNew && (
                  <Badge className="bg-background/40 backdrop-blur-md border border-white/20">Novo</Badge>
                )}
              </div>
              <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground max-w-3xl break-words leading-tight">
                {listing.title}
              </h1>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-4 text-muted-foreground text-sm">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  {[listing.neighborhood, listing.city, listing.state].filter(Boolean).join(', ')}
                </span>
                {listing.foundation_year && (
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    Fundada em {listing.foundation_year}
                  </span>
                )}
                {listing.ticker && (
                  <span className="inline-flex items-center gap-1.5 font-mono text-xs">
                    {listing.ticker}
                  </span>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Thumbnail strip */}
        {images.length > 1 && (
          <div className="border-b border-border/40 bg-card/30">
            <div className="container mx-auto px-4 max-w-6xl py-3">
              <div className="flex items-center gap-3 overflow-x-auto scrollbar-thin">
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                  <ImageIcon className="w-3.5 h-3.5" /> {images.length} fotos
                </span>
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => { setSelectedImage(idx); setLightboxOpen(true); }}
                    className={`relative h-16 w-24 rounded-lg overflow-hidden border-2 shrink-0 transition ${
                      selectedImage === idx ? 'border-accent' : 'border-transparent hover:border-border'
                    }`}
                  >
                    <img src={img} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="container mx-auto px-4 max-w-6xl mt-10">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Financial Metrics — premium */}
              <Card className="p-6 bg-card/60 backdrop-blur-md border-border/60">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-accent" />
                    Métricas Financeiras
                  </h2>
                  {ebitdaMultiple && (
                    <Badge variant="outline" className="text-xs">
                      Múltiplo ≈ {ebitdaMultiple.toFixed(1)}x lucro
                    </Badge>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="p-4 rounded-xl border border-border/60 bg-background/40">
                    <div className="h-9 w-9 rounded-lg bg-accent/15 text-accent flex items-center justify-center mb-3">
                      <DollarSign className="w-4 h-4" />
                    </div>
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Faturamento anual</p>
                    <p className="text-xl font-bold text-foreground break-words">
                      {formatCurrency(listing.annual_revenue)}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-border/60 bg-background/40">
                    <div className="h-9 w-9 rounded-lg bg-emerald-500/15 text-emerald-500 flex items-center justify-center mb-3">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Lucro líquido</p>
                    <p className="text-xl font-bold text-foreground break-words">
                      {formatCurrency(listing.annual_profit)}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-border/60 bg-background/40">
                    <div className="h-9 w-9 rounded-lg bg-orange-500/15 text-orange-500 flex items-center justify-center mb-3">
                      <BadgeCheck className="w-4 h-4" />
                    </div>
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">Margem líquida</p>
                    <p className="text-xl font-bold text-foreground">{margin.toFixed(1)}%</p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {margin >= 20 ? 'Acima da média' : 'Próxima da média'}
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-accent/40 bg-gradient-to-br from-accent/15 to-transparent relative overflow-hidden">
                    <div className="h-9 w-9 rounded-lg bg-accent/25 text-accent flex items-center justify-center mb-3">
                      {listing.hide_price ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </div>
                    <p className="text-[11px] uppercase tracking-wider text-accent/90 mb-1">Valor pedido</p>
                    <p className="text-xl font-bold text-accent break-words">
                      {listing.hide_price ? 'Sob consulta' : formatCurrency(listing.asking_price)}
                    </p>
                  </div>
                </div>
              </Card>

              {/* About */}
              <Card className="p-6 sm:p-8 bg-card/60 backdrop-blur-md border-border/60">
                <h2 className="text-lg font-semibold text-foreground mb-4">Sobre o negócio</h2>
                <div className="prose prose-invert max-w-none">
                  <p className="text-muted-foreground whitespace-pre-wrap break-words leading-relaxed first-letter:text-4xl first-letter:font-bold first-letter:text-foreground first-letter:mr-2 first-letter:float-left first-letter:leading-none first-letter:mt-1">
                    {listing.description || 'Sem descrição disponível.'}
                  </p>
                </div>

                {highlights.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-border/60">
                    <h3 className="text-sm font-semibold text-foreground mb-3 inline-flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-accent" />
                      Destaques
                    </h3>
                    <ul className="grid sm:grid-cols-2 gap-2">
                      {highlights.map((h, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <ChevronRight className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                          <span className="break-words">{h}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </Card>

              {/* Commercial space + location side-by-side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {(listing.square_meters || listing.rent_value || listing.sale_reason) && (
                  <Card className="p-6 bg-card/60 backdrop-blur-md border-border/60">
                    <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-accent" />
                      Operação
                    </h2>
                    <div className="space-y-4">
                      {listing.square_meters && (
                        <div className="flex items-center gap-3">
                          <Ruler className="w-5 h-5 text-muted-foreground shrink-0" />
                          <div>
                            <p className="text-xs text-muted-foreground">Área</p>
                            <p className="font-medium">{listing.square_meters} m²</p>
                          </div>
                        </div>
                      )}
                      {listing.rent_value && (
                        <div className="flex items-center gap-3">
                          <Home className="w-5 h-5 text-muted-foreground shrink-0" />
                          <div>
                            <p className="text-xs text-muted-foreground">Aluguel</p>
                            <p className="font-medium">{formatCurrency(listing.rent_value)}/mês</p>
                          </div>
                        </div>
                      )}
                      {listing.sale_reason && (
                        <div className="flex items-center gap-3">
                          <DollarSign className="w-5 h-5 text-muted-foreground shrink-0" />
                          <div>
                            <p className="text-xs text-muted-foreground">Motivo da venda</p>
                            <p className="font-medium break-words">
                              {saleReasonLabels[listing.sale_reason] || listing.sale_reason}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </Card>
                )}

                <Card className="p-6 bg-card/60 backdrop-blur-md border-border/60">
                  <h2 className="text-base font-semibold text-foreground mb-4 flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-accent" />
                    Localização
                  </h2>
                  <div className="aspect-[4/3] rounded-lg overflow-hidden relative bg-gradient-to-br from-accent/20 via-muted to-background">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className="h-14 w-14 rounded-full bg-accent/20 text-accent flex items-center justify-center mx-auto mb-3 ring-4 ring-accent/10">
                          <MapPin className="w-6 h-6" />
                        </div>
                        <p className="font-semibold text-foreground">{listing.city}, {listing.state}</p>
                        {listing.neighborhood && (
                          <p className="text-sm text-muted-foreground">{listing.neighborhood}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    Endereço exato compartilhado após contato inicial.
                  </p>
                </Card>
              </div>
            </div>

            {/* Sidebar contact */}
            <aside className="lg:col-span-1">
              <Card
                id="contact-form"
                className="p-6 sticky top-24 bg-card/70 backdrop-blur-md border-accent/30 ring-1 ring-accent/10 shadow-xl"
              >
                {/* Trust strip */}
                <div className="flex items-center gap-2 mb-5">
                  <div className="h-10 w-10 rounded-full bg-accent/15 text-accent flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground leading-tight">Anunciante na mari</p>
                    <p className="text-xs text-muted-foreground">Dados protegidos · Sem compromisso</p>
                  </div>
                </div>

                <h3 className="text-lg font-semibold text-foreground mb-1">
                  Demonstre interesse
                </h3>
                <p className="text-xs text-muted-foreground mb-4 inline-flex items-center gap-1">
                  <Clock className="w-3 h-3" /> Resposta média em 24h
                </p>

                <form onSubmit={handleContactSubmit} className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="contact-name" className="text-xs">Nome *</Label>
                    <Input
                      id="contact-name"
                      placeholder="Seu nome"
                      value={contactForm.name}
                      onChange={(e) => setContactForm((p) => ({ ...p, name: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="contact-email" className="text-xs">Email *</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="contact-email"
                        type="email"
                        placeholder="seu@email.com"
                        className="pl-10"
                        value={contactForm.email}
                        onChange={(e) => setContactForm((p) => ({ ...p, email: e.target.value }))}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="contact-phone" className="text-xs">Telefone</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        id="contact-phone"
                        type="tel"
                        placeholder="(00) 00000-0000"
                        className="pl-10"
                        value={contactForm.phone}
                        onChange={(e) => setContactForm((p) => ({ ...p, phone: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="contact-message" className="text-xs">Mensagem *</Label>
                    <Textarea
                      id="contact-message"
                      placeholder="Olá, tenho interesse neste negócio..."
                      value={contactForm.message}
                      onChange={(e) => setContactForm((p) => ({ ...p, message: e.target.value }))}
                      className="min-h-[96px]"
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-accent hover:bg-accent/90 text-accent-foreground font-semibold h-11"
                    disabled={isSending}
                  >
                    {isSending ? 'Enviando...' : 'Enviar mensagem'}
                  </Button>
                </form>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border/60" />
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase tracking-widest">
                    <span className="bg-card px-2 text-muted-foreground">ou</span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  className="w-full bg-transparent h-11"
                  onClick={async () => {
                    trackContactClick();
                    const opened = await openWhatsApp(`Olá! Tenho interesse no anúncio: ${listing.title}`);
                    if (!opened) {
                      toast.success('Link do WhatsApp copiado.');
                    }
                  }}
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Conversar no WhatsApp
                </Button>

                <p className="text-[11px] text-muted-foreground text-center mt-4 leading-relaxed">
                  Ao enviar, você concorda com os termos da mari. Seus dados não são compartilhados publicamente.
                </p>
              </Card>
            </aside>
          </div>

          {/* Similar listings */}
          <SimilarListings
            category={listing.category}
            excludeId={listing.id}
            state={listing.state}
          />
        </div>

        {canSeeInternalNotes && listing.id && (
          <div className="container mx-auto max-w-6xl px-4 py-6">
            <div className="rounded-lg border border-amber-700/40 bg-amber-500/5 p-4">
              <div className="text-[10px] uppercase tracking-wider text-amber-300 mb-3 flex items-center gap-1">
                <ShieldCheck className="h-3 w-3" /> Notas internas · advisor/admin
              </div>
              <EntityNotes entityType="listing" entityId={listing.id} allowedVisibilities={["internal"]} />
            </div>
          </div>
        )}
      </main>

      {/* Lightbox */}
      <Dialog open={lightboxOpen} onOpenChange={setLightboxOpen}>
        <DialogContent className="max-w-5xl p-0 bg-background border-border/60">
          <img
            src={images[selectedImage]}
            alt={listing.title || ''}
            className="w-full h-auto max-h-[85vh] object-contain"
          />
        </DialogContent>
      </Dialog>

      {/* Video modal */}
      <Dialog open={videoOpen} onOpenChange={setVideoOpen}>
        <DialogContent className="max-w-4xl p-0 bg-black border-border/60">
          <div className="aspect-video w-full">{renderVideo()}</div>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default ListingDetail;
