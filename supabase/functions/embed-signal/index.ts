// Equity Brain — embed-signal (Fase 7)
// Gera embedding (768 dims) para um signal_text usando Lovable AI Gateway (google/text-embedding-004)
// Auth: admin OR service_role.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EMBEDDING_DIMS = 768;

async function checkAuth(req: Request, supabaseUrl: string, serviceKey: string) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return { ok: false, status: 401, error: "Unauthorized" };
  const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const token = authHeader.replace("Bearer ", "");
  const { data: claimsData } = await supabaseUser.auth.getClaims(token);
  const isServiceRole = claimsData?.claims?.role === "service_role";
  const userId = claimsData?.claims?.sub ?? null;
  if (isServiceRole) return { ok: true };
  if (!userId) return { ok: false, status: 401, error: "Unauthorized" };
  const sb = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data: roleData } = await sb.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (!roleData) return { ok: false, status: 403, error: "Forbidden: admin only" };
  return { ok: true };
}

/**
 * Gera embedding via Lovable AI Gateway.
 * Usa endpoint /v1/embeddings com modelo google/text-embedding-004 (768 dims).
 */
async function generateEmbedding(text: string): Promise<number[] | null> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) {
    console.error("[embed-signal] LOVABLE_API_KEY missing");
    return null;
  }
  try {
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/text-embedding-004",
        input: text.slice(0, 4000),
      }),
    });
    if (!resp.ok) {
      const t = await resp.text();
      console.error(`[embed-signal] gateway ${resp.status}: ${t.slice(0, 300)}`);
      return null;
    }
    const json = await resp.json();
    const vec = json?.data?.[0]?.embedding;
    if (!Array.isArray(vec) || vec.length !== EMBEDDING_DIMS) {
      console.error(`[embed-signal] unexpected embedding shape: len=${vec?.length}`);
      return null;
    }
    return vec as number[];
  } catch (e) {
    console.error("[embed-signal] fetch crashed:", e);
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
    const signalId = body?.signal_id;
    if (!signalId || typeof signalId !== "string") {
      return new Response(JSON.stringify({ error: "signal_id required (uuid string)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    // Carrega signal
    const { data: sig, error: selErr } = await supabase
      .schema("equity_brain" as any)
      .from("company_signals")
      .select("id, signal_key, signal_text, embedding")
      .eq("id", signalId)
      .maybeSingle();

    if (selErr || !sig) {
      return new Response(JSON.stringify({ error: `signal not found: ${selErr?.message ?? "no row"}` }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!sig.signal_text || sig.signal_text.length < 8) {
      return new Response(JSON.stringify({ ok: true, skipped: "no_text" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (sig.embedding) {
      return new Response(JSON.stringify({ ok: true, skipped: "already_embedded" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Texto contextualizado: signal_key + texto livre
    const textToEmbed = `[${sig.signal_key}] ${sig.signal_text}`;
    const vec = await generateEmbedding(textToEmbed);

    if (!vec) {
      // Marca falha mas não trava — loop pode tentar de novo se desejado
      return new Response(JSON.stringify({ error: "embedding_failed", hint: "verifique LOVABLE_API_KEY ou créditos" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Persiste — pgvector aceita string '[1,2,3]'
    const vecStr = `[${vec.join(",")}]`;
    const { error: updErr } = await supabase
      .schema("equity_brain" as any)
      .from("company_signals")
      .update({ embedding: vecStr })
      .eq("id", signalId);

    if (updErr) {
      return new Response(JSON.stringify({ error: `update: ${updErr.message}` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, signal_id: signalId, dims: vec.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("embed-signal error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
