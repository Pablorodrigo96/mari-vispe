import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Shield, ShoppingBag, Briefcase, UserCog, Search, MoreHorizontal, Plus, Trash2, Store, CheckCircle, XCircle, Clock, MessageSquare, Pencil, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAdvisorWhatsAppStatus } from '@/hooks/useAdvisorWhatsAppStatus';
import { AdminLayout } from '@/components/admin/AdminLayout';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

interface UserWithRoles {
  user_id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  created_at: string;
  roles: AppRole[];
  is_partner_accountant?: boolean;
}

const roleConfig: Record<AppRole, { label: string; icon: typeof Shield; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  admin: { label: 'Admin', icon: Shield, variant: 'destructive' },
  seller: { label: 'Vendedor', icon: Briefcase, variant: 'default' },
  buyer: { label: 'Comprador', icon: ShoppingBag, variant: 'secondary' },
  advisor: { label: 'Assessor', icon: UserCog, variant: 'outline' },
  franchisee: { label: 'Franqueado', icon: Store, variant: 'default' },
};

interface FranchiseeRequest {
  id: string;
  user_id: string;
  status: string;
  created_at: string;
  full_name?: string;
  phone?: string;
}

export default function AdminUsers() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [franchiseeRequests, setFranchiseeRequests] = useState<FranchiseeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  const [newRole, setNewRole] = useState<AppRole | ''>('');
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ full_name: '', phone: '', company_name: '', city: '', state: '' });
  const [editSaving, setEditSaving] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);

  const advisorIds = useMemo(
    () => users.filter(u => u.roles.includes('advisor') || u.roles.includes('admin')).map(u => u.user_id),
    [users],
  );
  const { statusMap: waStatus } = useAdvisorWhatsAppStatus(advisorIds);

  useEffect(() => {
    fetchUsers();
    fetchFranchiseeRequests();
  }, []);

  async function fetchUsers() {
    try {
      // Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, full_name, phone, created_at, is_partner_accountant')
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch all roles
      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // We need to get emails - since we can't query auth.users directly from client,
      // we'll use the email from the auth session for the current user
      // For a production app, you'd have an edge function or store email in profiles
      
      // Group roles by user
      const rolesByUser = (roles || []).reduce((acc, { user_id, role }) => {
        if (!acc[user_id]) acc[user_id] = [];
        acc[user_id].push(role);
        return acc;
      }, {} as Record<string, AppRole[]>);

      // Combine data
      const usersData: UserWithRoles[] = (profiles || []).map(profile => ({
        user_id: profile.user_id,
        email: '',
        full_name: profile.full_name,
        phone: profile.phone,
        created_at: profile.created_at,
        roles: rolesByUser[profile.user_id] || [],
        is_partner_accountant: (profile as any).is_partner_accountant ?? false,
      }));

      setUsers(usersData);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  }

  async function handleAddRole(userId: string, role: AppRole) {
    try {
      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role });

      if (error) {
        if (error.code === '23505') {
          toast.error('Usuário já possui esta role');
          return;
        }
        throw error;
      }

      toast.success('Role adicionada com sucesso');
      fetchUsers();
      setIsRoleDialogOpen(false);
      setNewRole('');
    } catch (error) {
      console.error('Error adding role:', error);
      toast.error('Erro ao adicionar role');
    }
  }

  async function handleRemoveRole(userId: string, role: AppRole) {
    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId)
        .eq('role', role);

      if (error) throw error;

      toast.success('Role removida com sucesso');
      fetchUsers();
    } catch (error) {
      console.error('Error removing role:', error);
      toast.error('Erro ao remover role');
    }
  }

  function openEdit(user: UserWithRoles) {
    setSelectedUser(user);
    setEditForm({
      full_name: user.full_name ?? '',
      phone: user.phone ?? '',
      company_name: '',
      city: '',
      state: '',
    });
    // load full profile
    supabase
      .from('profiles')
      .select('full_name, phone, company_name, city, state')
      .eq('user_id', user.user_id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setEditForm({
            full_name: data.full_name ?? '',
            phone: data.phone ?? '',
            company_name: (data as any).company_name ?? '',
            city: data.city ?? '',
            state: data.state ?? '',
          });
        }
      });
    setIsEditOpen(true);
  }

  async function handleSaveEdit() {
    if (!selectedUser) return;
    setEditSaving(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: editForm.full_name || null,
          phone: editForm.phone || null,
          company_name: editForm.company_name || null,
          city: editForm.city || null,
          state: editForm.state || null,
        } as any)
        .eq('user_id', selectedUser.user_id);
      if (error) throw error;
      toast.success('Usuário atualizado');
      setIsEditOpen(false);
      fetchUsers();
    } catch (e: any) {
      console.error(e);
      toast.error('Erro ao salvar: ' + (e.message ?? 'desconhecido'));
    } finally {
      setEditSaving(false);
    }
  }

  function openDelete(user: UserWithRoles) {
    setSelectedUser(user);
    setDeleteConfirm('');
    setIsDeleteOpen(true);
  }

  async function handleDeleteUser() {
    if (!selectedUser) return;
    if (selectedUser.user_id === currentUser?.id) {
      toast.error('Você não pode excluir a si mesmo');
      return;
    }
    setDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke('admin-delete-user', {
        body: { user_id: selectedUser.user_id },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success('Usuário excluído');
      setIsDeleteOpen(false);
      fetchUsers();
    } catch (e: any) {
      console.error(e);
      toast.error('Erro ao excluir: ' + (e.message ?? 'desconhecido'));
    } finally {
      setDeleting(false);
    }
  }

  async function handleTogglePartnerAccountant(userId: string, currentValue: boolean) {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_partner_accountant: !currentValue } as any)
        .eq('user_id', userId);

      if (error) throw error;
      toast.success(!currentValue ? 'Contador Parceiro ativado!' : 'Contador Parceiro desativado!');
      fetchUsers();
    } catch (error) {
      console.error('Error toggling partner accountant:', error);
      toast.error('Erro ao alterar status de Contador Parceiro');
    }
  }

  async function fetchFranchiseeRequests() {
    try {
      const { data: requests, error } = await supabase
        .from('franchisee_requests' as any)
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Enrich with profile data
      const enriched: FranchiseeRequest[] = [];
      for (const req of (requests || []) as any[]) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, phone')
          .eq('user_id', req.user_id)
          .single();
        enriched.push({
          ...req,
          full_name: profile?.full_name || 'Sem nome',
          phone: profile?.phone || 'Sem telefone',
        });
      }
      setFranchiseeRequests(enriched);
    } catch (error) {
      console.error('Error fetching franchisee requests:', error);
    }
  }

  async function handleApproveFranchisee(request: FranchiseeRequest) {
    try {
      // 1. Update request status
      await supabase
        .from('franchisee_requests' as any)
        .update({ status: 'approved', reviewed_at: new Date().toISOString() } as any)
        .eq('id', request.id);

      // 2. Create Master subscription
      await supabase.from('subscriptions').upsert({
        user_id: request.user_id,
        plan: 'master',
        status: 'active',
        multiples_limit: 999,
        dcf_limit: 999,
        multiples_used: 0,
        dcf_used: 0,
      }, { onConflict: 'user_id' } as any);

      // 3. Notify franchisee
      await supabase.from('notifications').insert({
        user_id: request.user_id,
        type: 'system',
        title: 'Franqueado aprovado!',
        content: 'Parabéns! Sua conta de franqueado foi aprovada. Você agora tem acesso ao Plano Master.',
      } as any);

      toast.success('Franqueado aprovado com sucesso!');
      fetchFranchiseeRequests();
      fetchUsers();
    } catch (error) {
      console.error('Error approving franchisee:', error);
      toast.error('Erro ao aprovar franqueado');
    }
  }

  async function handleRejectFranchisee(request: FranchiseeRequest) {
    try {
      // 1. Update request status
      await supabase
        .from('franchisee_requests' as any)
        .update({ status: 'rejected', reviewed_at: new Date().toISOString() } as any)
        .eq('id', request.id);

      // 2. Remove franchisee role
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', request.user_id)
        .eq('role', 'franchisee');

      // 3. Notify user
      await supabase.from('notifications').insert({
        user_id: request.user_id,
        type: 'system',
        title: 'Solicitação de franqueado',
        content: 'Sua solicitação de franqueado não foi aprovada.',
      } as any);

      toast.success('Franqueado rejeitado');
      fetchFranchiseeRequests();
      fetchUsers();
    } catch (error) {
      console.error('Error rejecting franchisee:', error);
      toast.error('Erro ao rejeitar franqueado');
    }
  }

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      (user.full_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      user.user_id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = filterRole === 'all' || user.roles.includes(filterRole as AppRole);
    
    return matchesSearch && matchesRole;
  });

  return (
    <AdminLayout>
        <div className="space-y-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Usuários</h1>
              <p className="text-muted-foreground mt-1">
                Gerencie os usuários da plataforma
              </p>
            </div>
          </div>

          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome ou ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={filterRole} onValueChange={setFilterRole}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Filtrar por role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as roles</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="seller">Vendedor</SelectItem>
                    <SelectItem value="buyer">Comprador</SelectItem>
                    <SelectItem value="advisor">Assessor</SelectItem>
                    <SelectItem value="franchisee">Franqueado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Franchisee Requests */}
          {franchiseeRequests.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-amber-500" />
                  Franqueados Pendentes ({franchiseeRequests.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {franchiseeRequests.map((req) => (
                      <TableRow key={req.id}>
                        <TableCell className="font-medium">{req.full_name}</TableCell>
                        <TableCell>{req.phone}</TableCell>
                        <TableCell>{new Date(req.created_at).toLocaleDateString('pt-BR')}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="default"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => handleApproveFranchisee(req)}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Aprovar
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleRejectFranchisee(req)}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Rejeitar
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Lista de Usuários ({filteredUsers.length})
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
                      <TableHead>Usuário</TableHead>
                      <TableHead>Roles</TableHead>
                      <TableHead>WhatsApp</TableHead>
                      <TableHead>Cadastro</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.user_id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-foreground">
                              {user.full_name || 'Sem nome'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {user.phone || 'Sem telefone'}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {user.roles.length === 0 ? (
                              <Badge variant="outline">Sem roles</Badge>
                            ) : (
                              user.roles.map((role) => {
                                const config = roleConfig[role];
                                return (
                                  <Badge key={role} variant={config.variant}>
                                    {config.label}
                                  </Badge>
                                );
                              })
                            )}
                            {user.is_partner_accountant && (
                              <Badge variant="outline" className="border-accent text-accent">
                                Contador Parceiro
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {(() => {
                            const isAdvisor = user.roles.includes('advisor');
                            if (!isAdvisor) {
                              return <span className="text-xs text-muted-foreground">—</span>;
                            }
                            const wa = waStatus[user.user_id];
                            const status = wa?.status ?? 'configure';
                            const handleClick = () =>
                              navigate(`/admin/advisors/${user.user_id}/whatsapp-setup`);
                            if (status === 'active') {
                              return (
                                <button
                                  onClick={handleClick}
                                  className="flex items-center gap-1.5 text-xs"
                                  title={wa?.phone_number ?? ''}
                                >
                                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                  <span className="text-emerald-400">Ativo</span>
                                  {wa?.is_mock && (
                                    <Badge variant="outline" className="h-4 px-1 text-[10px]">
                                      MOCK
                                    </Badge>
                                  )}
                                </button>
                              );
                            }
                            if (status === 'pending') {
                              return (
                                <button
                                  onClick={handleClick}
                                  className="flex items-center gap-1.5 text-xs text-amber-400"
                                >
                                  <Clock className="h-3 w-3" />
                                  Aguardando SMS
                                </button>
                              );
                            }
                            return (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 bg-transparent text-xs"
                                onClick={handleClick}
                              >
                                <MessageSquare className="h-3 w-3 mr-1" />
                                Configurar
                              </Button>
                            );
                          })()}
                        </TableCell>
                        <TableCell>
                          {new Date(user.created_at).toLocaleDateString('pt-BR')}
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
                              <DropdownMenuItem onClick={() => openEdit(user)}>
                                <Pencil className="h-4 w-4 mr-2" />
                                Editar dados
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => {
                                  setSelectedUser(user);
                                  setIsRoleDialogOpen(true);
                                }}
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Adicionar Role
                              </DropdownMenuItem>
                              {user.roles.includes('advisor') && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => handleTogglePartnerAccountant(user.user_id, !!user.is_partner_accountant)}
                                  >
                                    <UserCog className="h-4 w-4 mr-2" />
                                    {user.is_partner_accountant ? 'Desativar Contador Parceiro' : 'Ativar Contador Parceiro'}
                                  </DropdownMenuItem>
                                </>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuLabel className="text-xs text-muted-foreground">
                                Remover Role
                              </DropdownMenuLabel>
                              {user.roles.map((role) => (
                                <DropdownMenuItem
                                  key={role}
                                  onClick={() => handleRemoveRole(user.user_id, role)}
                                  className="text-red-500"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Remover {roleConfig[role].label}
                                </DropdownMenuItem>
                              ))}
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

        {/* Add Role Dialog */}
        <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Role</DialogTitle>
              <DialogDescription>
                Adicione uma nova role para {selectedUser?.full_name || 'o usuário'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <Select value={newRole} onValueChange={(v) => setNewRole(v as AppRole)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma role" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(roleConfig).map(([key, config]) => (
                    <SelectItem 
                      key={key} 
                      value={key}
                      disabled={selectedUser?.roles.includes(key as AppRole)}
                    >
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsRoleDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button 
                  onClick={() => selectedUser && newRole && handleAddRole(selectedUser.user_id, newRole as AppRole)}
                  disabled={!newRole}
                >
                  Adicionar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
    </AdminLayout>
  );
}
