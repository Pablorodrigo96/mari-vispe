// Lovable AI Gateway — Dashboard Insight (cached 1h)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

const TTL_MS = 60 * 60 * 1000; // 1h

async function sha1(text: string): Promise<string> {
  const buf = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-1", buf);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function logHealth(admin: any, status: string, summary: string) {
  try {
    await admin.schema("mari_ops").from("health_check").insert({
      function_name: "generate-dashboard-insight",
      status,
      payload_summary: summary,
    });
  } catch (_) {/* never block */}
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const admin = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    const { dashboard_type, snapshot_data } = await req.json();
    if (!dashboard_type || !snapshot_data) {
      return new Response(JSON.stringify({ error: "missing dashboard_type or snapshot_data" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const snapshotStr = JSON.stringify(snapshot_data);
    const hash = await sha1(`${dashboard_type}|${snapshotStr}`);

    // 1) Cache lookup
    const { data: cached } = await admin
      .from("dashboard_insight_cache")
      .select("body, snapshot_hash, generated_at")
      .eq("dashboard_type", dashboard_type)
      .maybeSingle();

    if (cached && cached.snapshot_hash === hash) {
      const age = Date.now() - new Date(cached.generated_at).getTime();
      if (age < TTL_MS) {
        return new Response(JSON.stringify({ body: cached.body, cached: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // 2) Call Lovable AI
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY missing" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const prompt =
      `Você é analista M&A sênior. Analise o snapshot do dashboard "${dashboard_type}" abaixo ` +
      `e gere 1 insight acionável em até 80 palavras. Tom direto, profissional, em português. ` +
      `Foque em variações relevantes ou padrões de pipeline, sem repetir os números literalmente.\n\n` +
      `Snapshot: ${snapshotStr}`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Você é uma analista M&A sênior, objetiva e direta." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (aiResp.status === 429) {
      await logHealth(admin, "rate_limited", `${dashboard_type} 429`);
      return new Response(JSON.stringify({ error: "Rate limit. Tente novamente em alguns instantes." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (aiResp.status === 402) {
      await logHealth(admin, "credits_exhausted", `${dashboard_type} 402`);
      return new Response(JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos em Configurações > Workspace > Uso." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!aiResp.ok) {
      const t = await aiResp.text();
      await logHealth(admin, "error", `${dashboard_type} ${aiResp.status}: ${t.slice(0, 200)}`);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiJson = await aiResp.json();
    const body: string = aiJson?.choices?.[0]?.message?.content?.trim() ?? "";

    try {
      const { logApiUsage } = await import("../_shared/apiTrack.ts");
      await logApiUsage({
        provider: "lovable_ai", category: "llm", model: "google/gemini-2.5-flash",
        function_name: "generate-dashboard-insight", feature: "dashboard_insight",
        input_tokens: aiJson?.usage?.prompt_tokens, output_tokens: aiJson?.usage?.completion_tokens,
        total_tokens: aiJson?.usage?.total_tokens, status: "success", http_status: 200,
        metadata: { dashboard_type },
      });
    } catch (e) { console.error("apiTrack:", e); }
    if (!body) {
      await logHealth(admin, "empty", `${dashboard_type} empty body`);
      return new Response(JSON.stringify({ error: "AI returned empty body" }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3) Upsert cache
    await admin.from("dashboard_insight_cache").upsert({
      dashboard_type,
      snapshot_hash: hash,
      body,
      generated_at: new Date().toISOString(),
    });

    await logHealth(admin, "success", `${dashboard_type} regenerated`);

    return new Response(JSON.stringify({ body, cached: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-dashboard-insight error", e);
    await logHealth(admin, "exception", String(e).slice(0, 200));
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
