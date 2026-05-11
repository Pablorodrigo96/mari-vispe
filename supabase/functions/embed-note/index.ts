// Bloco 7 — embed-note
// Computes 768-dim embedding (Gemini text-embedding-004) for equity_brain.entity_notes.
// Re-embeds when embedding is null OR text hash drifted (title+body_md changed).
// Auth: admin OR service_role (cron).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { trackedAIFetch } from "../_shared/apiTrack.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EMBEDDING_DIMS = 768;

async function sha256Hex(text: string): Promise<string> {
  const buf = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function checkAuth(req: Request, supabaseUrl: string, serviceKey: string) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return { ok: false, status: 401, error: "Unauthorized" };
  const token = authHeader.replace("Bearer ", "");
  if (token === serviceKey) return { ok: true };
  // Allow anon JWT as cron-authorized (pg_cron schedule uses anon key)
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  if (token === anonKey) return { ok: true };
  const sbUser = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: claimsData } = await sbUser.auth.getClaims(token);
  if (claimsData?.claims?.role === "service_role") return { ok: true };
  const userId = claimsData?.claims?.sub ?? null;
  if (!userId) return { ok: false, status: 401, error: "Unauthorized" };
  const sb = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data } = await sb.from("user_roles").select("role").eq("user_id", userId).in("role", ["admin", "advisor"]).maybeSingle();
  if (!data) return { ok: false, status: 403, error: "Forbidden" };
  return { ok: true };
}

async function generateEmbedding(text: string): Promise<number[] | null> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) {
    console.error("[embed-note] LOVABLE_API_KEY missing");
    return null;
  }
  try {
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "google/text-embedding-004", input: text.slice(0, 8000) }),
    });
    if (!resp.ok) {
      const t = await resp.text();
      console.error(`[embed-note] gateway ${resp.status}: ${t.slice(0, 300)}`);
      return null;
    }
    const json = await resp.json();
    const vec = json?.data?.[0]?.embedding;
    if (!Array.isArray(vec) || vec.length !== EMBEDDING_DIMS) {
      console.error(`[embed-note] unexpected dims=${vec?.length}`);
      return null;
    }
    return vec as number[];
  } catch (e) {
    console.error("[embed-note] fetch crashed:", e);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const auth = await checkAuth(req, supabaseUrl, serviceKey);
  if (!auth.ok) {
    return new Response(JSON.stringify({ error: auth.error }), {
      status: auth.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const noteIds: string[] | undefined = body?.note_ids;
    const limit: number = Math.max(1, Math.min(Number(body?.limit ?? 20), 100));

    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    let query = supabase
      .schema("equity_brain" as any)
      .from("entity_notes")
      .select("id, title, body_md, embedding_text_hash, embedding");

    if (Array.isArray(noteIds) && noteIds.length > 0) {
      query = query.in("id", noteIds);
    } else {
      query = query.is("embedding", null).order("updated_at", { ascending: false }).limit(limit);
    }

    const { data: notes, error: selErr } = await query;
    if (selErr) {
      return new Response(JSON.stringify({ error: `select: ${selErr.message}` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let processed = 0;
    let skipped = 0;
    const errors: Array<{ id: string; error: string }> = [];

    for (const n of (notes ?? [])) {
      const text = `${n.title ?? ""}\n\n${n.body_md ?? ""}`.trim();
      if (text.length < 4) { skipped++; continue; }
      const hash = await sha256Hex(text);
      if (n.embedding && n.embedding_text_hash === hash) { skipped++; continue; }

      const vec = await generateEmbedding(text);
      if (!vec) { errors.push({ id: n.id, error: "embedding_failed" }); continue; }

      const vecStr = `[${vec.join(",")}]`;
      const { error: updErr } = await supabase
        .schema("equity_brain" as any)
        .from("entity_notes")
        .update({
          embedding: vecStr,
          embedding_computed_at: new Date().toISOString(),
          embedding_text_hash: hash,
        })
        .eq("id", n.id);

      if (updErr) { errors.push({ id: n.id, error: updErr.message }); continue; }
      processed++;
    }

    return new Response(JSON.stringify({ ok: true, processed, skipped, errors }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("embed-note error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
