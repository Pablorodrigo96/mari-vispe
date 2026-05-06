import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useAdminAnalytics() {
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

  return { daily, topPages, sources, growth, longSessions };
}
