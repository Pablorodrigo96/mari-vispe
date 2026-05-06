import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AnalyticsRange = 7 | 30 | 90;

export function useAdminAnalytics(range: AnalyticsRange = 30) {
  const daily = useQuery({
    queryKey: ["admin-analytics", "daily"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("v_analytics_daily" as any).select("*");
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const topPages = useQuery({
    queryKey: ["admin-analytics", "top-pages"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("v_analytics_top_pages" as any).select("*").limit(20);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const sources = useQuery({
    queryKey: ["admin-analytics", "sources"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("v_analytics_traffic_sources" as any).select("*").limit(15);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const growth = useQuery({
    queryKey: ["admin-analytics", "growth"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("v_analytics_user_growth" as any).select("*");
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const longSessions = useQuery({
    queryKey: ["admin-analytics", "long-sessions"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("analytics_events")
        .select("session_key,user_id,path,duration_ms,created_at")
        .eq("event_type", "page_leave")
        .order("duration_ms", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  const leadsSeries = useQuery({
    queryKey: ["admin-analytics", "leads-series", range],
    staleTime: 60_000,
    queryFn: async () => {
      const since = new Date(Date.now() - range * 86400 * 1000).toISOString();
      const { data, error } = await supabase
        .from("analytics_events")
        .select("created_at")
        .eq("event_type", "lead")
        .gte("created_at", since)
        .limit(10000);
      if (error) throw error;
      const buckets = new Map<string, number>();
      for (const r of data ?? []) {
        const day = String(r.created_at).slice(0, 10);
        buckets.set(day, (buckets.get(day) ?? 0) + 1);
      }
      // Fill empty days
      const out: { day: string; leads: number }[] = [];
      for (let i = range - 1; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400 * 1000).toISOString().slice(0, 10);
        out.push({ day: d, leads: buckets.get(d) ?? 0 });
      }
      return out;
    },
  });

  const funnel = useQuery({
    queryKey: ["admin-analytics", "funnel"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("v_analytics_funnel" as any).select("*").maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  const devices = useQuery({
    queryKey: ["admin-analytics", "devices"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("v_analytics_devices" as any).select("*");
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const browsers = useQuery({
    queryKey: ["admin-analytics", "browsers"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("v_analytics_browsers" as any).select("*");
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const heatmap = useQuery({
    queryKey: ["admin-analytics", "heatmap"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("v_analytics_hourly_heatmap" as any).select("*");
      if (error) throw error;
      return (data ?? []) as unknown as { dow: number; hour: number; events: number }[];
    },
  });

  const exitPages = useQuery({
    queryKey: ["admin-analytics", "exit-pages"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("v_analytics_exit_pages" as any).select("*").limit(15);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const cta = useQuery({
    queryKey: ["admin-analytics", "cta"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("v_analytics_cta" as any).select("*");
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const retention = useQuery({
    queryKey: ["admin-analytics", "retention"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("v_analytics_retention" as any).select("*").maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  return { daily, topPages, sources, growth, longSessions, leadsSeries,
    funnel, devices, browsers, heatmap, exitPages, cta, retention };
}
