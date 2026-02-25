import { useEffect, useState } from 'react';
import { Users, Building2, CreditCard, ChartBar, TrendingUp, Clock, Heart } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminRoute } from '@/components/admin/AdminRoute';
import { StatsCard } from '@/components/admin/StatsCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/formatters';

interface DashboardStats {
  totalUsers: number;
  totalListings: number;
  activeListings: number;
  pendingListings: number;
  totalSubscriptions: number;
  masterSubscriptions: number;
  totalValuations: number;
}

interface RecentActivity {
  id: string;
  type: 'listing' | 'user' | 'valuation';
  title: string;
  description: string;
  createdAt: string;
}

interface InterestLog {
  id: string;
  ticker: string | null;
  created_at: string;
  user_name: string | null;
  user_email: string | null;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalListings: 0,
    activeListings: 0,
    pendingListings: 0,
    totalSubscriptions: 0,
    masterSubscriptions: 0,
    totalValuations: 0,
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [interestLogs, setInterestLogs] = useState<InterestLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        // Fetch profiles count
        const { count: usersCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        // Fetch listings stats
        const { data: listingsData } = await supabase
          .from('listings')
          .select('status');

        const totalListings = listingsData?.length || 0;
        const activeListings = listingsData?.filter(l => l.status === 'active').length || 0;
        const pendingListings = listingsData?.filter(l => l.status === 'pending' || l.status === 'pending_payment').length || 0;

        // Fetch subscriptions
        const { data: subsData } = await supabase
          .from('subscriptions')
          .select('plan, status');

        const totalSubs = subsData?.length || 0;
        const masterSubs = subsData?.filter(s => s.plan === 'master' && s.status === 'active').length || 0;

        // Fetch valuations count
        const { count: valuationsCount } = await supabase
          .from('valuation_history')
          .select('*', { count: 'exact', head: true });

        setStats({
          totalUsers: usersCount || 0,
          totalListings,
          activeListings,
          pendingListings,
          totalSubscriptions: totalSubs,
          masterSubscriptions: masterSubs,
          totalValuations: valuationsCount || 0,
        });

        // Fetch recent listings for activity
        const { data: recentListings } = await supabase
          .from('listings')
          .select('id, title, status, created_at')
          .order('created_at', { ascending: false })
          .limit(5);

        const activities: RecentActivity[] = (recentListings || []).map(listing => ({
          id: listing.id,
          type: 'listing' as const,
          title: listing.title,
          description: `Status: ${listing.status}`,
          createdAt: listing.created_at,
        }));

        setRecentActivity(activities);

        // Fetch interest logs
        const { data: interests } = await supabase
          .from('interest_logs' as any)
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10);

        if (interests) {
          // Fetch user profiles for these interests
          const userIds = [...new Set((interests as any[]).map((i: any) => i.user_id))];
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, full_name, phone');

          const profileMap = new Map((profiles || []).map(p => [p.user_id, p]));

          setInterestLogs((interests as any[]).map((interest: any) => {
            const profile = profileMap.get(interest.user_id);
            return {
              id: interest.id,
              ticker: interest.ticker,
              created_at: interest.created_at,
              user_name: profile?.full_name || 'N/A',
              user_email: profile?.phone || null,
            };
          }));
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  return (
    <AdminRoute>
      <AdminLayout>
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
            <p className="text-muted-foreground mt-1">
              Visão geral da plataforma
            </p>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatsCard
              title="Total de Usuários"
              value={stats.totalUsers}
              icon={Users}
            />
            <StatsCard
              title="Anúncios Ativos"
              value={stats.activeListings}
              description={`${stats.pendingListings} pendentes`}
              icon={Building2}
            />
            <StatsCard
              title="Assinantes Master"
              value={stats.masterSubscriptions}
              description={`de ${stats.totalSubscriptions} usuários`}
              icon={CreditCard}
            />
            <StatsCard
              title="Valuations Realizados"
              value={stats.totalValuations}
              icon={ChartBar}
            />
          </div>

          {/* Recent Activity & Quick Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Atividade Recente
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
                    ))}
                  </div>
                ) : recentActivity.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    Nenhuma atividade recente
                  </p>
                ) : (
                  <div className="space-y-4">
                    {recentActivity.map((activity) => (
                      <div
                        key={activity.id}
                        className="flex items-center gap-4 p-3 rounded-lg bg-muted/50"
                      >
                        <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-accent" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground truncate">
                            {activity.title}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {activity.description}
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(activity.createdAt).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Resumo Rápido
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                    <span className="text-muted-foreground">Total de Anúncios</span>
                    <span className="font-bold text-foreground">{stats.totalListings}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                    <span className="text-muted-foreground">Anúncios Pendentes</span>
                    <span className="font-bold text-amber-500">{stats.pendingListings}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-lg bg-muted/50">
                    <span className="text-muted-foreground">Taxa de Conversão Master</span>
                    <span className="font-bold text-foreground">
                      {stats.totalSubscriptions > 0 
                        ? ((stats.masterSubscriptions / stats.totalSubscriptions) * 100).toFixed(1)
                        : 0}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 rounded-lg bg-green-500/10">
                    <span className="text-muted-foreground">Anúncios Ativos</span>
                    <span className="font-bold text-green-500">{stats.activeListings}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Interest Logs */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="h-5 w-5" />
                Interesses Registrados
              </CardTitle>
            </CardHeader>
            <CardContent>
              {interestLogs.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Nenhum interesse registrado ainda
                </p>
              ) : (
                <div className="space-y-3">
                  {interestLogs.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center gap-4 p-3 rounded-lg bg-muted/50"
                    >
                      <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                        <Heart className="h-5 w-5 text-accent" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-foreground truncate">
                          {log.user_name} → <span className="text-accent font-bold">{log.ticker || 'N/A'}</span>
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {log.user_email || 'Sem telefone'}
                        </p>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(log.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </AdminLayout>
    </AdminRoute>
  );
}
