import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import type { EntityNote } from "./useEntityNotes";

/** date is "YYYY-MM-DD" (local) */
export function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const DAILY_KEY = (userId: string, date: string) => ["daily-note", userId, date];

export function useDailyNote(date: string) {
  const { user } = useAuth();
  return useQuery({
    enabled: !!user,
    queryKey: DAILY_KEY(user?.id ?? "", date),
    queryFn: async (): Promise<EntityNote | null> => {
      const { data, error } = await supabase
        .from("eb_entity_notes" as any)
        .select("*")
        .eq("entity_type", "daily")
        .eq("entity_id", date)
        .eq("author_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as EntityNote) ?? null;
    },
  });
}

export function useUpsertDailyNote(date: string) {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { body_md: string; title?: string | null; tags?: string[] }) => {
      if (!user) throw new Error("not_authenticated");
      const { data: existing } = await supabase
        .from("eb_entity_notes" as any)
        .select("id")
        .eq("entity_type", "daily")
        .eq("entity_id", date)
        .eq("author_id", user.id)
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from("eb_entity_notes" as any)
          .update({
            body_md: input.body_md,
            title: input.title ?? null,
            tags: input.tags ?? [],
          })
          .eq("id", (existing as any).id)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
      const { data, error } = await supabase
        .from("eb_entity_notes" as any)
        .insert({
          entity_type: "daily",
          entity_id: date,
          author_id: user.id,
          title: input.title ?? null,
          body_md: input.body_md,
          visibility: "internal",
          pinned: false,
          tags: input.tags ?? [],
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      if (user) qc.invalidateQueries({ queryKey: DAILY_KEY(user.id, date) });
    },
    onError: (e: any) => toast({ title: "Erro ao salvar diário", description: e?.message, variant: "destructive" }),
  });
}

/** Last 30 daily notes from this author — used for streak. */
export function useDailyStreak() {
  const { user } = useAuth();
  return useQuery({
    enabled: !!user,
    queryKey: ["daily-streak", user?.id ?? ""],
    staleTime: 5 * 60 * 1000,
    queryFn: async (): Promise<number> => {
      const since = new Date();
      since.setDate(since.getDate() - 30);
      const { data, error } = await supabase
        .from("eb_entity_notes" as any)
        .select("entity_id, body_md")
        .eq("entity_type", "daily")
        .eq("author_id", user!.id)
        .gte("entity_id", dateKey(since))
        .order("entity_id", { ascending: false });
      if (error) throw error;
      const days = new Set<string>(
        ((data as any[]) ?? [])
          .filter((r) => typeof r.body_md === "string" && r.body_md.trim().length > 0)
          .map((r) => r.entity_id as string),
      );
      let streak = 0;
      const cursor = new Date();
      for (let i = 0; i < 31; i++) {
        const k = dateKey(cursor);
        if (days.has(k)) {
          streak += 1;
          cursor.setDate(cursor.getDate() - 1);
        } else {
          // allow skipping today if today has no entry yet (only break on first past gap)
          if (i === 0) {
            cursor.setDate(cursor.getDate() - 1);
            continue;
          }
          break;
        }
      }
      return streak;
    },
  });
}

export function useDailyFeed(date: string) {
  const { user } = useAuth();
  return useQuery({
    enabled: !!user,
    queryKey: ["daily-feed", user?.id ?? "", date],
    queryFn: async () => {
      const start = `${date}T00:00:00Z`;
      const next = new Date(`${date}T00:00:00Z`);
      next.setUTCDate(next.getUTCDate() + 1);
      const end = next.toISOString();

      const [actsRes, notesRes, dealsRes, aiRes] = await Promise.all([
        (supabase as any)
          .schema("equity_brain")
          .from("crm_activities")
          .select("id, kind, entity_type, entity_id, body, created_at")
          .eq("created_by", user!.id)
          .gte("created_at", start)
          .lt("created_at", end)
          .order("created_at", { ascending: false })
          .limit(30),
        supabase
          .from("eb_entity_notes" as any)
          .select("id, entity_type, entity_id, title, body_md, created_at, source")
          .eq("author_id", user!.id)
          .neq("entity_type", "daily")
          .gte("created_at", start)
          .lt("created_at", end)
          .order("created_at", { ascending: false })
          .limit(20),
        (supabase as any)
          .schema("equity_brain")
          .from("deals")
          .select("id, cnpj, mandate_id, buyer_id, stage, outcome, last_moved_at, updated_at")
          .eq("owner_user_id", user!.id)
          .gte("updated_at", start)
          .lt("updated_at", end)
          .order("updated_at", { ascending: false })
          .limit(20),
        supabase.rpc("eb_ai_runs_by_date" as any, { p_date: date }),
      ]);

      return {
        activities: (actsRes.data as any[]) ?? [],
        notes: (notesRes.data as any[]) ?? [],
        deals: (dealsRes.data as any[]) ?? [],
        ai: (aiRes.data as any[]) ?? [],
      };
    },
  });
}
