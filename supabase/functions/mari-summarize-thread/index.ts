import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { trackedAIFetch } from "../_shared/apiTrack.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return new Response(JSON.stringify({ error: "no auth" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { entity_type, entity_id, extra_text } = await req.json();
    if (!entity_type || !entity_id) {
      return new Response(JSON.stringify({ error: "entity_type+entity_id obrigatórios" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "unauth" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: acts } = await supabase.schema("equity_brain")
      .from("crm_activities")
      .select("kind,direction,body,metadata,created_at")
      .eq("entity_type", entity_type)
      .eq("entity_id", entity_id)
      .in("kind", ["whatsapp_sent", "note", "call", "email"])
      .order("created_at", { ascending: true })
      .limit(60);

    const transcript = (acts ?? []).map((a) =>
      `[${new Date(a.created_at).toISOString().slice(0, 10)} ${a.direction ?? ""} ${a.kind}] ${a.body ?? ""}`
    ).join("\n");

    const fullInput = `${transcript}\n\n${extra_text ?? ""}`.trim();
    if (!fullInput) {
      return new Response(JSON.stringify({ summary: "Sem histórico para resumir." }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
    const aiRes = await trackedAIFetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "Você é a Mari, copiloto de M&A. Resuma a conversa em 3 bullets curtos, identifique sentimento (positivo/neutro/negativo), liste pendências e proponha 1 a 3 próximos passos. Resposta em PT-BR via tool call." },
          { role: "user", content: fullInput.slice(0, 12000) },
        ],
        tools: [{
          type: "function",
          function: {
            name: "summarize",
            parameters: {
              type: "object",
              properties: {
                bullets: { type: "array", items: { type: "string" } },
                sentiment: { type: "string", enum: ["positivo", "neutro", "negativo"] },
                pending: { type: "array", items: { type: "string" } },
                next_steps: { type: "array", items: { type: "string" } },
              },
              required: ["bullets", "sentiment", "pending", "next_steps"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "summarize" } },
      }),
    }, { function_name: "mari-summarize-thread" });
    if (!aiRes.ok) {
      return new Response(JSON.stringify({ error: aiRes.status === 429 ? "Rate limit" : aiRes.status === 402 ? "Sem créditos" : "Erro AI" }), { status: aiRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const data = await aiRes.json();
    const args = data.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    const parsed = args ? JSON.parse(args) : null;

    if (parsed) {
      // Persist summary as activity
      await supabase.schema("equity_brain").from("crm_activities").insert({
        entity_type, entity_id, kind: "ai_summary",
        body: parsed.bullets.join("\n• "),
        metadata: parsed,
        created_by: user.id,
      });
    }

    return new Response(JSON.stringify(parsed ?? {}), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
