import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Plus, 
  MoreVertical, 
  Eye, 
  Edit, 
  Pause, 
  Play, 
  Trash2,
  Building2,
  MapPin,
  Calendar
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/formatters';
import { toast } from 'sonner';

interface Listing {
  id: string;
  title: string;
  category: string;
  city: string | null;
  state: string | null;
  asking_price: number | null;
  hide_price: boolean | null;
  status: string | null;
  images: string[] | null;
  created_at: string | null;
  annual_revenue: number | null;
  annual_profit: number | null;
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  active: { label: 'Ativo', variant: 'default' },
  pending: { label: 'Pendente', variant: 'secondary' },
  paused: { label: 'Pausado', variant: 'outline' },
};

export default function MyListings() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [listingToDelete, setListingToDelete] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth?redirect=/meus-anuncios');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchListings();
    }
  }, [user]);

  const fetchListings = async () => {
    try {
      const { data, error } = await supabase
        .from('listings')
        .select('id, title, category, city, state, asking_price, hide_price, status, images, created_at, annual_revenue, annual_profit')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setListings(data || []);
    } catch (error) {
      console.error('Error fetching listings:', error);
      toast.error('Erro ao carregar anúncios');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: 'active' | 'paused') => {
    try {
      const { error } = await supabase
        .from('listings')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      setListings(prev => 
        prev.map(listing => 
          listing.id === id ? { ...listing, status: newStatus } : listing
        )
      );

      toast.success(newStatus === 'active' ? 'Anúncio ativado!' : 'Anúncio pausado!');
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Erro ao atualizar status');
    }
  };

  const handleDelete = async () => {
    if (!listingToDelete) return;

    try {
      // First, delete images from storage
      const listing = listings.find(l => l.id === listingToDelete);
      if (listing?.images?.length) {
        for (const imageUrl of listing.images) {
          const path = imageUrl.split('/listing-images/')[1];
          if (path) {
            await supabase.storage.from('listing-images').remove([path]);
          }
        }
      }

      // Then delete the listing
      const { error } = await supabase
        .from('listings')
        .delete()
        .eq('id', listingToDelete);

      if (error) throw error;

      setListings(prev => prev.filter(l => l.id !== listingToDelete));
      toast.success('Anúncio excluído com sucesso!');
    } catch (error) {
      console.error('Error deleting listing:', error);
      toast.error('Erro ao excluir anúncio');
    } finally {
      setDeleteDialogOpen(false);
      setListingToDelete(null);
    }
  };

  const openDeleteDialog = (id: string) => {
    setListingToDelete(id);
    setDeleteDialogOpen(true);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-24 pb-16">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-6xl">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">Meus Anúncios</h1>
              <p className="text-muted-foreground mt-1">
                Gerencie seus anúncios de empresas à venda
              </p>
            </div>
            <Button 
              onClick={() => navigate('/vender')}
              className="bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              <Plus className="w-4 h-4 mr-2" />
              Novo Anúncio
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold text-foreground">{listings.length}</p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Ativos</p>
                <p className="text-2xl font-bold text-green-500">
                  {listings.filter(l => l.status === 'active').length}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Pausados</p>
                <p className="text-2xl font-bold text-muted-foreground">
                  {listings.filter(l => l.status === 'paused').length}
                </p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">Pendentes</p>
                <p className="text-2xl font-bold text-amber-500">
                  {listings.filter(l => l.status === 'pending').length}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Listings */}
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <Card key={i} className="bg-card border-border">
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <Skeleton className="w-24 h-24 rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-4 w-1/4" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : listings.length === 0 ? (
            <Card className="bg-card border-border">
              <CardContent className="p-12 text-center">
                <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Nenhum anúncio ainda
                </h3>
                <p className="text-muted-foreground mb-6">
                  Comece a anunciar sua empresa agora mesmo
                </p>
                <Button 
                  onClick={() => navigate('/vender')}
                  className="bg-accent hover:bg-accent/90 text-accent-foreground"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Criar Primeiro Anúncio
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {listings.map(listing => (
                <Card key={listing.id} className="bg-card border-border hover:border-accent/50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row gap-4">
                      {/* Image */}
                      <div className="w-full sm:w-32 h-32 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                        {listing.images?.[0] ? (
                          <img 
                            src={listing.images[0]} 
                            alt={listing.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Building2 className="w-8 h-8 text-muted-foreground" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold text-foreground truncate">
                                {listing.title}
                              </h3>
                              <Badge variant={statusConfig[listing.status || 'pending']?.variant || 'secondary'}>
                                {statusConfig[listing.status || 'pending']?.label || 'Pendente'}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {listing.category}
                            </p>
                          </div>

                          {/* Actions Dropdown */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="flex-shrink-0">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => navigate(`/anuncio/${listing.id}`)}>
                                <Eye className="w-4 h-4 mr-2" />
                                Visualizar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => navigate(`/editar-anuncio/${listing.id}`)}>
                                <Edit className="w-4 h-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              {listing.status === 'active' ? (
                                <DropdownMenuItem onClick={() => handleStatusChange(listing.id, 'paused')}>
                                  <Pause className="w-4 h-4 mr-2" />
                                  Pausar
                                </DropdownMenuItem>
                              ) : listing.status === 'paused' ? (
                                <DropdownMenuItem onClick={() => handleStatusChange(listing.id, 'active')}>
                                  <Play className="w-4 h-4 mr-2" />
                                  Ativar
                                </DropdownMenuItem>
                              ) : null}
                              <DropdownMenuItem 
                                onClick={() => openDeleteDialog(listing.id)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        {/* Details */}
                        <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-muted-foreground">
                          {(listing.city || listing.state) && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5" />
                              {[listing.city, listing.state].filter(Boolean).join(', ')}
                            </span>
                          )}
                          {listing.created_at && (
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              {formatDate(listing.created_at)}
                            </span>
                          )}
                        </div>

                        {/* Price */}
                        <div className="mt-3">
                          {listing.hide_price ? (
                            <span className="text-muted-foreground text-sm">Valor sob consulta</span>
                          ) : listing.asking_price ? (
                            <span className="text-lg font-bold text-accent">
                              {formatCurrency(Number(listing.asking_price))}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-sm">Valor não informado</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir anúncio?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O anúncio e todas as suas imagens serão permanentemente excluídos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
