// Bloco 7 — embed-query
// Generates a 768-dim embedding for a free-text search query (used by hybrid note search).
// Auth: authenticated user (any role).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { trackedAIFetch } from "../_shared/apiTrack.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EMBEDDING_DIMS = 768;

// In-memory LRU cache (50 entries, 10min TTL)
const CACHE_MAX = 50;
const CACHE_TTL_MS = 10 * 60 * 1000;
type CacheEntry = { vec: number[]; ts: number };
const cache = new Map<string, CacheEntry>();

function cacheGet(key: string): number[] | null {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.ts > CACHE_TTL_MS) { cache.delete(key); return null; }
  // Refresh LRU position
  cache.delete(key); cache.set(key, hit);
  return hit.vec;
}
function cacheSet(key: string, vec: number[]) {
  if (cache.size >= CACHE_MAX) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(key, { vec, ts: Date.now() });
}

async function checkAuth(req: Request, supabaseUrl: string) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;
  const sb = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.replace("Bearer ", "");
  const { data } = await sb.auth.getClaims(token);
  return !!(data?.claims?.sub || data?.claims?.role === "service_role");
}

async function generateEmbedding(text: string): Promise<number[] | null> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) { console.error("[embed-query] LOVABLE_API_KEY missing"); return null; }
  try {
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "google/text-embedding-004", input: text.slice(0, 2000) }),
    });
    if (!resp.ok) {
      const t = await resp.text();
      console.error(`[embed-query] gateway ${resp.status}: ${t.slice(0, 300)}`);
      return null;
    }
    const json = await resp.json();
    const vec = json?.data?.[0]?.embedding;
    if (!Array.isArray(vec) || vec.length !== EMBEDDING_DIMS) return null;
    return vec as number[];
  } catch (e) {
    console.error("[embed-query] crash:", e);
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
  const okAuth = await checkAuth(req, supabaseUrl);
  if (!okAuth) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const query: string = (body?.query ?? "").toString().trim();
    if (!query || query.length < 2) {
      return new Response(JSON.stringify({ error: "query required (min 2 chars)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const key = query.toLowerCase().slice(0, 500);
    const cached = cacheGet(key);
    if (cached) {
      return new Response(JSON.stringify({ ok: true, embedding: cached, cached: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const vec = await generateEmbedding(query);
    if (!vec) {
      return new Response(JSON.stringify({ error: "embedding_failed" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    cacheSet(key, vec);

    return new Response(JSON.stringify({ ok: true, embedding: vec, cached: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("embed-query error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
