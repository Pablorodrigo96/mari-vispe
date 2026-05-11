import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface FeedItem {
  id: string;
  label: string;
  detail?: string;
  date: Date;
  icon: 'valuation' | 'listing' | 'buyer' | 'capital' | 'welcome';
}

export interface ScoreMari {
  score: number;
  label: string;
  breakdown: { key: string; value: number; max: number; label: string }[];
}

export interface BloombergData {
  score: ScoreMari;
  lastSyncMinutes: number | null;
  feed: FeedItem[];
  hasListing: boolean;
  hasValuation: boolean;
  listingsCount: number;
  valuationsCount: number;
  buyersCount: number;
}

function scoreLabel(score: number): string {
  if (score < 30) return 'Cadastro inicial';
  if (score < 50) return 'Em estruturação';
  if (score < 70) return 'Pré-venda';
  if (score < 85) return 'Pronto pro mercado';
  return 'Em janela ativa';
}

function minutesAgo(iso?: string | null): number | null {
  if (!iso) return null;
  const diff = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(diff / 60000));
}

export function usePainelBloomberg(): { data: BloombergData | null; isLoading: boolean } {
  const { user } = useAuth();

  const q = useQuery({
    queryKey: ['painel-bbg', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<BloombergData> => {
      const uid = user!.id;
      const [profileRes, listingsRes, valuationsRes, buyersRes, capitalRes] = await Promise.all([
        supabase.from('profiles').select('full_name, phone, company_name, avatar_url').eq('user_id', uid).maybeSingle(),
        supabase.from('listings').select('id, title, created_at').eq('user_id', uid).order('created_at', { ascending: false }).limit(5),
        supabase.from('valuation_history').select('id, valuation_type, segment, created_at').eq('user_id', uid).order('created_at', { ascending: false }).limit(5),
        supabase.from('buyer_profiles').select('id, created_at').eq('user_id', uid).order('created_at', { ascending: false }).limit(5),
        supabase.from('capital_requests').select('id, created_at').eq('user_id', uid).order('created_at', { ascending: false }).limit(5),
      ]);

      const profile = profileRes.data;
      const listings = listingsRes.data ?? [];
      const valuations = valuationsRes.data ?? [];
      const buyers = buyersRes.data ?? [];
      const capital = capitalRes.data ?? [];

      // ---------- Score Mari (on-the-fly) ----------
      const breakdown: ScoreMari['breakdown'] = [];

      // Perfil (20)
      const profileFields = [profile?.full_name, profile?.phone, profile?.company_name, profile?.avatar_url];
      const profileFilled = profileFields.filter(Boolean).length;
      const profilePts = Math.round((profileFilled / profileFields.length) * 20);
      breakdown.push({ key: 'profile', value: profilePts, max: 20, label: 'Perfil' });

      // Anúncio (20)
      const listingPts = listings.length > 0 ? 20 : 0;
      breakdown.push({ key: 'listing', value: listingPts, max: 20, label: 'Anúncio' });

      // Valuation (20)
      const valPts = valuations.length > 0 ? 20 : 0;
      breakdown.push({ key: 'valuation', value: valPts, max: 20, label: 'Valuation' });

      // Buyer cadastrado (20)
      const buyerPts = buyers.length > 0 ? 20 : 0;
      breakdown.push({ key: 'buyer', value: buyerPts, max: 20, label: 'Tese buyer' });

      // Engajamento (20) — soma proxies
      const totalActions = listings.length + valuations.length + buyers.length + capital.length;
      const engPts = Math.min(20, totalActions * 4);
      breakdown.push({ key: 'engagement', value: engPts, max: 20, label: 'Engajamento' });

      const score = breakdown.reduce((s, b) => s + b.value, 0);

      // ---------- Última sync ----------
      const allDates = [
        ...listings.map((l: any) => l.created_at),
        ...valuations.map((v: any) => v.created_at),
        ...buyers.map((b: any) => b.created_at),
        ...capital.map((c: any) => c.created_at),
      ].filter(Boolean);
      const lastSyncIso = allDates.sort().pop();
      const lastSyncMinutes = minutesAgo(lastSyncIso);

      // ---------- Feed ----------
      const feed: FeedItem[] = [];
      valuations.forEach((v: any) =>
        feed.push({
          id: `v-${v.id}`,
          label: `Valuation calculado (${v.valuation_type || 'múltiplos'})`,
          detail: v.segment ?? undefined,
          date: new Date(v.created_at),
          icon: 'valuation',
        })
      );
      listings.forEach((l: any) =>
        feed.push({
          id: `l-${l.id}`,
          label: 'Anúncio cadastrado',
          detail: l.title,
          date: new Date(l.created_at),
          icon: 'listing',
        })
      );
      buyers.forEach((b: any) =>
        feed.push({
          id: `b-${b.id}`,
          label: 'Tese de comprador cadastrada',
          date: new Date(b.created_at),
          icon: 'buyer',
        })
      );
      capital.forEach((c: any) =>
        feed.push({
          id: `c-${c.id}`,
          label: 'Captação solicitada',
          date: new Date(c.created_at),
          icon: 'capital',
        })
      );
      if (user!.created_at) {
        feed.push({
          id: 'welcome',
          label: 'Bem-vindo à Mari',
          date: new Date(user!.created_at),
          icon: 'welcome',
        });
      }
      feed.sort((a, b) => b.date.getTime() - a.date.getTime());

      return {
        score: { score, label: scoreLabel(score), breakdown },
        lastSyncMinutes,
        feed: feed.slice(0, 6),
        hasListing: listings.length > 0,
        hasValuation: valuations.length > 0,
        listingsCount: listings.length,
        valuationsCount: valuations.length,
        buyersCount: buyers.length,
      };
    },
  });

  return { data: q.data ?? null, isLoading: q.isLoading };
}
