import { useEffect, useState } from 'react';
import { Building2, Search, MoreHorizontal, Eye, CheckCircle, XCircle, Trash2, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminRoute } from '@/components/admin/AdminRoute';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/formatters';
import { toast } from 'sonner';

interface Listing {
  id: string;
  title: string;
  category: string;
  city: string | null;
  state: string | null;
  status: string | null;
  plan: string | null;
  asking_price: number | null;
  created_at: string | null;
  user_id: string;
  images: string[] | null;
}

const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  active: { label: 'Ativo', variant: 'default' },
  pending: { label: 'Pendente', variant: 'secondary' },
  pending_payment: { label: 'Aguardando Pagamento', variant: 'secondary' },
  inactive: { label: 'Inativo', variant: 'outline' },
  rejected: { label: 'Rejeitado', variant: 'destructive' },
};

const planConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  basic: { label: 'Básico', variant: 'outline' },
  master: { label: 'Master', variant: 'default' },
};

export default function AdminListings() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPlan, setFilterPlan] = useState<string>('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [listingToDelete, setListingToDelete] = useState<Listing | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchListings();
  }, []);

  async function fetchListings() {
    try {
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setListings(data || []);
    } catch (error) {
      console.error('Error fetching listings:', error);
      toast.error('Erro ao carregar anúncios');
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusChange(listingId: string, newStatus: string) {
    try {
      const { error } = await supabase
        .from('listings')
        .update({ status: newStatus })
        .eq('id', listingId);

      if (error) throw error;

      setListings(prev => 
        prev.map(l => l.id === listingId ? { ...l, status: newStatus } : l)
      );
      toast.success(`Status alterado para ${statusConfig[newStatus]?.label || newStatus}`);
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Erro ao atualizar status');
    }
  }

  async function handleDelete() {
    if (!listingToDelete) return;

    try {
      // Delete images from storage
      if (listingToDelete.images && listingToDelete.images.length > 0) {
        const filePaths = listingToDelete.images.map(url => {
          const parts = url.split('/');
          return parts.slice(-2).join('/');
        });
        await supabase.storage.from('listing-images').remove(filePaths);
      }

      // Delete listing
      const { error } = await supabase
        .from('listings')
        .delete()
        .eq('id', listingToDelete.id);

      if (error) throw error;

      setListings(prev => prev.filter(l => l.id !== listingToDelete.id));
      toast.success('Anúncio excluído com sucesso');
    } catch (error) {
      console.error('Error deleting listing:', error);
      toast.error('Erro ao excluir anúncio');
    } finally {
      setDeleteDialogOpen(false);
      setListingToDelete(null);
    }
  }

  const filteredListings = listings.filter(listing => {
    const matchesSearch = 
      listing.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      listing.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (listing.city?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || listing.status === filterStatus;
    const matchesPlan = filterPlan === 'all' || listing.plan === filterPlan;
    
    return matchesSearch && matchesStatus && matchesPlan;
  });

  return (
    <AdminRoute>
      <AdminLayout>
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Anúncios</h1>
            <p className="text-muted-foreground mt-1">
              Gerencie todos os anúncios da plataforma
            </p>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por título, categoria ou cidade..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Filtrar por status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    <SelectItem value="active">Ativo</SelectItem>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="pending_payment">Aguardando Pagamento</SelectItem>
                    <SelectItem value="inactive">Inativo</SelectItem>
                    <SelectItem value="rejected">Rejeitado</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterPlan} onValueChange={setFilterPlan}>
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="Filtrar por plano" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os planos</SelectItem>
                    <SelectItem value="basic">Básico</SelectItem>
                    <SelectItem value="master">Master</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Listings Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Lista de Anúncios ({filteredListings.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Anúncio</TableHead>
                      <TableHead>Localização</TableHead>
                      <TableHead>Preço</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Plano</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredListings.map((listing) => (
                      <TableRow key={listing.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-lg bg-muted overflow-hidden">
                              {listing.images?.[0] ? (
                                <img 
                                  src={listing.images[0]} 
                                  alt={listing.title}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="h-full w-full flex items-center justify-center">
                                  <Building2 className="h-5 w-5 text-muted-foreground" />
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="font-medium text-foreground">
                                {listing.title}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {listing.category}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {listing.city && listing.state ? (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              <span className="text-sm">{listing.city}, {listing.state}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {listing.asking_price 
                            ? formatCurrency(listing.asking_price)
                            : <span className="text-muted-foreground">Sob consulta</span>
                          }
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusConfig[listing.status || 'pending']?.variant || 'secondary'}>
                            {statusConfig[listing.status || 'pending']?.label || listing.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={planConfig[listing.plan || 'basic']?.variant || 'outline'}>
                            {planConfig[listing.plan || 'basic']?.label || listing.plan}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {listing.created_at 
                            ? new Date(listing.created_at).toLocaleDateString('pt-BR')
                            : '-'
                          }
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Ações</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => navigate(`/anuncio/${listing.id}`)}>
                                <Eye className="h-4 w-4 mr-2" />
                                Ver Anúncio
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuLabel className="text-xs text-muted-foreground">
                                Alterar Status
                              </DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => handleStatusChange(listing.id, 'active')}>
                                <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                                Aprovar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleStatusChange(listing.id, 'inactive')}>
                                <XCircle className="h-4 w-4 mr-2 text-muted-foreground" />
                                Desativar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleStatusChange(listing.id, 'rejected')}>
                                <XCircle className="h-4 w-4 mr-2 text-red-500" />
                                Rejeitar
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-red-500"
                                onClick={() => {
                                  setListingToDelete(listing);
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir Anúncio</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir o anúncio "{listingToDelete?.title}"? 
                Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </AdminLayout>
    </AdminRoute>
  );
}
