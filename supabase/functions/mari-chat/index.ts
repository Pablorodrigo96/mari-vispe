import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return new Response(JSON.stringify({ error: "no auth" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { entity_type, entity_id, message } = await req.json();
    if (!message) return new Response(JSON.stringify({ error: "message obrigatório" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "unauth" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Build context
    let context = "";
    if (entity_type === "mandate" && entity_id) {
      const { data: m } = await supabase.schema("equity_brain").from("mandates").select("*").eq("id", entity_id).maybeSingle();
      const { data: acts } = await supabase.schema("equity_brain").from("crm_activities").select("kind,body,created_at").eq("entity_type", "mandate").eq("entity_id", entity_id).order("created_at", { ascending: false }).limit(20);
      context = `MANDATO: ${JSON.stringify(m)}\nÚLTIMAS ATIVIDADES:\n${(acts ?? []).map(a => `- ${a.kind}: ${a.body ?? ""}`).join("\n")}`;
    } else if (entity_type === "buyer" && entity_id) {
      const { data: c } = await supabase.schema("equity_brain").from("contacts").select("*").eq("id", entity_id).maybeSingle();
      const { data: acts } = await supabase.schema("equity_brain").from("crm_activities").select("kind,body,created_at").eq("entity_type", "buyer").eq("entity_id", entity_id).order("created_at", { ascending: false }).limit(20);
      context = `BUYER: ${JSON.stringify(c)}\nÚLTIMAS ATIVIDADES:\n${(acts ?? []).map(a => `- ${a.kind}: ${a.body ?? ""}`).join("\n")}`;
    }

    // Recent chat history for this entity
    const { data: history } = await supabase.schema("equity_brain")
      .from("mari_chat_messages")
      .select("role,content")
      .eq("user_id", user.id)
      .eq("entity_type", entity_type ?? "hub")
      .eq("entity_id", entity_id ?? "00000000-0000-0000-0000-000000000000")
      .order("created_at", { ascending: false })
      .limit(10);

    const messages = [
      { role: "system", content: `Você é a Mari, copiloto de M&A do advisor. Responda em PT-BR de forma direta, prática e curta. Sempre que possível, sugira a próxima ação concreta. Contexto:\n${context}` },
      ...((history ?? []).reverse().map(h => ({ role: h.role, content: h.content }))),
      { role: "user", content: message },
    ];

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "google/gemini-2.5-flash", messages }),
    });
    if (!aiRes.ok) {
      return new Response(JSON.stringify({ error: aiRes.status === 429 ? "Rate limit" : aiRes.status === 402 ? "Sem créditos" : "Erro AI" }), { status: aiRes.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const data = await aiRes.json();
    const reply = data.choices?.[0]?.message?.content ?? "";

    try {
      const { logApiUsage } = await import("../_shared/apiTrack.ts");
      await logApiUsage({
        provider: "lovable_ai", category: "llm", model: "google/gemini-2.5-flash",
        function_name: "mari-chat", feature: "chat",
        user_id: user.id,
        input_tokens: data.usage?.prompt_tokens, output_tokens: data.usage?.completion_tokens,
        total_tokens: data.usage?.total_tokens, status: "success", http_status: 200,
        metadata: { entity_type, entity_id },
      });
    } catch (e) { console.error("apiTrack:", e); }

    // Persist both messages
    await supabase.schema("equity_brain").from("mari_chat_messages").insert([
      { user_id: user.id, entity_type: entity_type ?? "hub", entity_id: entity_id ?? null, role: "user", content: message },
      { user_id: user.id, entity_type: entity_type ?? "hub", entity_id: entity_id ?? null, role: "assistant", content: reply },
    ]);

    return new Response(JSON.stringify({ reply }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
