import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, CheckCircle2, XCircle, MessageCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { getWhatsAppLink } from '@/lib/whatsapp';

type RequestRow = { id: string; status: string; reason: string | null; created_at: string };

export default function AwaitingApproval() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [advisorReq, setAdvisorReq] = useState<RequestRow | null>(null);
  const [franchReq, setFranchReq] = useState<RequestRow | null>(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate('/auth'); return; }
    (async () => {
      const [a, f] = await Promise.all([
        supabase.from('advisor_requests' as any).select('id,status,reason,created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('franchisee_requests' as any).select('id,status,created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      ]);
      setAdvisorReq((a.data as any) ?? null);
      setFranchReq((f.data as any) ? { ...(f.data as any), reason: null } : null);
      setFetching(false);
    })();
  }, [user, loading, navigate]);

  const renderBadge = (status?: string) => {
    if (status === 'approved') return <Badge className="gap-1"><CheckCircle2 className="h-3 w-3" />Aprovado</Badge>;
    if (status === 'rejected') return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" />Rejeitado</Badge>;
    return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" />Pendente</Badge>;
  };

  if (loading || fetching) {
    return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent" /></div>;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-muted to-background p-6">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Acesso aguardando aprovação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground break-words">
            Sua conta foi criada com sucesso. O acesso a perfis sensíveis precisa da aprovação de um administrador. Você receberá uma notificação assim que for analisado.
          </p>

          {advisorReq && (
            <div className="flex items-center justify-between border rounded-lg p-3">
              <div>
                <div className="font-medium text-sm">Assessor</div>
                <div className="text-xs text-muted-foreground">Pedido em {new Date(advisorReq.created_at).toLocaleDateString('pt-BR')}</div>
                {advisorReq.reason && <div className="text-xs text-destructive mt-1 break-words">{advisorReq.reason}</div>}
              </div>
              {renderBadge(advisorReq.status)}
            </div>
          )}

          {franchReq && (
            <div className="flex items-center justify-between border rounded-lg p-3">
              <div>
                <div className="font-medium text-sm">Franqueado</div>
                <div className="text-xs text-muted-foreground">Pedido em {new Date(franchReq.created_at).toLocaleDateString('pt-BR')}</div>
              </div>
              {renderBadge(franchReq.status)}
            </div>
          )}

          {!advisorReq && !franchReq && (
            <p className="text-sm text-muted-foreground">Nenhum pedido encontrado.</p>
          )}

          <div className="flex flex-col sm:flex-row gap-2 pt-4">
            <Button asChild variant="outline" className="bg-transparent flex-1">
              <a href={getWhatsAppLink('Olá, gostaria de acompanhar meu pedido de acesso na Mari.')} target="_blank" rel="noreferrer">
                <MessageCircle className="h-4 w-4 mr-2" />Falar com a equipe
              </a>
            </Button>
            <Button asChild className="flex-1"><Link to="/painel">Ir para o painel</Link></Button>
          </div>
          <Button variant="ghost" size="sm" onClick={() => { signOut(); navigate('/'); }} className="w-full">Sair</Button>
        </CardContent>
      </Card>
    </div>
  );
}
