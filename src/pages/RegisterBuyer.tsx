import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PublicChrome as Header } from '@/components/layout/PublicChrome';
import { PublicFooter as Footer } from '@/components/layout/PublicFooter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { categories } from '@/data/mockData';
import { UserSearch, DollarSign, MapPin } from 'lucide-react';

const brazilStates = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA',
  'PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'
];

export default function RegisterBuyer() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    buyer_name: '',
    company_name: '',
    email: '',
    whatsapp: '',
    categories: [] as string[],
    min_budget: '',
    max_budget: '',
    city: '',
    state: '',
    description: '',
  });

  const toggleCategory = (catId: string) => {
    setForm(prev => ({
      ...prev,
      categories: prev.categories.includes(catId)
        ? prev.categories.filter(c => c !== catId)
        : [...prev.categories, catId],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error('Você precisa estar logado para cadastrar um comprador.');
      navigate('/auth');
      return;
    }
    if (!form.buyer_name || form.categories.length === 0) {
      toast.error('Preencha o nome e selecione pelo menos um setor.');
      return;
    }

    setLoading(true);
    const { error } = await supabase.from('buyer_profiles').insert({
      user_id: user.id,
      buyer_name: form.buyer_name,
      company_name: form.company_name || null,
      email: form.email || null,
      whatsapp: form.whatsapp || null,
      categories: form.categories,
      min_budget: form.min_budget ? Number(form.min_budget) : null,
      max_budget: form.max_budget ? Number(form.max_budget) : null,
      city: form.city || null,
      state: form.state || null,
      description: form.description || null,
    });
    setLoading(false);

    if (error) {
      toast.error('Erro ao cadastrar comprador.');
      console.error(error);
    } else {
      // Atribui a role buyer (idempotente) — libera menu Comprar
      try {
        await supabase.functions.invoke('assign-buyer-role');
        await queryClient.invalidateQueries({ queryKey: ['user-roles', user.id] });
      } catch (e) {
        console.warn('Falha ao atribuir role buyer (cadastro salvo)', e);
      }
      toast.success('Comprador cadastrado! Acesso liberado.');
      navigate('/matching');
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 pt-24 pb-16 px-4">
        <div className="max-w-2xl mx-auto">
          <Card className="border-border">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mb-3">
                <UserSearch className="w-6 h-6 text-blue-400" />
              </div>
              <CardTitle className="text-2xl">Cadastrar Comprador</CardTitle>
              <CardDescription>
                Registre um potencial comprador/investidor para aparecer no mapa com marcador azul.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Contact info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome do Comprador *</Label>
                    <Input
                      value={form.buyer_name}
                      onChange={e => setForm(p => ({ ...p, buyer_name: e.target.value }))}
                      placeholder="João Silva"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Empresa</Label>
                    <Input
                      value={form.company_name}
                      onChange={e => setForm(p => ({ ...p, company_name: e.target.value }))}
                      placeholder="Holding XYZ"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>E-mail</Label>
                    <Input
                      type="email"
                      value={form.email}
                      onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                      placeholder="joao@empresa.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>WhatsApp</Label>
                    <Input
                      value={form.whatsapp}
                      onChange={e => setForm(p => ({ ...p, whatsapp: e.target.value }))}
                      placeholder="(11) 99999-9999"
                    />
                  </div>
                </div>

                {/* Categories */}
                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    Setores de Interesse *
                  </Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {categories.map(cat => (
                      <div
                        key={cat.id}
                        className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50 transition-colors"
                      >
                        <Checkbox
                          id={`buyer-cat-${cat.id}`}
                          checked={form.categories.includes(cat.id)}
                          onCheckedChange={() => toggleCategory(cat.id)}
                        />
                        <Label htmlFor={`buyer-cat-${cat.id}`} className="text-xs font-normal cursor-pointer">
                          {cat.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Budget */}
                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Faixa de Investimento (R$)
                  </Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Mínimo</Label>
                      <Input
                        type="number"
                        value={form.min_budget}
                        onChange={e => setForm(p => ({ ...p, min_budget: e.target.value }))}
                        placeholder="500.000"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Máximo</Label>
                      <Input
                        type="number"
                        value={form.max_budget}
                        onChange={e => setForm(p => ({ ...p, max_budget: e.target.value }))}
                        placeholder="5.000.000"
                      />
                    </div>
                  </div>
                </div>

                {/* Location */}
                <div className="space-y-3">
                  <Label className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Localização de Interesse
                  </Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Estado</Label>
                      <select
                        className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                        value={form.state}
                        onChange={e => setForm(p => ({ ...p, state: e.target.value }))}
                      >
                        <option value="">Selecione</option>
                        {brazilStates.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-muted-foreground">Cidade</Label>
                      <Input
                        value={form.city}
                        onChange={e => setForm(p => ({ ...p, city: e.target.value }))}
                        placeholder="São Paulo"
                      />
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label>O que busca?</Label>
                  <Textarea
                    value={form.description}
                    onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                    placeholder="Descreva o perfil de empresa ou oportunidade que o comprador busca..."
                    rows={3}
                  />
                </div>

                <Button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                  {loading ? 'Cadastrando...' : 'Cadastrar Comprador'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}
