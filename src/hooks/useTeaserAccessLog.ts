import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

type TeaserAction =
  | "teaser_view"
  | "teaser_share_copy"
  | "teaser_share_whatsapp"
  | "identity_reveal";

/**
 * Logs LGPD-relevant access events tied to a marketplace listing
 * triggered from inside the Equity Brain CRM (admin/advisor surfaces).
 *
 * Writes to equity_brain.access_logs (admin auditável).
 * For real teaser opens, also inserts into public.teaser_views
 * to keep the seller-facing analytics in sync.
 */
export function useTeaserAccessLog() {
  const log = useCallback(
    async (
      action: TeaserAction,
      params: {
        entityType?: "mandate" | "buyer" | "company" | "listing";
        entityId?: string;
        listingId?: string;
        ticker?: string;
      },
    ) => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        await (supabase as any)
          .schema("equity_brain")
          .from("access_logs")
          .insert({
            user_id: user.id,
            entity_type: params.entityType ?? "listing",
            entity_id: params.entityId ?? params.listingId ?? null,
            action,
          });

        if (action === "teaser_view" && params.listingId) {
          await supabase.from("teaser_views").insert({
            listing_id: params.listingId,
            viewer_id: user.id,
          });
        }
      } catch (e) {
        console.warn("[useTeaserAccessLog]", e);
      }
    },
    [],
  );

  return { log };
}
